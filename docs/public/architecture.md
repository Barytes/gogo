# Architecture

**Last updated:** 2026-04-28

This document explains the relationships between the main parts of `gogo-app`: the desktop/browser shell, frontend workbench, FastAPI backend, local knowledge base, app state, and Pi RPC runtime.

Read this with:

- [Concepts](concepts.md) for vocabulary.
- [Design principles](design-principles.md) for product tradeoffs.
- [Developer guide](developer-guide.md) for setup and runtime commands.
- [Backend code reference](backend/) and [Frontend code reference](frontend/) for source-file details.

## System Map

```text
                           local OS / desktop resources
                                      ^
                                      |
                          Tauri bridge and commands
                                      |
                                      v
+------------------+       +-------------------------+
| Browser or Tauri | ----> | Frontend workbench      |
| window           |       | app/frontend            |
+------------------+       +-------------------------+
                                      |
                                      | HTTP / NDJSON
                                      v
                           +-------------------------+
                           | FastAPI backend         |
                           | app/backend/main.py     |
                           +-------------------------+
                              |          |          |
                              |          |          |
             workspace files  |          | app      | JSONL RPC
                              v          v state    v
                  +----------------+  +----------+  +----------------+
                  | Knowledge base |  | .gogo /  |  | Pi RPC runtime |
                  | wiki/raw/...   |  | app data |  | pi --mode rpc  |
                  +----------------+  +----------+  +----------------+
```

The important architectural split is ownership:

- The **frontend** owns presentation and browser-side interaction state.
- The **backend** owns local API composition, path validation, session orchestration, and Pi integration.
- The **knowledge base** owns durable user knowledge.
- **App state** owns runtime support data such as settings, sessions, generated extensions, and logs.
- **Pi** owns the agent runtime, model execution, native session file format, and tool/event protocol.

## Runtime Modes

### Web / Source Mode

```text
uvicorn app.backend.main:app
  -> serves app/frontend
  -> reads .env
  -> uses selected KNOWLEDGE_BASE_DIR
  -> optionally launches Pi through PI_COMMAND or PATH
```

In Web Mode, the browser talks directly to the local FastAPI backend. This is the fastest way to inspect the app and browse the example knowledge base. Chat requires a working Pi command and model provider configuration.

### Desktop Dev Mode

```text
npm run desktop:dev
  -> Tauri beforeDevCommand
  -> npm run backend:dev
  -> FastAPI backend at 127.0.0.1:8000
  -> Tauri window loads that backend URL
```

Desktop Dev Mode is still a source-development flow. Tauri opens the native window, but the backend is the development FastAPI process. This mode is useful for testing desktop bridge behavior and Pi login flows.

### Packaged Desktop Mode

```text
Tauri app starts
  -> resolves app data dir and companion knowledge-base path
  -> starts bundled or Python-backed backend runtime
  -> injects desktop env vars
  -> opens window against the local backend
```

In packaged mode, Tauri is responsible for starting and stopping the backend process. It also passes desktop-only environment variables such as the backend URL, bridge URL, app state directory, companion knowledge-base template path, and default knowledge-base path.

## Core Relationships

### Shell to Frontend

The browser or Tauri window loads the single-page frontend from the backend. The same frontend assets support both Web Mode and Desktop Mode.

The frontend is not a separate build pipeline. It is plain HTML, CSS, and JavaScript served from `app/frontend/`.

### Frontend to Backend

The frontend treats the backend as the local source of runtime truth. It calls HTTP APIs for:

- Wiki, Raw, and Inbox browsing.
- Markdown create/save/delete actions.
- Session creation, history, settings, streaming chat, abort, and compact.
- Provider, security, startup, diagnostics, and Pi install/login state.
- Capability browsing and editing.

Streaming chat uses newline-delimited JSON events from backend routes. The frontend does not talk directly to Pi.

### Backend to Knowledge Base

The backend maps API calls to the selected local knowledge-base folder:

