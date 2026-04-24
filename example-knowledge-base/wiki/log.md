# 日志
# Wiki Log

把有意义的工作简短记录在这里。

建议使用这些标签：

- `ingest`
- `query`
- `update`
- `lint`
把这个文件当成追加式活动日志来用。

建议格式：

- `## [YYYY-MM-DD] 摄取 | 标题`
- `## [YYYY-MM-DD] 查询 | 标题`
- `## [YYYY-MM-DD] 更新 | 标题`
- `## [YYYY-MM-DD] 整理 | 标题`

## [2026-04-08] 更新 | 重写为公共研究知识库 MVP

重构了仓库结构与说明体系，删除旧的 `self` 与 `bridges` 模型，改为面向课题组公共使用的 MVP：`raw/` 保存论文、项目、会议和实验材料，`wiki/knowledge/` 保存共识与结构，`wiki/insights/` 保存研究判断，并将高价值 query 写回正式纳入主流程。

## [2026-04-08] 更新 | 增加知识页与研究判断模板

补充了 `wiki/knowledge/` 的领域总览模板和 `wiki/insights/` 的研究判断模板，用来固定页面粒度、区分共识与判断，并为后续 ingest 与 query 写回提供稳定落点。

## [2026-04-08] 更新 | 增加方法比较与关键张力模板

补充了 `wiki/knowledge/` 的方法比较模板和 `wiki/insights/` 的关键张力模板，用来承接高频比较问题与高价值 tension 页面，并进一步稳定知识层与洞察层的边界。

## [2026-04-08] 更新 | 单层 inbox、bootstrap schema 与 watcher

移除了 `inbox` 下的子文件夹，改为直接把待处理材料放进 `inbox/`；新增 `schemas/bootstrap.md` 用于从 `inbox/` 全量构建第一版完整知识库；同时提供 `scripts/inbox_watcher.sh` 作为仓库内 watcher，并把首次进入仓库时接入本地 hook 的要求写入 `AGENTS.md` 与 `CLAUDE.md`。
