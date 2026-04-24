# AGENTS Guide

这是一个最小化的本地知识库仓库。

先读这个文件，再按任务类型使用对应的 schema：

- `schemas/ingest.md`
- `schemas/query.md`
- `schemas/lint.md`

## 默认行为

- 先读 `wiki/index.md`
- 优先从 `wiki/` 回答，再看 `raw/`
- 当 `wiki/` 不够时，再读取 `raw/`
- 新文件先进入 `inbox/`
- 有复用价值的结果写回 `wiki/`
- 对知识库相关问题，除非用户明确要求，否则不要浏览网页

## 仓库分层

- `inbox/`：等待处理的新文件
- `raw/`：原始资料
- `wiki/`：维护后的页面

## 核心规则

- 把 `raw/` 当作原始资料层，除非明确要求，否则不要改写其内容
- 优先更新已有 wiki 页面，而不是制造重复页面
- 让 wiki 保持简洁、可链接、易浏览
- 如果一个问答结果以后还会有用，就把它写回 `wiki/`
- 对于有意义的 ingest、query 写回和 lint，给 `wiki/log.md` 追加一条简短记录

## 操作快捷方式

- `skills/kb-ops/`：用于 ingest、清理和 wiki 维护
- `skills/kb-query/`：用于 local-only 知识库问答