```text
/api/wiki/*              -> knowledge-base/wiki/
/api/raw/*               -> knowledge-base/raw/
/api/inbox/*             -> knowledge-base/inbox/
/api/knowledge-base/*    -> skills/, schemas/, AGENTS.md
```

Path validation happens in backend services before touching the filesystem. This preserves the boundary that user knowledge is local and portable, but access is still scoped to the selected workspace.

### Backend to App State

App state is separate from the knowledge base. It stores data that supports the application runtime rather than the user's durable knowledge:

- Active knowledge-base path and recent workspaces.
- Startup/onboarding state.
- Model provider profiles and generated provider extensions.
- Security mode, approvals, generated security extension, and audit logs.
- Pi RPC session registry and rich app turn history.

This separation is why the knowledge base can remain useful outside gogo, while gogo can still restore sessions and settings when reopened.

### Backend to Pi RPC

The backend launches Pi as a local subprocess and communicates with it through JSONL RPC:

```text
session_manager.py
  -> pi_rpc_client.py
  -> pi --mode rpc
  -> stream events back to session_manager.py
  -> normalized events to frontend
```

The Pi-related responsibilities are intentionally split:

- `pi_rpc_client.py` only handles process transport, JSONL framing, response waiters, and event queues.
- `session_manager.py` handles app session lifecycle, history recovery, streaming policy, aborts, extension UI responses, and frontend event normalization.
- `agent_service.py` keeps deprecated no-session chat compatibility.
- `config.py` and `security_service.py` generate Pi extension arguments for provider and security behavior.

## Main Data Flows

### Browsing and Editing Knowledge

```text
wiki.js / workbench.js
  -> FastAPI route in main.py
  -> wiki_service.py / raw_service.py / skill_service.py / inbox helpers
  -> selected knowledge-base files
  -> response payload back to frontend
```

This flow is filesystem-first. There is no database, vector index, or embedding service between the app and the local Markdown/files.

### Chat Session

```text
chat.js
  -> POST /api/sessions/{session_id}/chat/stream
  -> main.py route
  -> SessionPool.send_message_async()
  -> PiRpcClient.prompt_events()
  -> pi --mode rpc
  -> text/thinking/tool/security/extension events
  -> normalized NDJSON events to chat.js
```

The frontend renders the normalized event stream. The backend persists app-level rich turn history and updates session metadata. Pi also maintains its native session data.

### Model and Provider Configuration

```text
workbench.js settings UI
  -> /api/settings/model-providers
  -> config.py
  -> app settings + Pi auth/settings files
  -> generated managed provider extension
  -> loaded by future Pi RPC launches
```

Provider configuration is app-managed for usability, but the generated extension keeps the runtime mechanism visible and inspectable.

### Security Boundary

```text
settings / chat controls
  -> security_service.py
  -> app security settings + approvals
  -> generated managed security extension
  -> loaded by Pi RPC launches
  -> allow/block events and audit logs
```

Security is enforced through a managed Pi extension plus app settings. The goal is not to hide agent capability, but to make workspace access and blocked actions visible to the user.

### Desktop Bridge

```text
frontend desktop-bridge.js
  -> Tauri commands for native UI actions

backend main.py
  -> local desktop bridge URL
  -> Pi login/install helper endpoints
```

There are two bridge directions:

- Frontend-to-Tauri for native actions such as directory/file selection.
- Backend-to-desktop bridge for operations such as Pi login and Pi install status in desktop runtime.

## Primary Function Call Chains

This section names the main source-level call chains. It is intentionally selective: helpers for formatting, DOM rendering, path labels, and error text are omitted unless they define an architectural boundary.

### Backend Startup

```text
desktop_entry.main()
  -> uvicorn.run(app, host=_backend_host(), port=_backend_port())
  -> main.app
  -> lifespan()
  -> get_session_pool()
  -> SessionPool.__init__()
  -> get_pi_rpc_session_dir()
  -> _load_registry()
  -> _restore_sessions_from_registry()
  -> SessionPool.start_cleanup_loop()
```

