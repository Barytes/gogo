# Lint Schema

当需要清理知识库时，使用这个 schema。

## 检查项

- 重复的 wiki 页面
- 孤立的 wiki 页面
- 失效链接
- 过时的 index 条目
- 明显的格式或命名不一致

## 默认流程

1. 检查 `wiki/index.md`
2. 检查最近更新的页面
3. 修复简单的结构和链接问题
4. 在 `wiki/log.md` 中追加一条简短的 `lint` 记录
