# 2026-08-04 工作日志：分页接口性能诊断与优化

## 今日概览

围绕一个分页列表接口响应偏慢的问题，完成诊断工具配置、调用链分析、SQL 结构检查和 N+1 查询修复。公开版本只保留通用排查方法，已移除真实环境耗时、内部模块关系、数据规模和具体业务字段。

## 完成事项

- 使用 Arthas `trace` 定位接口调用链中的主要耗时阶段。
- 识别一条“多值字符串拆行、去重、排序”的高成本查询结构。
- 修复列表填充明细时的 N+1 查询，改为批量查询后内存分组。
- 区分已验证结论与待验证推断，避免把“可能缺少索引”写成既定根因。
- 整理 SQL 优化的验证清单和回退原则。

## 问题与解决

### 主查询 SQL 随数据量增长而劣化

- **现象**：分页接口的主查询耗时随数据量增加而上升。
- **分析**：查询先把逗号分隔的多值字段拆成多行，再执行去重和排序，导致中间结果被放大。关联字段是否缺少索引尚未实测，不能直接作为结论。
- **处理**：尝试减少展开前的输入数据，并设计可独立验证拆行、关联、去重和排序成本的对比 SQL；未产生收益的改写及时回退。
- **验证**：结构性风险已确认；索引状态、放大倍数和数据库侧实际成本仍需通过元数据和执行计划验证。

### 列表查询存在 N+1

- **现象**：主记录查询完成后，循环内为每条记录单独查询明细。
- **分析**：记录数增加时，数据库往返次数线性增加，容易放大网络和连接开销。
- **处理**：先收集主键，一次批量查询全部明细，再按外键分组回填；空集合提前返回，避免生成非法 `IN` 条件。
- **验证**：代码路径已改为固定次数查询，仍需通过 SQL 日志确认实际执行条数和结果一致性。

### 命令行诊断工具在不同终端表现不一致

- **现象**：诊断工具在部分终端可用，在另一些终端无法找到命令。
- **分析**：不同终端读取的 PATH 配置来源不同，且已打开的终端不会自动获取后续环境变量变更。
- **处理**：将启动器放入稳定的用户工具目录，并通过系统环境变量统一 PATH。
- **验证**：新终端可以定位并启动工具。

## 技术记录

### N+1 改批量查询

```java
List<Long> ids = records.stream()
    .map(Record::getId)
    .toList();

List<Detail> details = ids.isEmpty()
    ? Collections.emptyList()
    : detailMapper.selectByParentIds(ids);

Map<Long, List<Detail>> grouped = details.stream()
    .collect(Collectors.groupingBy(Detail::getParentId));

records.forEach(record ->
    record.setDetails(grouped.getOrDefault(record.getId(), Collections.emptyList()))
);
```

### SQL 拆行模式的风险

```sql
SELECT DISTINCT <columns>
FROM (
    SELECT <columns>, <split-expression> AS split_value
    FROM <main_table>
    JOIN <detail_table> ON <join-condition>
    JOIN <sequence_table> ON <split-count-condition>
) expanded
ORDER BY <sort_column>
LIMIT :offset, :size;
```

这类查询常见风险：

- 非规范化多值字段无法直接利用普通索引。
- 拆行会放大中间结果。
- `DISTINCT` 和排序可能产生临时表。
- 分页通常在展开和排序之后生效。

诊断时可使用：

```bash
trace <ServiceClass> <method> -n 3
trace <MapperClass> <method> -n 3
logger --name <mapper-package> --level DEBUG
```

## 待沉淀知识

- B+ 树索引与 Nested Loop Join 的关系。
- 数据库第一范式与多值字段建模。
- ORM 中 N+1 查询的常见形态。
- 分页 count 查询的优化边界。

## 后续计划

- 使用 `SHOW INDEX` 和 `EXPLAIN ANALYZE` 验证索引与执行计划。
- 在脱敏数据集上对比改造前后的查询条数和结果。
- 评估将多值字段拆分为关联表或结构化字段。

## 今日总结

本次工作完成了从调用链定位到 SQL 结构分析，再到 N+1 修复的完整过程。最重要的经验是将推断和证据分开：只有经过索引检查、执行计划和结果对比验证的内容，才能写成最终结论。