In Web Mode, `uvicorn app.backend.main:app` enters at `main.app` directly. In packaged or desktop-backed modes, `desktop_entry.main()` provides the small executable entry point around the same FastAPI app.

The important side effect is that `SessionPool.__init__()` restores gogo's app-level session registry before any session routes run. It does not immediately keep Pi subprocesses open; Pi RPC clients are created for bootstrap, settings, stats, compact, and streaming requests as needed.

### Frontend Boot and Runtime Settings

```text
workbench.js
  -> loadAppSettings()
  -> fetch("/api/settings")
  -> main.get_app_settings()
  -> get_knowledge_base_settings()
  -> get_model_provider_settings()
  -> _get_pi_install_status()
  -> get_startup_settings()
  -> renderSettings()
  -> renderStartupOverlay() / renderModelProviderSettings() / renderKnowledgeBaseSettings()
```

`/api/settings` is the frontend's startup snapshot. It combines knowledge-base selection, provider profiles, Pi installation status, and onboarding state. The frontend keeps this in `appSettings`, but the backend remains the source of truth.

Diagnostics follow a separate chain:

```text
workbench.js loadDiagnostics()
  -> fetch("/api/settings/diagnostics")
  -> main.get_settings_diagnostics()
  -> _build_settings_diagnostics()
  -> health, knowledge-base, Pi runtime, provider, and security payloads
  -> renderDiagnostics()
```

Diagnostics are read-only and cross-cutting. They help the UI explain why a runtime path, provider setup, or Pi command is not working without changing project state.

### Wiki, Raw, and Inbox Browsing

The browser side chooses a list endpoint based on the active mode:

```text
wiki.js bootstrap()
  -> setMode(initialMode)
  -> fetchPages()
  -> currentListEndpoint()
  -> fetch("/api/wiki/pages" | "/api/raw/files" | "/api/inbox/files")
  -> renderList()
  -> navigateToPage()
  -> loadPage()
  -> currentDetailEndpoint()
  -> fetch("/api/wiki/page" | "/api/raw/file" | "/api/inbox/file")
  -> renderPageData()
```

The backend routes fan out by workspace area:

```text
main.wiki_pages()
  -> wiki_service.list_pages()
  -> _iter_wiki_files()
  -> _page_record()

main.wiki_page()
  -> wiki_service.get_page()
  -> _safe_wiki_path()
  -> _page_record(include_content=True)

main.raw_files()
  -> raw_service.list_raw_files()
  -> _iter_raw_files()
  -> _raw_record()

main.raw_file()
  -> raw_service.get_raw_file()
  -> _safe_raw_path()
  -> _raw_record(include_content=True)

main.inbox_browser_files()
  -> _list_inbox_browser_items()
  -> get_knowledge_base_dir()
  -> _inbox_item_payload()

main.inbox_browser_file()
  -> _get_inbox_browser_item()
  -> _resolve_inbox_path()
  -> _inbox_item_payload(include_content=True)
```

`wiki_service.py` and `raw_service.py` own their own path validation helpers. Inbox helpers currently live in `main.py`, so inbox is structurally similar but less isolated than wiki/raw.

### Markdown Create, Save, and Delete

The frontend uses one common Markdown mutation API for `wiki`, `raw`, and Markdown files inside `inbox`:

```text
wiki.js createMarkdownFile()
  -> POST /api/markdown-file
  -> main.create_markdown_browser_file()
  -> _create_markdown_browser_file()
  -> wiki_service.create_page()
     or raw_service.create_raw_file()
     or _create_inbox_markdown_file()

wiki.js saveCurrentWikiPage()
  -> PATCH /api/markdown-file
  -> main.update_markdown_browser_file()
  -> _save_markdown_browser_file()
  -> wiki_service.save_page()
     or raw_service.save_raw_file()
     or _save_inbox_markdown_file()

wiki.js deleteCurrentWikiPage()
  -> DELETE /api/markdown-file
  -> main.delete_markdown_browser_file()
  -> _delete_markdown_browser_file()
  -> wiki_service.delete_page()
     or raw_service.delete_raw_file()
     or _delete_inbox_markdown_file()
```

