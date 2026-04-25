# 🐶 gogo

自带一个 [Pi Agent](https://github.com/badlogic/pi-mono) 的 [llm-wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) 风格本地知识库桌面应用原型。开箱即用，不需要额外安装任何Coding Agent或配置任何插件，即可直接与 AI 研究助手对话，在本地管理和积累个人知识。

![gogo](docs/assets/gogo_demo_video.gif)

我正在使用 llm-wiki 作为自己的第二大脑，也非常喜欢这种组织知识的方式。但在日常使用中，我发现 llm-wiki 的工作流有些麻烦：需要同时打开 Obsidian 和 Codex，在两个工具之间来回切换。对我来说尤其明显，因为我通常只有一个屏幕。另一方面，我也很难把 llm-wiki 这种模式安利给身边没有 IT 背景的朋友，因为他们需要下载安装 Coding Agent、配置运行环境和 LLM 模型。这个门槛足以让很多人望而却步。

所以我做了 gogo。现在，我把 gogo 作为自己日常使用 llm-wiki 的入口。虽然它远远没有到达完美水准，但是我觉得它已经能够满足我的需求。它把本地知识库、AI 研究助手和 llm-wiki 工作流放在同一个应用里。如果你也有类似的痛点，希望它也能帮到你。

## 开始使用 gogo

gogo 提供了 Windows x64 和 MacOS（Apple Silicon）版本的安装包。你可以在 [Github Release](https://github.com/Barytes/gogo/releases) 下载对应的安装包。

安装后，首次启动会出现一个欢迎页面。你首先需要配置自己的 LLM 模型。gogo 底层是一个 [Pi Agent](https://github.com/badlogic/pi-mono) ，它支持通过 API Key 和 OAuth 两种方式配置。如果你是通过购买 API 或者订阅 Coding Plan 的形式来使用 LLM，你可以在 API Key 选项中填入你的 API Key、BaseURL 等信息，也可以直接将模型提供商为 OpenClaw 提供的 json 配置文件复制粘贴过来，gogo 可以自动识别。如果你订阅了模型提供商的高级计划，你可以在 OAuth 选项中打开终端 Pi，通过 `\login` 命令登陆支持的模型提供商。目前仅支持 Anthropic (Claude Pro/Max)、GitHub Copilot、Google Cloud Code Assist (Gemini CLI)、Antigravity、ChatGPT Plus/Pro (Codex Subscription)。

配置好 LLM 模型后，你需要选择知识库的位置。如果你没有使用 llm-wiki 类的知识库，gogo 会在你选择的路径中为你创建一个示例知识库（见[example-knowledge-base](https://github.com/Barytes/gogo/tree/main/example-knowledge-base)）。如果你已经在使用 llm-wiki 类的知识库（包含raw, wiki目录），你可以选择你自己的知识库路径。

### 1. llm-wiki 的工作流
如果你不熟悉 llm-wiki，你可以阅读这篇文章：[llm-wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)。llm-wiki 的核心理念是把一次性检索，变成持续维护的知识编译，从而产生信息复利。llm-wiki 的工作流可以概括为三步：1）**Ingest**：把新资料放进 raw 层，由 LLM 读取并在 wiki 层建立新的 wiki 页面，并跟已有的 wiki 页面关联；2）**Query**：回答时优先从 wiki 检索与综合信息，必要时再回 raw 验证；3）**lint**：清理 wiki 页面，检查冲突、过时内容、孤儿页和缺失链接。



### 2. Learn the two main views: Wiki and Chat

应用主要围绕两个视图展开：

- `Wiki`：浏览和编辑本地知识库内容
- `Chat`：和内置 AI agent 对话

一个很自然的第一步是：先在 `Wiki` 里打开一个页面，再切到 `Chat`，让 agent 帮你解释、总结或扩展当前内容。

### 3. Understand the knowledge-base layout

默认知识库是一个基于文件夹的工作区，最重要的几个目录是：

- `wiki/`：整理后的页面、总结和可复用笔记
- `raw/`：原始资料
- `inbox/`：新文件的临时入口
- `skills/`：给 agent 使用的小型工作流能力

推荐的基本流程通常是：新资料先进入 `inbox/`，原始内容沉淀到 `raw/`，整理后的知识写入 `wiki/`。

### 4. Try one complete loop

第一次使用时，可以先走一遍这个最小闭环：

1. 在 `wiki/` 中打开一个页面。
2. 在 `Chat` 里围绕这个页面提一个问题。
3. 上传一个文件到 `inbox/`。
4. 让 agent 帮你把新材料整理成更清晰的 wiki 页面或总结。

这样你就能很快感受到 gogo 的核心设计：文件始终是本地可见的，而 agent 负责帮助你阅读、整理和沉淀知识。

### 5. Switch to your own knowledge base later

当你理解了示例工作区之后，可以在设置面板里把 gogo 切换到你自己的本地知识库目录。

如果你想继续了解架构或做更深入的定制，可以从 [Docs index](docs/index.md) 开始阅读。

## 项目状态

本项目当前处于 **维护模式（maintenance mode）**。

它作为作品项目公开。由于个人的精力有限，我目前不再积极开发新功能，也不建议把这个仓库视为生产级软件或长期支持的桌面产品。

这意味着：

- 你可以下载 Windows / MacOS 安装包并运行使用
- 你可以阅读代码、在本地运行，并把它作为参考实现。
- 当前不保证最终用户可直接使用的 。
- Final end-user Windows / macOS installers are not currently guaranteed or actively maintained.
- 欢迎感兴趣的读者提交 issue、PR 或 fork 继续探索，尤其是把它作为参考实现或实验起点使用。
- Contributions, issues, PRs, and forks are welcome, especially if you find the project useful as a reference or want to continue the experiment in your own direction.
- 但本仓库目前仅按 best-effort 方式维护，我不计划主动推动新功能或长期支持。
- However, this repository is maintained on a best-effort basis, and I do not currently plan to actively drive new features or long-term support.


# 🐶 gogo

A desktop app prototype for a local [llm-wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)-style knowledge base with a built-in AI agent. It is designed to be usable out of the box: you can talk to an AI research assistant and manage and grow your personal knowledge locally, without installing any additional coding agents or configuring plugins.

I use llm-wiki as my second brain, and I really like this way of organizing personal knowledge. In daily use, though, I found the workflow a little cumbersome. I had to keep both Obsidian and Codex open and constantly switch between them, which was especially annoying because I usually work on a single screen. I also found it hard to recommend llm-wiki to non-technical friends, because it required them to install a coding agent, configure the environment, and set up an LLM model. That is a lot of friction before they can even try the idea.

So I built gogo. Today, I use gogo as my daily entry point for working with llm-wiki. Although it's not a perfect app, I find it good enough to meet my needs. It brings the local knowledge base, the AI research assistant, and the llm-wiki workflow into one app. If you have run into the same pain points, I hope it helps you too.

## Getting Started


If you have already completed the quick start above, this short walkthrough is the easiest way to understand how gogo is meant to be used.

### 1. Start with the bundled example knowledge base

By default, gogo opens `./example-knowledge-base`, which is a small starter workspace included in this repository.

默认情况下，gogo 会连接到仓库自带的 `./example-knowledge-base`。这是一个最适合第一次上手的示例知识库。

You do not need to create your own knowledge base first. Just launch the app and explore the bundled one.

第一次体验时，不需要先准备自己的知识库。直接启动应用，先浏览这个示例目录即可。

### 2. Learn the two main views: Wiki and Chat

The app is centered around two views:

应用主要围绕两个视图展开：

- `Wiki`: browse and edit the local knowledge base
- `Chat`: talk to the built-in AI agent

- `Wiki`：浏览和编辑本地知识库内容
- `Chat`：和内置 AI agent 对话

A good first step is to open a page in `Wiki`, then switch to `Chat` and ask the agent to explain, summarize, or extend what you are reading.

一个很自然的第一步是：先在 `Wiki` 里打开一个页面，再切到 `Chat`，让 agent 帮你解释、总结或扩展当前内容。

### 3. Understand the knowledge-base layout

The default workspace is file-based. The main folders are:

默认知识库是一个基于文件夹的工作区，最重要的几个目录是：

- `wiki/`: maintained notes and reusable pages
- `raw/`: raw source material
- `inbox/`: temporary drop zone for new files
- `skills/`: small workflow prompts / capabilities for the agent

- `wiki/`：整理后的页面、总结和可复用笔记
- `raw/`：原始资料
- `inbox/`：新文件的临时入口
- `skills/`：给 agent 使用的小型工作流能力

The intended flow is usually: put new material into `inbox/`, preserve sources in `raw/`, and keep refined knowledge in `wiki/`.

推荐的基本流程通常是：新资料先进入 `inbox/`，原始内容沉淀到 `raw/`，整理后的知识写入 `wiki/`。

### 4. Try one complete loop

A simple first-run loop is:

第一次使用时，可以先走一遍这个最小闭环：

1. Open a page from `wiki/`.
2. Ask a question about it in `Chat`.
3. Upload a file into `inbox/`.
4. Ask the agent to help turn the new material into a cleaner wiki page or summary.

1. 在 `wiki/` 中打开一个页面。
2. 在 `Chat` 里围绕这个页面提一个问题。
3. 上传一个文件到 `inbox/`。
4. 让 agent 帮你把新材料整理成更清晰的 wiki 页面或总结。

This gives you the basic feeling of gogo: local files stay visible, while the agent helps you read, transform, and organize them.

这样你就能很快感受到 gogo 的核心设计：文件始终是本地可见的，而 agent 负责帮助你阅读、整理和沉淀知识。

### 5. Switch to your own knowledge base later

Once the example workspace makes sense, you can open the settings panel and point gogo at another local knowledge-base directory.

当你理解了示例工作区之后，可以在设置面板里把 gogo 切换到你自己的本地知识库目录。

If you want to understand the architecture or customize the setup further, start from [Docs index](docs/index.md).

如果你想继续了解架构或做更深入的定制，可以从 [Docs index](docs/index.md) 开始阅读。


## 项目状态 / Project Status

本项目当前处于 **maintenance mode**。

This project is in **maintenance mode**.

它作为作品项目公开。由于个人的精力有限，我目前不再积极开发新功能，也不建议把这个仓库视为生产级软件或长期支持的桌面产品。

It is published as a portfolio project. Due to limited personal bandwidth, I am not actively developing new features, and this repository should not be treated as production-ready software or a long-term supported desktop product.

这意味着：

What this means:

- 你可以阅读代码、在本地运行，并把它作为参考实现。
- You can read the code, run it locally, and use it as a reference.
- 当前不保证最终用户可直接使用的 Windows / macOS 安装包。
- Final end-user Windows / macOS installers are not currently guaranteed or actively maintained.
- 欢迎感兴趣的读者提交 issue、PR 或 fork 继续探索，尤其是把它作为参考实现或实验起点使用。
- Contributions, issues, PRs, and forks are welcome, especially if you find the project useful as a reference or want to continue the experiment in your own direction.
- 但本仓库目前仅按 best-effort 方式维护，我不计划主动推动新功能或长期支持。
- However, this repository is maintained on a best-effort basis, and I do not currently plan to actively drive new features or long-term support.

## 当前能力 / What It Does

- 浏览和编辑本地文件型知识库，包括 `wiki/`、`raw/`、`inbox/` 和 `skills/` 区域。
- Browse and edit a local file-based knowledge base with `wiki/`, `raw/`, `inbox/`, and `skills/` areas.
- 使用单页工作台，在 `Wiki` 和 `Chat` 视图之间切换。
- Use a single-page workspace with `Wiki` and `Chat` views.
- 连接并切换外部 knowledge-base 目录。
- Connect to an external knowledge-base directory.
- 运行多会话聊天流程，并恢复 reasoning / event history。
- Run multi-session chat workflows with recoverable reasoning / event history.
- 切换 model provider 设置和 thinking level。
- Switch model provider settings and thinking levels.
- 上传文件到 `inbox/`，供后续处理。
- Upload files into `inbox/` for later processing.

## 设计原则 / Principles

- **本地文件优先 / Local files first** — 知识应该保存在用户可以检查、版本管理、移动和编辑的文件夹与文件中，而不是锁在 app 内部。
- Knowledge should live in folders and files the user can inspect, version, move, and edit outside the app.
- **知识可迁移，不锁定 / Portable knowledge, no lock-in** — 停止使用 gogo 不应该让知识库变得不可读。
- Stopping use of gogo should not make the knowledge base unreadable.
- **默认适合 AI 阅读 / AI-readable by default** — knowledge-base 结构、`AGENTS.md`、文档和未来的代码索引，都应该帮助 coding agents 更少地“翻找上下文”。
- The knowledge-base layout, `AGENTS.md`, docs, and future code indexes should help coding agents understand the project with less context-hunting.
- **Agent 是协作者，不是所有者 / Agent as collaborator, not owner** — AI 可以帮助浏览、推理和写作，但用户拥有文件和工作流。
- AI can help browse, reason, and write, but the user owns the files and the workflow.
- **约定优先于隐藏配置 / Conventions over hidden configuration** — `wiki/`、`raw/`、`inbox/` 和 `skills/` 应该像普通目录一样容易理解，而不是隐藏 app state。
- `wiki/`, `raw/`, `inbox/`, and `skills/` should be understandable as plain directories, not hidden app state.
- **文档也是导航 / Documentation as navigation** — 当代码尚未拆分到理想状态时，文档应该帮助人类和 AI agents 找到正确入口。
- When code is not yet ideally decomposed, docs should help humans and AI agents find the right entry points.
- **诚实地做原型 / Prototype honestly** — gogo 是一个探索性项目。它的价值在于工作流、集成经验和设计取舍，而不是伪装成成熟生产应用。
- gogo is an exploratory project. Its value is in the workflow, integration lessons, and design tradeoffs, not in pretending to be a polished production app.

## 技术栈 / Tech Stack

- **后端 / Backend:** FastAPI, Python, uvicorn
- **前端 / Frontend:** Plain HTML / CSS / JavaScript
- **桌面壳 / Desktop shell:** Tauri v2, Rust
- **Agent runtime:** Pi RPC integration
- **知识库 / Knowledge base:** Local Markdown-oriented folders with `wiki/`, `raw/`, `inbox/`, and `skills/`
- **Markdown / math rendering:** Marked, KaTeX

## 快速启动：Web 模式 / Quick Start: Web Mode

Web 模式是从源码查看和体验项目的最简单方式。

Web mode is the simplest way to inspect the project from source.

前置要求：

Prerequisites:

- Python 3.9+
- `uv`
- 如果你想体验 Pi integration 路径，需要 Node.js 22 或 24。
- Node.js 22 or 24 if you want the Pi integration path.

启动：

Setup:

```bash
cd gogo-app
cp .env.example .env
uv sync
uv run uvicorn app.backend.main:app --reload
```

打开：

Open:

```text
http://127.0.0.1:8000/
```

兼容入口：

Useful compatibility routes:

```text
http://127.0.0.1:8000/chat
http://127.0.0.1:8000/wiki
```

默认 `.env.example` 会把 `KNOWLEDGE_BASE_DIR` 指向 `./example-knowledge-base`，这是推荐的本地 starter workspace。

The default `.env.example` points `KNOWLEDGE_BASE_DIR` at `./example-knowledge-base`, which is the recommended starter workspace for local exploration.

## 快速启动：桌面开发模式 / Quick Start: Desktop Dev Mode

桌面模式基于 Tauri，适合开发和实验，不应理解为面向最终用户的成熟安装包。

Desktop mode uses Tauri and is intended for development / exploration, not as a polished end-user release.

前置要求：

Prerequisites:

- Node.js 22 or 24
- Rust stable toolchain
- Python runtime
- 平台相关的 Tauri 桌面依赖
- Platform-specific Tauri desktop dependencies

启动：

Setup:

```bash
cd gogo-app
npm install
npm run desktop:dev
```

`npm run desktop:dev` 会通过 Tauri 的 `beforeDevCommand` 启动本地 FastAPI 后端，等待 `http://127.0.0.1:8000` 就绪，然后打开原生窗口。

`npm run desktop:dev` starts the local FastAPI backend through Tauri's `beforeDevCommand`, waits for `http://127.0.0.1:8000`, and opens the native shell.

## 桌面构建说明 / Desktop Build Notes

仓库包含 Tauri 构建路径：

The repository contains a Tauri build path:

```bash
npm run desktop:build
```

当前边界：

Current caveats:

- 曾经做过 macOS `.app` / `.dmg` 构建实验，但最终用户分发不是当前 maintenance 目标。
- macOS `.app` / `.dmg` build experiments have existed, but final end-user distribution is not the current maintenance target.
- Windows packaging 仍需要真实机器或 CI runner 验证。
- Windows packaging still requires real machine or CI runner validation.
- Bundling Pi 可能需要 `GOGO_DESKTOP_PI_BINARY` 或 `GOGO_DESKTOP_PI_RUNTIME_ROOT`。
- Bundling Pi may require `GOGO_DESKTOP_PI_BINARY` or `GOGO_DESKTOP_PI_RUNTIME_ROOT`.
- 签名、notarization、干净机器验证和自动更新尚未完成。
- Signing, notarization, clean-machine validation, and auto-update are not complete.

历史打包记录见：

For the historical packaging notes, see:

- [Desktop packaging guide](docs/desktop-packaging-guide.md)
- [Release target and boundaries](docs/release-target-and-boundaries.md)
- [Tauri migration plan](docs/tauri-migration-plan.md)

## 仓库结构 / Repository Map

```text
gogo-app/
  app/
    backend/        FastAPI services, session handling, Pi RPC integration
    frontend/       Single-page workspace assets
  src-tauri/        Tauri desktop shell
  example-knowledge-base/
                    Starter local knowledge-base workspace
  docs/             Architecture notes, release notes, and public-readiness plans
  scripts/          Development and desktop build helpers
```

## 关键文档 / Key Docs

- [Docs index](docs/index.md)
- [Open-source / portfolio release plan](docs/open-source-readiness-refactor-plan.md)
- [Tolaria documentation lessons for gogo](docs/tolaria-documentation-lessons-for-gogo.md)
- [gogo app architecture](docs/gogo-app-architecture.md)
- [Agent architecture](docs/agent-architecture.md)
- [Session management](docs/session-management.md)
- [Frontend workbench elements](docs/frontend-workbench-elements.md)

## 已知限制 / Known Limitations

- 本项目处于 maintenance mode，不再积极开发新功能。
- This project is in maintenance mode and is not actively feature-developed.
- 当前代码库包含若干长文件，更适合配合索引文档阅读，而不是被视为已经完成理想模块拆分的架构。
- The current codebase contains several large files that should be navigated with supporting docs rather than treated as a polished modular architecture.
- 桌面端更适合理解为开发版 / 原型路径，而不是成熟消费级安装包。
- The desktop app is best understood as a development build / prototype path, not a finished consumer installer.
- Pi integration 是 chat 行为的核心，可能需要本地环境配置。
- The Pi integration is central to chat behavior and may require local setup.
- 当前还没有完整的公开 CI、release 或支持流程。
- There is not yet a complete public CI, release, or support process.
- 公开作品快照前，还建议补充截图、license、code index docs 和简洁的 concepts 文档。
- Screenshots, license choice, code index docs, and a concise concepts document should be added before a polished public snapshot.

## License

当前仓库还没有 public license file。正式作为可复用开源项目前，请先添加 `LICENSE`。如果没有特殊原因，轻量作品型发布建议使用 MIT。

This repository does not currently include a public license file. Add a `LICENSE` before treating the project as reusable open source. MIT is the recommended default for a lightweight portfolio release unless there is a specific reason to choose another license.
