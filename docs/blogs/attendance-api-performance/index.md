# 2026-08-03 工作日志：排班考勤系统接口性能排查与优化实践

## 今日概览

对某排班考勤系统的两个慢查询接口进行性能排查。通过 arthas trace 定位真实瓶颈，尝试了多种优化方案，最终在一个接口落地了一个零风险优化（O(N²) 聚合改预聚合 Map，dev 环境省约 140ms），另一个接口识别出可优化点但收益有限。核心发现：两个接口的性能瓶颈都在远程调用（占总耗时 60-75%），受权限约束无法修改，代码层面优化空间有限。

## 完成事项

- 用 arthas trace 定位了两个慢接口的真实耗时分布，避免了凭猜测优化
- 接口 A（工时统计查询）：落地零风险优化 O(N²)->预聚合 Map（dev 省 ~140ms）；排查并排除了 V3 SQL 去重（反向更慢已回退）、用班组数据替代全员远程调用（一人多班组口径对不上）、分页下推（组织汇总需全员求和）等方案
- 接口 B（排班表查询）：识别出 SQL 聚合替代 3.5 年内存循环的零风险优化点（~55ms），判断整体收益有限
- 完成了 archify 画图技能安装并生成 4 张系统架构图（架构图/数据流图/流程图/时序图）
- 全程排查过程记录至项目文档

## 问题与解决

### 工时统计查询接口慢（约 5-12s）

- **现象**：工时统计-个人工时明细查询接口响应约 5s（测试环境），生产环境约 12s
- **分析**：arthas trace 显示远程调用占 56%（拉用户列表 + 拉全员，各约 1.3-1.5s），forEach 内工时计算占 17.5%（~500ms），全月排班 SQL 占 12%（~556ms），O(N²) 聚合占约 3%（~140ms）。根因是"先全量计算 764 人、最后内存分页 15 人"的设计，由业务需求（每行显示组织汇总 + 按工时过滤 userFilter）决定，不是代码偷懒
- **处理**：
  1. O(N²) 聚合改预聚合 HashMap（6 类求和 + 2 类 count 从 O(N²) 降到 O(N)）——落地保留
  2. 新建 V3 mapper 用子查询去 DISTINCT——实测反向更慢（556ms->1158ms），已回退
  3. 尝试用班组数据替代全员远程调用——一人多班组记录导致 orgId 归属对不上，放弃
  4. 评估分页下推——组织汇总需全员求和 + userFilter 依赖全员工时，不可行
- **验证**：trace 实测优化后 self 时间从约 844ms 降到约 710ms（省约 140ms），数值完全一致。V3 SQL 实测翻倍变慢已回退。其余方案因口径风险未实施

### 排班表查询接口慢（约 3s）

- **现象**：排班表查询接口响应约 3s
- **分析**：trace 显示远程调用占 75%（约 1.8s），本地约 0.6s 分散在十几个小查询和一个 3.5 年排班内存循环。此接口已先分页取 15 人再计算，结构合理
- **处理**：识别出 3.5 年排班查询可用 SQL 聚合替代（零风险，省约 55ms），小查询可并行（省约 180ms，但引并发复杂度），EXISTS 子查询可优化（约 103ms，待查是否共用）
- **验证**：待验证。判断结论：远程 1.8s 动不了，本地约 300ms 优化收益有限（3s->约 2.7s），建议仅做 SQL 聚合

### archify 画图技能安装

- **现象**：需要为项目生成架构图/数据流图等可视化文档
- **分析**：archify 是支持多种图类型的 Agent Skill，通过 Node.js CLI 生成可交互 HTML，支持 showcase 校验
- **处理**：从 GitHub 下载 archify.zip（约 860KB），解压到用户级 skills 目录，通过 doctor 自检（14 项全过），生成 4 张图（架构图/数据流图/流程图/时序图），均通过 showcase 校验（9/9 项 0 错 0 警）
- **验证**：4 张 HTML 成品均可正常打开，校验通过

