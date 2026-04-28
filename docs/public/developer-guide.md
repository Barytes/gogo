# Developer Guide

**Last updated:** 2026-04-28

This document contains the source-based development notes that used to live in the README. The README is now kept as the product-facing entry point, while this file is the entry point for developers who want to run, inspect, or build `gogo-app` from source.

## Tech Stack

- **Backend:** FastAPI, Python, uvicorn
- **Frontend:** Plain HTML / CSS / JavaScript
- **Desktop shell:** Tauri v2, Rust
- **Agent runtime:** Pi RPC integration
- **Knowledge base:** Local Markdown-oriented folders with `wiki/`, `raw/`, `inbox/`, and `skills/`
- **Markdown / math rendering:** custom lightweight Markdown rendering, KaTeX

## Quick Start: Web Mode

Web mode is the simplest way to inspect the project from source.

Prerequisites:

- Python 3.9+
- `uv`
- Node.js 22 or 24 if you want to exercise the Pi integration path.

Setup:

```bash
cd gogo-app
cp .env.example .env
uv sync
uv run uvicorn app.backend.main:app --reload
```

Open:

```text
http://127.0.0.1:8000/
```

Useful compatibility routes:

```text
http://127.0.0.1:8000/chat
http://127.0.0.1:8000/wiki
```

The default `.env.example` points `KNOWLEDGE_BASE_DIR` at `./example-knowledge-base`, which is the recommended starter workspace for local exploration.

In this mode, wiki/raw browsing and most settings pages can be inspected without a working Pi login. Chat sessions require the Pi agent setup below.

## Pi Agent Setup

gogo talks to the agent through Pi RPC. There are two different Pi setup scenarios:

- **Source development:** run the app from this repository and point the backend at a Pi command.
- **Desktop packaging:** stage a downloaded Pi runtime into the packaged app resources.

Do not confuse these two. `npm install` is useful for source development, but desktop installers need an actual runtime staged by the desktop build script.

