# 2026-08-04 工作日志：分页接口性能诊断与优化

## 今日概览

围绕一个管理后台分页列表接口响应偏慢的问题，完成了诊断工具的安装配置、瓶颈定位、SQL 优化尝试、N+1 查询修复和文档输出。最终定位到核心瓶颈在一条含"逗号串拆行"的统计 SQL 上，受限于无数据库变更权限，SQL 层面优化空间有限；同时修复了列表方法的 N+1 查询并提交。关键教训：在未实测验证索引是否存在前，不应把"缺索引"当作既定根因写入结论。

## 完成事项

- 完成 Arthas（Java 诊断工具）的全局安装与启动器配置，cmd / PowerShell / Git Bash 任意目录可直接调用。
- 用 Arthas trace 定位分页接口调用链耗时分布，确认主查询 SQL 为主要瓶颈。
- 输出两份文档：性能瓶颈分析报告、数据库索引优化工单。
- 修复列表查询方法的 N+1 问题，改为批量 IN 查询，已按规范提交。
- 对 SQL 优化路径做了系统梳理，排除了多条不可行路径并记录原因。

## 问题与解决

### 分页接口响应慢，主查询 SQL 耗时偏高

- **现象**：分页接口的主查询 SQL 单次耗时约 80~120ms（据反馈生产环境可能达 800~900ms），随数据量增长持续劣化。
- **分析**：用 `trace` 拆解调用链，发现该 SQL 结构为"子查询展开 + DISTINCT 去重 + 排序"。展开方式是对一个逗号分隔的日期串字段用数字辅助表 JOIN 拆成多行（`SUBSTRING_INDEX` 函数），导致中间结果按"外勤数 × 明细数 × 日期数"乘积膨胀。三大根因均位于数据库层面：逗号串违反第一范式、明细表关联字段疑似无索引、膨胀后 DISTINCT 临时表排序。其中"明细表关联字段无索引"此前一直作为结论使用，但实为推断，**未经 `SHOW INDEX` 实测验证，待确认**。
- **处理**：
  1. 尝试 EXISTS 相关子查询改写以去掉展开与 DISTINCT，实测耗时未改善，回退。事后反思该实验不能唯一归因于"无索引"（EXISTS 版本仍保留了拆串逻辑）。
  2. 保留"过滤条件下推到内层子查询"的改动（先过滤再展开，缩小展开输入），风险低。
  3. 排除了"用主表日期字段替代明细表日期串"的方案：V2 版本数据主表日期字段为 null（请求对象该字段已注释，MapStruct 不映射），替代会漏数据。
  4. 实现自定义分页 count 后又撤销：收益有限且引入两次独立查询的复杂度。
- **验证**：条件下推改动的正确性待验证（需重启后对比返回结果一致性）；索引是否存在、纯 SQL 实际耗时、拆串放大倍数均待验证（已给出确诊 SQL 清单，未执行）。

### 列表查询方法存在 N+1 查询

- **现象**：列表方法在循环内逐条按外勤单 id 查询明细，N 条记录触发 N+1 次 SQL。
- **分析**：对比同模块分页方法已用批量 IN 改造，列表方法遗漏。
- **处理**：改为先收集所有 id，一次 `IN` 批量查明细，内存按 id 分组后回填；对空结果提前返回，避免 `IN` 传空集合。
  ```java
  List<Long> ids = result.stream().map(...).collect(Collectors.toList());
  List<Detail> all = mapper.selectList(Wrappers.<Detail>lambdaQuery().in(Detail::getOutworkId, ids));
  Map<Long, List<Detail>> map = all.stream().collect(Collectors.groupingBy(Detail::getOutworkId));
  result.forEach(o -> o.setDetails(map.getOrDefault(o.getId(), new ArrayList<>())));
  ```
- **验证**：已提交。SQL 条数验证待执行（开 mapper DEBUG 日志，改前 1+N 条、改后 2 条）。

### Arthas 全局命令在 cmd 中不可用

- **现象**：Git Bash 中可调用 arthas，但 cmd 提示"不是内部或外部命令"。
- **分析**：启动器脚本放在用户 bin 目录，该目录在 bash 的 PATH 中（bash profile 自动加入），但未加入 Windows 用户环境变量 PATH。
- **处理**：将用户 bin 目录追加到 Windows 用户级 PATH（PowerShell `[Environment]::SetEnvironmentVariable`，避免 setx 截断）。
- **验证**：新开 cmd 窗口 `where arthas` 能定位到启动器。旧窗口需重开才生效。

## 技术记录

- Arthas 安装：下载 `arthas-boot.jar` 到固定目录，编写 `arthas.cmd`（Windows）与 `arthas`（bash）启动器指向固定 JDK，放入已在 PATH 的用户 bin 目录。首次运行自动拉取完整组件。
- 定位 Java 进程：`jps -l` 列出主类，比 `tasklist` 更能区分业务进程与 IDE 进程。
- 诊断接口耗时的核心命令：
  ```bash
  trace <Service全类名> <方法名> -n 3            # 看调用链每步耗时
  trace <Mapper全类名> <方法名> -n 3             # 单看某条SQL的MyBatis执行耗时
  logger --name <mapper包> --level DEBUG         # 热开SQL日志，看实际执行的SQL
  ```
- SQL 慢点定位的"差值法"：设计含/不含某一步的对比 SQL，用耗时差值隔离该步骤成本；`EXPLAIN ANALYZE`（MySQL 8.0.18+）可直接看每个算子真实耗时。
- 本次 SQL 的等价改写要点：外层 DISTINCT 可去掉的前提是主表不再被 JOIN 拆行放大；时间过滤若改 EXISTS，子查询内仍含拆串则不能归因耗时变化于索引。

## 待沉淀知识

- MySQL B+ 树索引原理与 Nested Loop Join 执行机制，为何索引必须建在"被反复查找的连接字段"上。
- 数据库第一范式：逗号分隔多值字段的危害（索引/排序/范围比较全部失效），以及拆分为明细表后的收益模型（写入拆一次 vs 每次查询拆）。
- MyBatis-Plus 分页插件 count 机制（默认 count 包 `SELECT COUNT(*) FROM (原SQL)`），自定义 count 与 `setSearchCount`/`setTotal` 的实例级影响范围。
- Arthas 常用命令体系（dashboard / thread / jad / watch / trace / logger / profiler）与各命令适用场景。

## 后续计划

- 执行确诊 SQL 清单，确认三项事实：明细表关联字段是否真无索引、各表数据量、纯 SQL 在数据库侧的实际耗时与拆串放大倍数。
- 根据实测结果修订性能分析报告与工单的根因归因（若索引已存在，则根因转向拆串 + DISTINCT，拆表优先级上升）。
- 提交数据库索引优化工单（在线加索引，不锁表），或评估拆日期明细表方案。
- 重启应用验证条件下推改动与 N+1 修复的结果正确性。

## 今日总结

主要进展是完成了从"接口慢"到"定位到具体 SQL 及其结构性根因"的完整诊断链路，并修复了一个明确的 N+1 问题。有效方法是 Arthas trace 逐层拆解耗时、用差值法隔离 SQL 内部步骤成本。需要改进的是：在把"缺索引"写进报告和工单前应先实测验证，避免把推断当结论；EXISTS 实验的设计不够严谨（未控制拆串变量），导致归因不可靠。当前 SQL 优化受限于无数据库变更权限已到天花板，下一步必须靠实测数据决定走"加索引"还是"拆表"。
