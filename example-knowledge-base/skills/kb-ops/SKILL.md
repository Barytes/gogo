---
name: kb-ops
description: Ingest files, maintain the wiki, and run basic cleanup for this local knowledge base.
---

# KB Ops

先读这些文件：

- `AGENTS.md`
- `schemas/ingest.md`
- `schemas/lint.md`

这个 skill 适用于：

- 从 `inbox/` ingest 文件
- 把源文件归档到 `raw/`
- 更新 `wiki/`
- 修复小型结构问题
- 运行基础 lint/cleanup

默认行为：

1. 检查 `inbox/`、`raw/` 和 `wiki/index.md`
2. 把源文件保存在 `raw/`
3. 先更新已有 wiki 页面，再考虑创建新页面
4. 如果结构变化，更新 `wiki/index.md`
5. 在 `wiki/log.md` 中追加一条简短记录
