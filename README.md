# gogo-app

Standalone Web MVP application for browsing and chatting with the external research knowledge base.

## Repo Boundary

This repository contains only the application layer:

- FastAPI backend
- static frontend workbench
- app architecture documents

The prompts, wiki pages, and schemas live in a separate `knowledge-base` repository.
The UI can now browse both maintained `wiki/` pages and source materials under `raw/`.

## Pi Integration

This repository now includes a Pi SDK integration path for `/api/chat`.

You do not need to vendor the Pi source code into this repository.
The recommended setup is:

1. install Node.js on the machine that runs this FastAPI app
2. install the Pi SDK dependency inside `gogo-app`
3. keep `gogo-app` and `knowledge-base` as separate repositories
4. switch `.env` from `AGENT_MODE=mock` to `AGENT_MODE=pi`

```bash
npm install
```

The backend will call a local Node bridge that uses `@mariozechner/pi-coding-agent` via its SDK, and will fall back to mock mode when Node or the SDK dependency is not available.

Pi SDK mode uses the knowledge-base directory as its working directory and currently gives Pi a read-only tool set.

## Pi Runtime Assumptions

Pi SDK mode does not copy Pi source into this repo.

It assumes:

1. `node` is available on `PATH`
2. `@mariozechner/pi-coding-agent` is installed in this repo
3. your Pi provider credentials are already configured the way Pi expects on this machine

That last point means model/provider selection is currently delegated to Pi's own auth/config resolution rather than a custom app-level provider adapter.

## my-agent-loop Integration

This repository can also use your local `my-agent-loop` project as another chat backend mode.

Recommended setup:

1. keep `my-agent-loop` as its own local project directory
2. point `MY_AGENT_LOOP_DIR` at that directory
3. set `AGENT_MODE=my-agent-loop`
4. make sure `gogo-app` has the Python dependencies needed by `my-agent-loop`

This integration imports and calls the local loop directly. It does not require copying the loop source code into `gogo-app`.

## Setup

1. Copy or create `.env`
2. Point `KNOWLEDGE_BASE_DIR` at your local knowledge-base repo
3. Install dependencies with `uv`
4. If you want `AGENT_MODE=pi`, also run `npm install`
5. Run the server

```bash
uv sync
uv run uvicorn app.backend.main:app --reload
```

Open:

- `http://127.0.0.1:8000/`

## Related Files

- [app/README.md](app/README.md)
- [mvp-architecture.md](mvp-architecture.md)
- [AGENTS.md](AGENTS.md)
