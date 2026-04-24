---
name: kb-query
description: Answer repository questions from local files only.
---

# KB Query

先读这些文件：

- `AGENTS.md`
- `schemas/query.md`

这个 skill 用于 local-only 的知识库问答。

默认行为：

1. 先读 `wiki/index.md`
2. 优先从 `wiki/` 回答，再看 `raw/`
3. 列出实际查阅过的本地文件
4. 如果答案可复用，就写回 `wiki/`
