# gogo-app

本地知识库工作台：浏览 `Wiki / Raw`，并通过 Pi RPC 驱动聊天式研究助手。

## 当前发布边界

截至 **2026-04-16**，当前仓库应理解为：

- 对外目标：做成普通用户可直接安装的 Windows / macOS 桌面应用
- 正式产品形态：桌面版；Web 版不作为正式对外产品
- 已支持：从源码运行的 Web 版
- 已支持：从源码运行的 Tauri 桌面开发版
- 尚未完成：面向最终用户稳定分发的 Windows / macOS 安装包

也就是说，方向已经明确是“普通用户可直接安装”，但当前现实状态仍然是“开发者可运行的桌面版先行，正式安装包尚未验收完成”。

如果你需要对外介绍当前状态，请优先参考：

- [docs/release-target-and-boundaries.md](docs/release-target-and-boundaries.md)

## 当前能力

- 单页工作台：`Wiki` / `Chat` 双布局
- 连接并切换外部 knowledge-base
- 多会话聊天与“思考过程”恢复
- 模型 / 思考水平切换
- 上传文件到 `inbox/` 并驱动 ingest
- 设置面板中的 Provider 与 diagnostics
- Tauri 桌面壳第一期实现

## Web 模式启动

当前适用对象：

- 开发者
- 愿意自己准备本地环境的技术用户

说明：

- Web 版当前主要用于开发、调试和技术验证
- 它不是面向普通用户的最终交付形态

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

当前这部分的定位是：

- 对外目标所对应正式桌面版的前置落地阶段
- 可供开发者和小范围内测运行与验证的桌面开发版
- 不是已经完成最终用户分发的正式桌面安装包

当前桌面链路仍依赖外部环境：

- Node `22` 或 `24`
- Rust 工具链
- Python 运行时
- 一个可用的 knowledge-base 目录
- 本机可用的 `pi`

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

注意：当前的 `desktop:build` 更接近“构建开发态桌面产物”，**不应直接等同于已经完成最终用户分发安装包**。

当前仍然保留的已知边界：

- 对外目标已经明确是“普通用户可直接安装”，但当前尚未达到这个交付标准
- Windows / macOS 最终用户安装包尚未完成验收闭环
- 打包内置 Python 运行时尚未处理
- companion knowledge-base 虽然计划随安装包提供，但完整安装链路尚未落地
- 当前聊天与 OAuth 登录链路仍依赖本机 `pi`
- 当前仅计划支持 API key 型 provider，以及 `pi` 已稳定支持且桌面引导已验证通过的 OAuth
- 自动更新尚未实现

Tauri 设计与当前实现边界见：

- [docs/tauri-migration-plan.md](docs/tauri-migration-plan.md)
- [docs/release-target-and-boundaries.md](docs/release-target-and-boundaries.md)

## 关键文档

- [docs/release-target-and-boundaries.md](docs/release-target-and-boundaries.md)
- [docs/gogo-app-architecture.md](docs/gogo-app-architecture.md)
- [docs/frontend-workbench-elements.md](docs/frontend-workbench-elements.md)
- [docs/session-management.md](docs/session-management.md)
- [docs/tauri-migration-plan.md](docs/tauri-migration-plan.md)
- [docs/index.md](docs/index.md)