This shared route is the reason the workbench can edit Markdown across multiple workspace roots without duplicating frontend mutation logic. The source-specific backend functions still keep the filesystem boundary explicit.

### Session Creation

```text
chat.js sendMessage()
  -> createSessionForFirstMessage() when currentSessionId is empty
  -> POST /api/sessions
  -> main.create_session()
  -> get_session_pool()
  -> SessionPool.create_session()
  -> SessionProcess(...)
  -> _bootstrap_rpc_session()
  -> PiRpcClient.start()
  -> PiRpcClient.get_state()
  -> PiRpcClient.new_session()
  -> PiRpcClient.set_model() when model is selected
  -> PiRpcClient.set_thinking_level()
  -> PiRpcClient.set_session_name() when title exists
  -> PiRpcClient.get_state()
  -> _sync_session_from_state()
  -> _sync_registry_from_session()
```

Session creation is both a gogo operation and a Pi operation. gogo creates a UUID-backed `SessionProcess` and registry entry; Pi creates or points to a native `sessionFile`. The registry stores the bridge between those two identities.

### Streaming Chat

The frontend streaming path:

```text
chat.js submitCurrentMessage()
  -> sendMessage()
  -> appendMessage("user", message)
  -> createStreamingAssistantMessage()
  -> fetch("/api/chat/stream")
  -> consumeNdjsonStream()
  -> liveMessage.appendThinkingDelta()
     or liveMessage.appendDelta()
     or liveMessage.addTrace()
     or handleIncomingExtensionUiRequest()
     or liveMessage.finalize()
  -> upsertAssistantTurn()
  -> refreshCurrentSessionDetailInBackground()
```

The frontend currently uses the session-aware chat route at `/api/chat/stream`:

```text
main.chat_stream()
  -> stream_session_chat()
  -> get_session_pool()
  -> SessionPool.send_message_async()
  -> SessionPool._stream_rpc_request()
```

There is also a dedicated session-scoped route for callers that prefer the session id in the URL:

```text
main.session_chat_stream()
  -> get_session_pool()
  -> pool.get_session()
  -> pool.send_message_async()
  -> SessionPool._stream_rpc_request()
```

Inside `_stream_rpc_request()`:

```text
SessionPool._stream_rpc_request()
  -> acquire session.lock
  -> set pending_request_id and active_loop
  -> PiRpcClient.start()
  -> PiRpcClient.switch_session(session.session_file)
  -> PiRpcClient.set_session_name() when needed
  -> PiRpcClient.prompt_events(message)
  -> normalize Pi events:
     message_update/text_delta      -> {"type": "text_delta"}
     message_update/thinking_delta  -> {"type": "thinking_delta"}
     tool and status events         -> {"type": "trace"}
     extension_ui_request           -> {"type": "extension_ui_request"}
     agent_end                      -> {"type": "final"}
     timeout / abort / RPC error    -> {"type": "error"} or stopped final event
  -> _persist_exchange_turns()
  -> clear active_rpc_client, active_loop, pending UI waiter, pending_request_id
  -> _sync_registry_from_session()
  -> release session.lock
```

Inside the Pi transport:

```text
PiRpcClient.prompt_events()
  -> _send_command_and_wait_response(command_type="prompt")
  -> _write_command({"id": request_id, "type": "prompt", "message": ...})
  -> _reader_loop()
  -> _read_record()
  -> response records resolve _response_waiters[id]
  -> non-response records enter _event_queue
  -> _next_event()
  -> yield records until "agent_end"
```

The key architectural point is that the frontend never sees raw Pi JSONL transport. It sees normalized NDJSON app events. `PiRpcClient` knows about transport framing; `SessionPool` knows about product/session semantics.

### Abort and Extension UI Responses

Abort:

