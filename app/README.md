# Web MVP

This directory contains a lightweight web MVP for the research knowledge base.

## What It Includes

- A FastAPI backend
- A unified workbench UI with wiki/raw on the left and chat on the right
- A simulated agent response flow
- A browser for both `wiki/` and `raw/` materials from an external knowledge-base repo

## Run It

1. Sync dependencies with `uv`:

```bash
uv sync
```

2. Start the server:

```bash
uv run uvicorn app.backend.main:app --reload
```

3. Open:

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

- `/api/chat` is a mock agent endpoint. It uses local wiki matches to produce a simulated answer.
- `/api/wiki/*` reads the external knowledge-base repository through `KNOWLEDGE_BASE_DIR`.
- `/api/raw/*` reads source materials under the external `raw/` directory.
- PDF files under `raw/` can be previewed inline in the workbench.
- The frontend is plain HTML, CSS, and JavaScript so it can run without a JS build step.
