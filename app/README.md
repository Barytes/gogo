# Web MVP

This directory contains a lightweight web MVP for the research knowledge base.

## What It Includes

- A FastAPI backend
- A unified workbench UI with two layout modes:
  - Wiki mode: wiki/raw fills the main canvas, chat becomes a hideable right-side overlay
  - Chat mode: chat fills the main canvas, wiki/raw becomes a hideable right-side overlay
- A simulated agent response flow
- A browser for both `wiki/` and `raw/` materials from an external knowledge-base repo

## Run It

1. Sync dependencies with `uv`:

```bash
uv sync
```

2. If you want `AGENT_MODE=pi`, install the Pi SDK dependency:

```bash
npm install
```

3. Start the server:

```bash
uv run uvicorn app.backend.main:app --reload
```

4. Open:

- `http://127.0.0.1:8000/`
- `http://127.0.0.1:8000/chat`
- `http://127.0.0.1:8000/wiki`

All three routes currently open the same unified workbench page.

## Knowledge Base Repository

This app is designed to live in a separate repository from the knowledge base content.

Set the knowledge base path in `.env`:

```bash
KNOWLEDGE_BASE_DIR=../knowledge-base
```

If this variable is not set, the app will still try the same sibling-path default.

## Current Scope

- `/api/chat` supports two modes:
  - `AGENT_MODE=mock`: simulated local answer
  - `AGENT_MODE=pi`: Pi SDK bridge integration
  - `AGENT_MODE=my-agent-loop`: import and call the local `my-agent-loop`
- `/api/wiki/*` reads the external knowledge-base repository through `KNOWLEDGE_BASE_DIR`.
- `/api/raw/*` reads source materials under the external `raw/` directory.
- PDF files under `raw/` can be previewed inline in the workbench.
- The frontend is plain HTML, CSS, and JavaScript so it can run without a JS build step.

## How Pi Is Meant To Be Integrated

You do not need to copy the Pi agent source code into this repository.

Recommended Pi approach:

1. install Node.js on the runtime machine
2. run `npm install` inside `gogo-app`
3. set `AGENT_MODE=pi` in `.env`
4. optionally configure `PI_NODE_COMMAND`, `PI_TIMEOUT_SECONDS`, and `PI_WORKDIR`
5. make sure Pi-compatible provider credentials are already configured for the SDK on that machine

The current implementation uses a local Node bridge that imports `@mariozechner/pi-coding-agent` and creates an in-memory SDK session with read-only tools.

## How `my-agent-loop` Is Meant To Be Integrated

You do not need to move the `my-agent-loop` source code into this repository.

Recommended approach:

1. keep `my-agent-loop` as its own sibling project
2. set `MY_AGENT_LOOP_DIR=../my-agent-loop`
3. set `AGENT_MODE=my-agent-loop`
4. optionally set `MY_AGENT_LOOP_MODEL`
5. make sure `BUILDER_API_KEY` is available in `.env`

The current implementation imports `my-agent-loop/main.py` dynamically and calls its `chat()` function directly.
