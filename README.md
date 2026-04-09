# gogo-app

Standalone Web MVP application for browsing and chatting with the external research knowledge base.

## Repo Boundary

This repository contains only the application layer:

- FastAPI backend
- static frontend workbench
- app architecture documents

The prompts, wiki pages, and schemas live in a separate `knowledge-base` repository.
The UI can now browse both maintained `wiki/` pages and source materials under `raw/`.

## Setup

1. Copy or create `.env`
2. Point `KNOWLEDGE_BASE_DIR` at your local knowledge-base repo
3. Install dependencies with `uv`
4. Run the server

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