```text
chat.js abortCurrentReply()
  -> abortSessionReply(sessionId)
  -> POST /api/sessions/{session_id}/abort
  -> main.abort_session_response()
  -> SessionPool.abort_pending_request()
  -> session.abort_requested = True
  -> rpc_client.send_extension_ui_response(cancelled=True) when UI is pending
  -> rpc_client.abort()
  -> _stream_rpc_request() emits stopped/error terminal event
```

Extension UI response:

```text
chat.js handleIncomingExtensionUiRequest()
  -> enqueueSecurityIntervention()
  -> renderSecurityInterventionModal()
  -> handleSecurityApproval() / handleSecurityDeny()
  -> sendSessionExtensionUiResponse()
  -> POST /api/sessions/{session_id}/extension-ui-response
  -> main.respond_session_extension_ui()
  -> SessionPool.respond_extension_ui_request()
  -> PiRpcClient.send_extension_ui_response()
  -> _clear_extension_ui_wait()
  -> _stream_rpc_request() continues prompt_events()
```

This is the main two-way interaction path during a streaming turn. Pi asks for UI input, gogo displays it, and the selected value goes back through the same active RPC client and event loop.

### Model Provider Changes

```text
workbench.js saveProviderProfile()
  -> providerSavePayload()
  -> POST /api/settings/model-providers
  -> main.save_model_provider()
  -> config.upsert_model_provider_profile()
  -> _load_app_settings()
  -> normalize provider/profile/model fields
  -> _save_app_settings()
  -> _save_pi_auth()
  -> _save_pi_settings_json()
  -> _write_managed_provider_extension()
  -> get_model_provider_settings()
  -> workbench.js refreshPiOptionsAfterProviderChange()
  -> chat.js reloadPiOptions()
  -> GET /api/pi/options
  -> main.pi_options()
  -> SessionPool.get_runtime_options()
  -> PiRpcClient.get_state()
  -> PiRpcClient.get_available_models()
```

Provider edits are persisted in app settings and Pi auth/settings files, then reflected back into Pi by generated extension arguments on future RPC launches.

### Security Mode and Approvals

```text
workbench.js saveSecuritySettings()
  -> PATCH /api/settings/security
  -> main.update_settings_security()
  -> security_service.update_pi_security_settings()
  -> _save_app_settings()
  -> _ensure_security_extension()
  -> reset_session_pool()
```

```text
chat.js handleSecurityApproval()
  -> POST /api/settings/security/approval
  -> main.create_settings_security_approval()
  -> security_service.create_pi_security_approval()
  -> _load_security_approvals()
  -> _save_security_approvals()
  -> sendSessionExtensionUiResponse()
```

Security settings change future Pi launches through generated extension args. One-time approvals are stored separately and consumed by the generated security extension when Pi encounters the matching action.

### Knowledge Base Switching

```text
workbench.js pickKnowledgeBasePath()
  -> desktopBridge.selectKnowledgeBaseDirectory()
  -> applyKnowledgeBasePath()
  -> PATCH /api/settings/knowledge-base
  -> main.update_knowledge_base()
  -> reset_session_pool()
  -> config.set_knowledge_base_dir()
  -> _resolve_knowledge_base_dir()
  -> _save_app_settings()
  -> get_startup_settings()
  -> frontend reloads page
```

The session pool is reset before switching paths because sessions, app turns, and Pi RPC session directories are namespaced by the active knowledge base. A reload lets wiki, chat, settings, and capability views all rehydrate against the new workspace.

### Capability and Slash Command Editing

```text
chat.js loadSlashCommands()
  -> GET /api/knowledge-base/slash-commands
  -> main.knowledge_base_slash_commands()
  -> skill_service.list_slash_commands()
  -> skill_service.list_skills()
  -> skill_service.list_schemas()
```

```text
workbench.js loadCapabilities()
  -> GET /api/knowledge-base/capabilities
  -> main.knowledge_base_capabilities()
  -> skill_service.list_capability_entries()

workbench.js loadCapabilityFile()
  -> GET /api/knowledge-base/capability-file
  -> main.knowledge_base_capability_file()
  -> skill_service.get_capability_file()

workbench.js saveCapabilityFile()
  -> PATCH /api/knowledge-base/capability-file
  -> main.update_knowledge_base_capability_file()
  -> skill_service.save_capability_file()
  -> refreshSlashCommandsAfterCapabilityChange()
```