You can download Pi runtime builds from the [Pi releases page](https://github.com/badlogic/pi-mono/releases).

### Source Development: Use a Pi Command

For Web Mode or Desktop Dev Mode, the backend needs to find a runnable `pi` command. It checks:

- A launcher configured through `PI_COMMAND`
- A bundled launcher at `./pi-runtime/pi`, `./pi-runtime/pi.exe`, or `./pi-runtime/pi.cmd`
- A managed Pi install under app state
- A `pi` command available on `PATH`

Common local choices:

1. Install or expose `pi` on your `PATH`, then verify:

```bash
pi --help
```

2. Use a downloaded Pi runtime from [Pi releases](https://github.com/badlogic/pi-mono/releases) and point `.env` at its launcher:

```bash
PI_COMMAND=./pi-runtime/macos-arm64/pi
```

3. Use the package installed by `npm install`. This is most reliable when starting the backend through npm/Tauri scripts, because npm adds `node_modules/.bin` to `PATH` for scripts:

```bash
cd gogo-app
npm install
npm run desktop:dev
```

If you start Web Mode directly with `uv run uvicorn`, do not assume `node_modules/.bin/pi` is on `PATH`. Either expose `pi` yourself or set `PI_COMMAND` in `.env`.

If the backend reports that Pi is unavailable, check `/api/health` or the Diagnostics panel for `pi_command_path`.

### Desktop Packaging: Bundle a Pi Runtime

For `npm run desktop:build`, the build script expects a downloaded Pi runtime directory or launcher that can be copied into the app bundle. Download runtime builds from [Pi releases](https://github.com/badlogic/pi-mono/releases). The recommended layout is:

```text
gogo-app/
  pi-runtime/
    macos-arm64/
      pi
      package.json
      assets/
      theme/
      ...
```

The build script looks for platform-specific defaults under `./pi-runtime/`, or you can configure one of:

```bash
GOGO_DESKTOP_PI_BINARY=./pi-runtime/macos-arm64/pi
GOGO_DESKTOP_PI_RUNTIME_ROOT=./pi-runtime
```

During packaging, the selected runtime is staged into the desktop resources as `pi-runtime/`, where the packaged backend can find `pi`, `pi.exe`, or `pi.cmd` at the runtime root.

To make chat useful, configure at least one model provider from the app settings panel:

- API provider: enter a base URL, API type, model list, and API key.
- OAuth provider: in desktop mode, use the Pi login flow; in web mode, manual token import exists mainly as a development fallback.

Important notes:

- Wiki browsing does not require Pi.
- Creating a session or sending chat messages requires Pi RPC to be available.
- If Pi is available but no provider/model is configured, the UI may open but agent responses will fail at runtime.
- `PI_TIMEOUT_SECONDS=off` in `.env.example` disables the read timeout for local exploration.
- `GOGO_DESKTOP_PI_BINARY` and `GOGO_DESKTOP_PI_RUNTIME_ROOT` are build-time packaging settings; `PI_COMMAND` is the usual source-development runtime override.

## Quick Start: Desktop Dev Mode

Desktop mode uses Tauri and is intended for development and exploration. It should not be treated as a polished end-user release.

Prerequisites:

- Node.js 22 or 24
- `uv`
- Rust stable toolchain
- Python runtime
- Platform-specific Tauri desktop dependencies

Setup:

```bash
cd gogo-app
cp .env.example .env
uv sync
npm install
npm run desktop:dev
```

`npm run desktop:dev` starts the local FastAPI backend through Tauri's `beforeDevCommand`, waits for `http://127.0.0.1:8000`, and opens the native shell.

The dev backend launcher tries several Python entry points:

- `GOGO_DESKTOP_PYTHON` if set
- `.venv/bin/python` or `.venv/Scripts/python.exe`
- `uv run uvicorn`
- `python3 -m uvicorn`
- `python -m uvicorn`

Running `uv sync` first is recommended because it creates the local environment expected by the launcher.

Desktop dev mode is also the preferred way to test Pi OAuth login behavior, because the app can use the local desktop bridge or terminal fallback to open interactive Pi login.

## Common Setup Issues

- `uv: command not found`: install `uv`, then run `uv sync` again.
- Backend starts but chat fails: check whether `pi_command_path` is present in `/api/health` or Diagnostics.
- Pi is available but provider login fails: configure a provider in Settings, or use desktop dev mode for OAuth providers that expect interactive Pi login.
- Tauri fails before opening a window: verify Rust, platform-specific Tauri dependencies, and `npm install`.
- Port `8000` is already in use: stop the other process or set `GOGO_BACKEND_PORT` before running desktop dev.

## Desktop Build Notes

The repository contains a Tauri build path:

```bash
npm run desktop:build
```

Current caveats:

- macOS `.app` / `.dmg` build experiments have existed, but final end-user distribution is not the current maintenance target.
- Windows packaging still requires real machine or CI runner validation.
- Bundling Pi requires a downloaded runtime under `./pi-runtime/` or an explicit `GOGO_DESKTOP_PI_BINARY` / `GOGO_DESKTOP_PI_RUNTIME_ROOT`.
- Signing, notarization, clean-machine validation, and auto-update are not complete.

For historical packaging notes, see:

- [Desktop packaging guide](../archive/packaging/desktop-packaging-guide.md)
- [Release target and boundaries](../archive/planning/release-target-and-boundaries.md)
- [Tauri migration plan](../archive/packaging/tauri-migration-plan.md)

## Repository Map

```text
gogo-app/
  app/
    backend/        FastAPI services, session handling, Pi RPC integration
    frontend/       Single-page workspace assets
  src-tauri/        Tauri desktop shell
  example-knowledge-base/
                    Starter local knowledge-base workspace
  docs/             Public docs, per-file source docs, archived notes, and demo assets
  scripts/          Development and desktop build helpers
```

## Recommended Developer Reading

- [Documentation index](../index.md)
- [Architecture](architecture.md)
- [Concepts](concepts.md)
- [Pi RPC client reference](backend/pi_rpc_client.md)
- [Session manager reference](backend/session_manager.md)
- [Chat frontend reference](frontend/assets/chat.md)
- [Workbench frontend reference](frontend/assets/workbench.md)

## License Note

This repository is released under the MIT License. See [`LICENSE`](../../LICENSE).
