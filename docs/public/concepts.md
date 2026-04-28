# Concepts

**Last updated:** 2026-04-28

This document is the conceptual model for `gogo-app`. It defines the vocabulary used across the public docs, code reference, and agent-facing project memory.

中文说明：这是一份轻量 Abstractions 文档，用来先建立词汇表，再进入架构和代码。

## Knowledge Base

**Definition:** A user-owned local folder that follows the llm-wiki workflow conventions.

**Where it lives:** The active path is selected through app settings and resolved by `app/backend/config.py`. The starter workspace lives in `example-knowledge-base/`.

**Why it matters:** The knowledge base is the durable object. gogo serves it, but should not make the app the only place where the user's knowledge can be read or changed.

**Related docs:** [Knowledge base guide](knowledge-base-guide.md), [Architecture](architecture.md), [Design principles](design-principles.md).

## Wiki

**Definition:** The maintained Markdown layer of the knowledge base. Wiki pages are the refined knowledge that users and agents should consult first.

**Where it lives:** `knowledge-base/wiki/`, served by `app/backend/wiki_service.py` and rendered/edited by frontend wiki code.

**Why it matters:** Wiki pages are the compounding layer of llm-wiki. They turn one-off reading into reusable context.

**Related docs:** [Knowledge base guide](knowledge-base-guide.md), [wiki_service.py reference](backend/wiki_service.md), [wiki.js reference](frontend/assets/wiki.md).

## Raw

**Definition:** The source-material layer of the knowledge base. It can contain PDFs, notes, data files, and other raw references.

**Where it lives:** `knowledge-base/raw/`, served by `app/backend/raw_service.py`.

**Why it matters:** Raw materials preserve provenance. When wiki content is insufficient, the agent can return to raw sources for verification or deeper reading.

**Related docs:** [Knowledge base guide](knowledge-base-guide.md), [raw_service.py reference](backend/raw_service.md).

## Inbox

**Definition:** A temporary intake area for new materials before they are organized into `raw/` and `wiki/`.

**Where it lives:** `knowledge-base/inbox/`, managed mainly through `app/backend/main.py` inbox routes and frontend chat/wiki panels.

**Why it matters:** Inbox gives users a low-friction way to drop files into the workflow without immediately deciding their final knowledge structure.

**Related docs:** [Architecture](architecture.md), [main.py reference](backend/main.md), [chat.js reference](frontend/assets/chat.md).

## Session

**Definition:** A persistent chat workspace backed by a Pi RPC session and app-level metadata.

**Where it lives:** Session metadata and rich turn history live under app-managed state, namespaced by the active knowledge base. Runtime orchestration lives in `app/backend/session_manager.py`.

**Why it matters:** Sessions preserve conversation continuity, model/thinking settings, context usage, and history recovery without writing chat state into the user's wiki pages.

**Related docs:** [Session management](design-notes/session-management.md), [session_manager.py reference](backend/session_manager.md), [Architecture](architecture.md).

## Pi RPC

**Definition:** The local agent runtime interface used by gogo. The backend launches `pi --mode rpc` and communicates with it through newline-delimited JSON.

**Where it lives:** Transport code is in `app/backend/pi_rpc_client.py`; session orchestration is in `app/backend/session_manager.py`; legacy no-session compatibility is in `app/backend/agent_service.py`.

**Why it matters:** Pi RPC lets gogo expose a real agent runtime while keeping the GUI focused on local knowledge work rather than reimplementing an agent.

**Related docs:** [Agent architecture](design-notes/agent-architecture.md), [pi_rpc_client.py reference](backend/pi_rpc_client.md), [Architecture](architecture.md).

## Provider

**Definition:** A model provider configuration used by Pi, such as an API-key provider or an OAuth-backed provider.

**Where it lives:** Provider settings are stored in app state and Pi auth/settings files, normalized by `app/backend/config.py`, and exposed through settings UI.

**Why it matters:** Provider configuration is part of making the agent usable out of the box while keeping model/runtime choices visible to the user.

**Related docs:** [config.py reference](backend/config.md), [workbench.js reference](frontend/assets/workbench.md), [Developer guide](developer-guide.md).

## Skill

**Definition:** A user-editable capability definition that tells the agent how to perform a specific workflow.

**Where it lives:** `knowledge-base/skills/<skill-name>/SKILL.md`, optionally with support docs such as `README.md` or `AGENTS.md`.

**Why it matters:** Skills keep agent behavior visible and portable with the knowledge base instead of locking workflows into app-only UI state.

**Related docs:** [Slash command scope](design-notes/slash-command-scope.md), [skill_service.py reference](backend/skill_service.md).

## Schema

**Definition:** A user-editable structure or workflow definition for knowledge operations such as ingest, query, and lint.

**Where it lives:** `knowledge-base/schemas/`, usually as Markdown, JSON, YAML, or YML.

**Why it matters:** Schemas make local knowledge work more structured without requiring a database, embedding pipeline, or hidden app configuration.

**Related docs:** [Knowledge base guide](knowledge-base-guide.md), [skill_service.py reference](backend/skill_service.md).

## Capability

**Definition:** The broader UI/API category that includes skills, schemas, support docs, and root agent instructions.

**Where it lives:** Capabilities are discovered from `skills/`, `schemas/`, and root `AGENTS.md` by `app/backend/skill_service.py`.

**Why it matters:** Capability browsing/editing is how gogo exposes agent-facing workflow rules instead of hiding them behind opaque product behavior.

**Related docs:** [Slash command scope](design-notes/slash-command-scope.md), [skill_service.py reference](backend/skill_service.md), [Design principles](design-principles.md).