The chat slash list and the settings capability editor share the same `skill_service.py` source of truth. This keeps visible capabilities and command insertion aligned.

### Desktop Native Bridge

```text
desktop-bridge.js installDesktopBridge()
  -> resolveInvoke()
  -> window.GogoDesktop

workbench.js pickKnowledgeBasePath()
  -> window.GogoDesktop.selectKnowledgeBaseDirectory()
  -> Tauri invoke("select_knowledge_base_directory")

wiki.js openCreateMarkdownFlow()
  -> window.GogoDesktop.selectMarkdownSavePath()
  -> Tauri invoke("select_markdown_save_path")

workbench.js openDesktopPath()
  -> window.GogoDesktop.openPath()
  -> Tauri invoke("open_path")
```

Desktop login has a backend-mediated bridge as well:

```text
workbench.js triggerDesktopPiLogin()
  -> POST /api/settings/pi-login
  -> main.start_pi_login()
  -> is_desktop_runtime()
  -> get_pi_command_path()
  -> _post_to_desktop_bridge("/desktop-login", {})
     or _start_desktop_pi_login_direct()
  -> frontend polls loadAppSettings() and reloadPiOptions()
```

The frontend-to-Tauri path handles local UI affordances. The backend-to-desktop path handles Pi login because it needs backend knowledge of the resolved Pi command and extension arguments.

## Ownership Matrix

| Area | Owner | Durable? | Notes |
| --- | --- | --- | --- |
| Wiki pages | Knowledge base | Yes | User-owned Markdown under `wiki/`. |
| Raw materials | Knowledge base | Yes | User-owned files under `raw/`. |
| Inbox files | Knowledge base | Yes | User-visible intake files under `inbox/`. |
| Skills and schemas | Knowledge base | Yes | Agent-facing workflow definitions. |
| Selected knowledge-base path | App state | Yes | Supports switching workspaces. |
| Provider profiles | App state / Pi auth | Yes | App stores profiles; Pi auth/settings store credentials/defaults. |
| Session registry | App state | Yes | Namespaced by knowledge base. |
| Rich app turn history | App state | Yes | Used to restore frontend traces and warnings. |
| Pi native session files | Pi runtime state | Yes | Used by Pi for conversation continuity. |
| Frontend layout state | Frontend/browser | Mostly transient | Product UI state, not source of durable knowledge. |

## Architectural Boundaries

- gogo serves the local knowledge base; it should not make the app the only owner of user knowledge.
- Backend services validate paths before reading or writing workspace files.
- App state supports runtime behavior but should not replace `wiki/`, `raw/`, `inbox/`, `skills/`, or `schemas/`.
- Pi RPC transport stays protocol-focused; app policy belongs in `session_manager.py` and route/service layers.
- The frontend consumes normalized backend APIs and should not depend on raw Pi protocol events.
- Desktop-only behavior should go through Tauri commands or backend desktop bridge helpers, not leak into normal Web Mode assumptions.

## Code Reference Map

Use source-file docs when you need implementation detail:

- [Backend code reference](backend/) mirrors `app/backend/`.
- [Frontend code reference](frontend/) mirrors `app/frontend/`.

Important entry points:

- [main.py](backend/main.md) - FastAPI routes and API composition.
- [session_manager.py](backend/session_manager.md) - session lifecycle and chat streaming.
- [pi_rpc_client.py](backend/pi_rpc_client.md) - Pi RPC transport.
- [config.py](backend/config.md) - app settings, knowledge-base paths, Pi paths, and provider profiles.
- [security_service.py](backend/security_service.md) - managed security extension and approvals.
- [chat.js](frontend/assets/chat.md) - chat UI, sessions, streaming, inbox, and controls.
- [workbench.js](frontend/assets/workbench.md) - settings, startup, capabilities, diagnostics, and desktop UI glue.