## 技术记录

arthas trace 定位方法耗时：

```bash
# trace 指定方法，只打印 >1s 的调用，抓 3 次
trace com.example.ServiceImpl methodName '#cost > 1000' -n 3

# trace 经过 Spring 代理时只显示一层（代理边界不展开），
# 需直接 trace impl 类而非 controller

# 火焰图（全局 CPU 采样，生产环境慎用）
profiler start --event cpu
# 触发请求
profiler stop --format flamegraph --file /tmp/stat.html
```

O(N²) 聚合优化模式（Java，零风险）：

```java
// 原来：每个用户循环内反复 stream.filter().sum()，O(N²)
vo.setOrgPlanHour(list.stream()
    .filter(o -> Objects.equals(o.getOrgId(), vo.getOrgId()))
    .mapToDouble(Vo::getPlanHour).sum());

// 优化后：循环前一次性预聚合 Map，循环内 O(1) 查表
Map<Long, Double> orgPlanHourSum = new HashMap<>();
for (Vo o : list) {
    orgPlanHourSum.merge(o.getOrgId(), o.getPlanHour(), Double::sum);
}
vo.setOrgHour(orgPlanHourSum.getOrDefault(vo.getOrgId(), 0D));
```

SQL 聚合替代内存循环（将 3.5 年逐条累加改为一条 GROUP BY）：

```sql
SELECT user_id,
  SUM(CASE WHEN is_rest NOT IN (3,5)
           THEN IFNULL(total_duration, IFNULL(act_duration,0)+IFNULL(overtime_duration,0))
           ELSE 0 END) AS totalActual,
  SUM(CASE WHEN is_rest = 0
           THEN IFNULL(plan_work_duration,0) ELSE 0 END) AS totalPlan
FROM work_info_user
WHERE user_id IN (...) AND work_date >= '2023-01-01' AND work_date < CURDATE()
GROUP BY user_id
```

性能排查关键经验：

- trace 测的是方法内部耗时，浏览器端到端可能多几秒（网络+序列化）
- 远程调用耗时受服务器负载波动大（同一接口不同时段差 0.5-1s），横向对比只看 SQL 和 self
- O(N²) 优化在生产环境的收益随用户数平方放大，dev 测 140ms 不代表生产也只 140ms
- SQL 改写（如去 DISTINCT）必须先实测或 EXPLAIN 验证，不能想当然

## 待沉淀知识

- arthas 性能诊断工具的系统用法（trace/watch/monitor/profiler 各场景选择与限制）
- "先全量计算再内存分页"反模式的分析框架：什么业务需求会导致它、如何判断能否安全打破
- 企业级系统性能优化的约束分析：远程调用/业务口径/数据库索引/组件限制下的决策树
- 浮点累加顺序与 HashMap.merge 的正确性对齐细节

## 后续计划

- 接口 A 的 ① 优化已在测试环境验证，待生产环境 trace 确认实际收益（因 O(N²) 随用户数平方增长，生产收益应大于 dev 的 140ms）
- 接口 B 的 SQL 聚合优化待实施（零风险，约 55ms）
- 若团队允许突破约束（如用已有 Redis 缓存远程调用结果），可进一步优化两个接口（预计各省 2-3s）

## 今日总结

通过 arthas 实测定位了两个慢接口的真实瓶颈，避免了"凭猜测优化"。核心发现：两个接口 60-75% 的耗时在远程调用上，受权限约束无法修改；代码层面的优化空间有限（一个接口省 140ms，另一个可省约 300ms）。有效方法是先 trace 定位、再评估每项优化的收益/风险/约束，该收手就收手。最大的教训：SQL 改写必须先验证执行计划（V3 去 DISTINCT 反向更慢），不能想当然。整体来看，这类成熟业务代码的"容易省的"早已被原开发者处理，剩下的慢要么是外部依赖，要么是业务设计决定，需要架构决策而非代码微调。
