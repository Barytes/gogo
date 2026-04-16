# gogo-app

本地知识库工作台：浏览 `Wiki / Raw`，并通过 Pi RPC 驱动聊天式研究助手。

## 当前能力

- 单页工作台：`Wiki` / `Chat` 双布局
- 连接并切换外部 knowledge-base
- 多会话聊天与“思考过程”恢复
- 模型 / 思考水平切换
- 上传文件到 `inbox/` 并驱动 ingest
- 设置面板中的 Provider 与 diagnostics
- Tauri 桌面壳第一期实现

## Web 模式启动

1. 从 `.env.example` 创建 `.env`
2. 配置 `KNOWLEDGE_BASE_DIR`
3. 安装 Python 依赖

```bash
uv sync
```

4. 启动 FastAPI

```bash
uv run uvicorn app.backend.main:app --reload
```

5. 打开：

- `http://127.0.0.1:8000/`

兼容入口：

- `http://127.0.0.1:8000/chat`
- `http://127.0.0.1:8000/wiki`

## 桌面版状态

当前仓库里的桌面实现已经切到 Tauri，旧 Electron 可执行代码与历史文档都已清理。

如果你要运行桌面版，先准备：

1. Node `22` 或 `24`
2. Rust 工具链
3. 平台原生桌面依赖

然后安装 Node 依赖：

```bash
npm install
```

启动 Tauri 开发版：

```bash
npm run desktop:dev
```

开发模式下，Tauri 会先通过 `beforeDevCommand` 自动启动本地 FastAPI，再等待 `http://127.0.0.1:8000` 就绪，所以不需要你手动先开一个 uvicorn。

当前 Tauri 版会：

- 启动并托管本地 FastAPI 子进程
- 探活 `/api/health`
- 创建原生窗口并加载本地工作台页面
- 通过桌面桥恢复“选择知识库目录”
- 通过统一登录入口打开 Pi CLI，并尝试触发原生 `/login`，然后在登录完成后自动刷新 Provider 状态

如果后续要构建桌面产物，再运行：

```bash
npm run desktop:build
```

当前仍然保留的已知边界：

- 打包内置 Python 运行时尚未处理
- 自动更新尚未实现

Tauri 设计与当前实现边界见：

- [docs/tauri-migration-plan.md](docs/tauri-migration-plan.md)

## 关键文档

- [docs/gogo-app-architecture.md](docs/gogo-app-architecture.md)
- [docs/frontend-workbench-elements.md](docs/frontend-workbench-elements.md)
- [docs/session-management.md](docs/session-management.md)
- [docs/tauri-migration-plan.md](docs/tauri-migration-plan.md)
- [docs/index.md](docs/index.md)
