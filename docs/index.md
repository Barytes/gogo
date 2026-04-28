# gogo Documentation Index

**Last updated:** 2026-04-28

This directory is the documentation map for `gogo-app`.

## Start Here

Recommended reading order:

1. [Concepts](public/concepts.md) - vocabulary and domain model.
2. [Architecture](public/architecture.md) - how frontend, backend, Pi RPC, app state, and the local knowledge base fit together.
3. [Design principles](public/design-principles.md) - product beliefs and tradeoffs.
4. [Knowledge base guide](public/knowledge-base-guide.md) - practical guide to the local llm-wiki workspace.
5. [Developer guide](public/developer-guide.md) - local setup, Pi runtime setup, web mode, and desktop dev mode.
6. [Design notes](#design-notes) - deeper implementation and product-boundary notes.
7. [Code reference](#code-reference) - source-file documentation for backend and frontend.

## Directory Architecture

```text
docs/
  index.md
  public/                    Current public documentation
    concepts.md              Domain vocabulary and abstractions
    architecture.md          System relationships and major call chains
    design-principles.md     Product principles and tradeoffs
    developer-guide.md       Local development and runtime setup
    knowledge-base-guide.md  Practical llm-wiki workspace guide
    design-notes/            Focused subsystem and product-boundary notes
    backend/                 One document per app/backend source file
    frontend/                One document per app/frontend source file
  archive/                   Historical, deprecated, and reference material
    planning/                Old plans and product thinking
    packaging/               Desktop packaging notes and regressions
    logs/                    Problem logs and cleanup notes
    deprecated/              Old maintenance documents
    vendor/                  Upstream reference snapshots, not current gogo implementation docs
```

## Public Docs

- [Concepts](public/concepts.md) - glossary-style model of `knowledge-base`, `wiki`, `raw`, `inbox`, `session`, `Pi RPC`, providers, skills, schemas, and capabilities.
- [Architecture](public/architecture.md) - current architecture entry point, including runtime modes, ownership boundaries, data flows, and primary function call chains.
- [Design principles](public/design-principles.md) - principles that guide product and maintenance decisions.
- [Knowledge base guide](public/knowledge-base-guide.md) - how the local knowledge-base folder is structured and how it is meant to be used.
- [Developer guide](public/developer-guide.md) - setup instructions for web/source mode, Pi, and desktop dev mode.

## Design Notes

`docs/public/design-notes/` contains deeper notes. These are not formal ADRs; they are current subsystem explanations and product-boundary records.

- [Agent architecture](public/design-notes/agent-architecture.md) - Pi RPC backend and runtime orchestration.
- [Session management](public/design-notes/session-management.md) - session persistence, recovery, streaming, aborts, and rich history behavior.
- [Frontend workbench elements](public/design-notes/frontend-workbench-elements.md) - Wiki / Chat workspace elements, settings panels, and data sources.
- [Pi security boundary](public/design-notes/pi-security-boundary.md) - local security modes, audit logs, inline approval, and command/write boundaries.
- [Slash command scope](public/design-notes/slash-command-scope.md) - slash command product boundary and current skills/schemas behavior.

## Code Reference

The source-file docs are implementation reference material. They are useful after reading Concepts and Architecture, but they are not the first-stop product explanation.

### Backend

`docs/public/backend/` mirrors maintained backend source files under `app/backend/`. The package marker `__init__.py` is intentionally not documented as a standalone file because it has no runtime behavior.

- [agent_service.py](public/backend/agent_service.md) - legacy no-session agent path and event normalization.
- [config.py](public/backend/config.md) - app settings, knowledge-base paths, Pi runtime, and provider profiles.
- [desktop_entry.py](public/backend/desktop_entry.md) - packaged desktop backend entry point.
- [main.py](public/backend/main.md) - FastAPI app, routes, static serving, settings, inbox, wiki, raw, and sessions.
- [pi_rpc_client.py](public/backend/pi_rpc_client.md) - async Pi RPC transport client.
- [raw_service.py](public/backend/raw_service.md) - `raw/` filesystem service.
- [security_service.py](public/backend/security_service.md) - Pi security mode, approvals, extension, and audit log.
- [session_manager.py](public/backend/session_manager.md) - session lifecycle, streaming chat, and history recovery.
- [skill_service.py](public/backend/skill_service.md) - skills, schemas, capabilities, and slash command discovery.
- [wiki_service.py](public/backend/wiki_service.md) - `wiki/` filesystem service.

### Frontend

`docs/public/frontend/` mirrors `app/frontend/`. Each maintained frontend source file has a corresponding Markdown document.

- [index.html](public/frontend/index-html.md) - single-page workbench DOM shell.
- [chat.js](public/frontend/assets/chat.md) - chat sessions, streaming, model controls, inbox, slash commands.
- [desktop-bridge.js](public/frontend/assets/desktop-bridge.md) - Tauri bridge wrapper.
- [math-render.js](public/frontend/assets/math-render.md) - KaTeX rendering wrapper.
- [styles.css](public/frontend/assets/styles.md) - app layout and visual system.
- [wiki.js](public/frontend/assets/wiki.md) - Wiki / Raw / Inbox browser and editor.
- [workbench.js](public/frontend/assets/workbench.md) - layout, startup, settings, providers, capabilities, diagnostics.

Vendored frontend assets are documented only when there is maintained project-specific context. Unmodified third-party assets are not expanded into full code reference docs.

## Archive

Archived documents are kept for traceability. They may be stale, incomplete, or written for a previous project phase. Do not treat archive docs as current implementation documentation unless a current public doc links to them for historical context.

### Planning

- [Open-source readiness refactor plan](archive/planning/open-source-readiness-refactor-plan.md)
- [Release target and boundaries](archive/planning/release-target-and-boundaries.md)
- [Product definition belief](archive/planning/product-definition-belief.md)
- [Tolaria documentation lessons for gogo](archive/planning/tolaria-documentation-lessons-for-gogo.md)
- [Agent session refactor assessment](archive/planning/agent-session-refactor-assessment.md)

### Packaging

- [Desktop packaging options](archive/packaging/desktop-packaging-options.md)
- [Desktop packaging guide](archive/packaging/desktop-packaging-guide.md)
- [Desktop packaging regressions](archive/packaging/desktop-packaging-regressions.md)
- [Tauri migration plan](archive/packaging/tauri-migration-plan.md)

### Logs

- [Problem log](archive/logs/problem-log.md)
- [Session performance optimization log](archive/logs/session-performance-optimization-log.md)
- [Documentation cleanup audit](archive/logs/documentation-cleanup-audit-2026-04-15.md)

### Deprecated

- [Archived TASKS](archive/deprecated/TASKS.md)
- [Archived code-doc mapping](archive/deprecated/code-doc-mapping.md)
- [Archived gogo app architecture](archive/deprecated/gogo-app-architecture.md)
- [Archived model provider options](archive/deprecated/model-provider-configuration-options.md)

### Vendor Snapshots

`archive/vendor/` contains copied upstream reference material. These files are kept as historical/runtime context and may contain links to source files or examples that were not copied into this repository. They are not part of the current gogo implementation documentation set.
