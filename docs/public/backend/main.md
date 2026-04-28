# `app/backend/main.py`

Source: [`app/backend/main.py`](../../../app/backend/main.py)

`main.py` is the FastAPI application entry point.

## Role

This file owns the HTTP contract between the frontend workbench and the backend services. It should be treated as the API composition layer: route handlers live here, while durable domain behavior should stay in smaller service modules whenever possible.

`main.py` is intentionally broad, but it should not become the only place where business logic lives.

## Application Lifecycle

The FastAPI app is created with a lifespan hook. Startup and shutdown responsibilities include:

- Preparing app runtime state.
- Wiring static frontend serving.
- Resetting or cleaning process-backed session state when the app exits.
- Keeping browser-facing routes available for both development and desktop builds.

The custom `NoCacheStaticFiles` helper prevents stale frontend assets from lingering during development and packaged-app updates.

## Route Groups

The main route groups are:

- Shell pages: `/`, `/chat`, and `/wiki` serve the frontend application shell.
- Health and settings: `/api/health`, `/api/settings`, `/api/settings/diagnostics`, `/api/settings/security`, `/api/settings/knowledge-base`, `/api/settings/startup/complete`, `/api/settings/model-providers`, `/api/settings/pi-login`, and `/api/settings/pi-install`.
- Chat compatibility: `/api/chat`, `/api/chat/stream`, `/api/legacy/chat`, and `/api/legacy/chat/stream`.
- Session chat: `/api/sessions`, `/api/sessions/{session_id}`, `/settings`, `/stats`, `/compact`, `/history`, `/abort`, `/extension-ui-response`, and `/chat/stream`.
- Knowledge-base browsing: `/api/wiki/pages`, `/api/wiki/tree`, `/api/wiki/page`, `/api/wiki/search`, `/api/raw/files`, `/api/raw/file`, `/api/raw/search`, and raw download routes.
- Markdown browser operations: `/api/markdown-file` creates, updates, and deletes markdown files across supported sources.
- Capability editing: `/api/knowledge-base/skills`, `/api/knowledge-base/slash-commands`, `/api/knowledge-base/capabilities`, and `/api/knowledge-base/capability-file`.
- Inbox and upload: `/api/knowledge-base/inbox/upload`, `/api/knowledge-base/inbox/files`, `/api/inbox/files`, `/api/inbox/file`, `/api/inbox/search`, and `/inbox/file`.
- Pi options and provider setup: `/api/pi/options`, provider upsert/delete routes, and desktop Pi login/install helpers.

Route handlers should keep response shapes stable. If a frontend component depends on a field, either preserve it or update the corresponding frontend and documentation together.

## Main Function Call Chains

### FastAPI Startup

```text
app = FastAPI(..., lifespan=lifespan)
  -> lifespan()
  -> get_session_pool()
  -> SessionPool.start_cleanup_loop()
  -> reset_session_pool() on shutdown
```

`main.py` owns the ASGI app object and the lifecycle hook. `session_manager.py` owns the session pool that lifecycle prepares and resets.

### Settings and Diagnostics

```text
get_app_settings()
  -> get_knowledge_base_settings()
  -> get_model_provider_settings()
  -> _get_pi_install_status()
  -> get_startup_settings()

get_settings_diagnostics()
  -> _build_settings_diagnostics()
  -> get_knowledge_base_settings()
  -> get_session_pool()
  -> get_model_provider_settings()
  -> get_pi_security_settings()
  -> _get_pi_install_status()
```

Settings returns state used to render the app. Diagnostics returns a broader read-only operational snapshot for debugging paths, Pi, sessions, providers, and security.

### Knowledge-Base Switching

```text
update_knowledge_base()
  -> reset_session_pool()
  -> set_knowledge_base_dir()
  -> get_startup_settings()
```

The pool is reset before switching because sessions and Pi RPC directories are namespaced by the active knowledge base.

### Provider and Security Settings

```text
save_model_provider()
  -> upsert_model_provider_profile()
  -> get_model_provider_settings()

remove_model_provider()
  -> delete_model_provider_profile()
  -> get_model_provider_settings()

update_settings_security()
  -> update_pi_security_settings()
  -> reset_session_pool()

create_settings_security_approval()
  -> create_pi_security_approval()
```

Provider settings change generated provider extensions. Security mode changes reset the session pool so future Pi RPC launches load the current managed security extension.

### Wiki, Raw, Inbox, and Markdown Browser

```text
wiki_pages() / wiki_page() / wiki_search()
  -> list_pages() / get_page() / search_pages()

raw_files() / raw_file() / raw_search()
  -> list_raw_files() / get_raw_file() / search_raw_files()

inbox_browser_files() / inbox_browser_file() / inbox_browser_search()
  -> _list_inbox_browser_items()
  -> _get_inbox_browser_item()
  -> _search_inbox_browser_items()

create_markdown_browser_file()
  -> _create_markdown_browser_file()
  -> create_page() or create_raw_file() or _create_inbox_markdown_file()

update_markdown_browser_file()
  -> _save_markdown_browser_file()
  -> save_page() or save_raw_file() or _save_inbox_markdown_file()

delete_markdown_browser_file()
  -> _delete_markdown_browser_file()
  -> delete_page() or delete_raw_file() or _delete_inbox_markdown_file()
```

`wiki_service.py` and `raw_service.py` own source-specific filesystem behavior. Inbox behavior currently lives in `main.py` helper functions.

### Capability Routes

```text
knowledge_base_slash_commands()
  -> list_slash_commands()

knowledge_base_capabilities()
  -> list_capability_entries()

knowledge_base_capability_file()
  -> get_capability_file()

update_knowledge_base_capability_file()
  -> save_capability_file()

create_knowledge_base_capability_file()
  -> create_capability_file()

delete_knowledge_base_capability_file()
  -> delete_capability_file()
```

The route layer stays thin here; `skill_service.py` owns capability discovery, templates, and path validation.

### Chat and Session Routes

```text
chat_stream()
  -> stream_session_chat()
  -> SessionPool.send_message_async()

session_chat_stream()
  -> get_session_pool()
  -> pool.get_session()
  -> pool.send_message_async()

create_session()
  -> get_session_pool()
  -> pool.create_session()
  -> _session_payload_with_runtime()

update_session_settings()
  -> pool.update_session_settings()
  -> _session_payload_with_runtime()

get_session_history()
  -> pool.replay_history()

abort_session_response()
  -> pool.abort_pending_request()

respond_session_extension_ui()
  -> pool.respond_extension_ui_request()
```

`/api/chat/stream` is still a session-aware compatibility route used by the frontend. `/api/sessions/{session_id}/chat/stream` is the more explicit session-scoped route.

### Desktop Pi Helpers

```text
start_pi_login()
  -> is_desktop_runtime()
  -> get_pi_command_path()
  -> _post_to_desktop_bridge("/desktop-login", {})
     or _start_desktop_pi_login_direct()

install_pi()
  -> _post_to_desktop_bridge("/install-pi", {})

_start_desktop_pi_login_direct()
  -> _build_direct_pi_shell_command()
     or _build_direct_pi_powershell_command()
     or _build_direct_pi_cmd_command()
  -> platform-specific terminal launch
```

The backend-to-desktop bridge is only for desktop runtime operations that require local OS integration.

## Request Models

Pydantic models in this file describe API payloads close to the route handlers that consume them. Important models include:

- `ChatRequest`, `LegacyChatRequest`, and `SessionChatRequest` for chat entry points.
- `CreateSessionRequest`, `UpdateSessionRequest`, `UpdateSessionSettingsRequest`, and `CompactSessionRequest` for session operations.
- `UpdateKnowledgeBaseRequest`, `UpdatePiSecurityRequest`, `CreatePiSecurityApprovalRequest`, and `UpsertModelProviderRequest` for settings.
- `CapabilityFileUpdateRequest` and `CreateCapabilityFileRequest` for skills and schemas.
- `WikiPageCreateRequest`, `WikiPageUpdateRequest`, `MarkdownBrowserFileCreateRequest`, and `MarkdownBrowserFileUpdateRequest` for markdown editing.

Keeping these models close to their routes makes the API surface discoverable, but shared validation should move into service modules if it becomes complex.

## Inbox and Markdown Browser

The inbox helpers implement a second file browser for incoming documents. They normalize file names, prevent path traversal, infer content type, decide render modes, and generate ingest prompts for moving inbox files into the knowledge base.

The Markdown browser helpers provide create/save/delete operations for wiki, raw, and inbox sources. Source validation lives in `main.py` because it coordinates multiple service modules.

## Desktop Integrations

This file includes desktop fallback behavior for:

- Starting Pi login in a local terminal when the desktop bridge is unavailable.
- Checking whether a local managed Pi command exists.
- Building shell, `cmd`, and PowerShell commands for different platforms.
- Posting to the Tauri desktop bridge when available.

Those helpers should stay isolated from normal web/development API behavior.

## Dependencies

`main.py` composes:

- [`config.py`](config.md) for runtime, settings, knowledge-base, Pi, and provider configuration.
- [`security_service.py`](security_service.md) for security settings and approvals.
- [`wiki_service.py`](wiki_service.md), [`raw_service.py`](raw_service.md), and [`skill_service.py`](skill_service.md) for knowledge-base APIs.
- [`agent_service.py`](agent_service.md) for legacy chat compatibility.
- [`session_manager.py`](session_manager.md) for persistent session chat.

## Change Notes

When adding a route, first decide whether it is a pure API wrapper over an existing service or whether a new service function is needed. Avoid putting large domain algorithms directly in route handlers; route handlers should validate input, call services, and shape HTTP responses.

## Request and Response Models

- `ChatTurn`: One legacy chat history turn with `role` and `content`.
- `ChatRequest`: Session chat request used by `/api/chat` and `/api/chat/stream`; requires `message` and `session_id`.
- `SessionChatRequest`: Session route chat request used by `/api/sessions/{session_id}/chat/stream`; requires only the new `message`.
- `LegacyChatRequest`: Deprecated no-session chat request with `message`, `history`, and optional `request_id`.
- `CreateSessionRequest`: Payload for creating a session with optional title, system prompt, thinking level, provider, and model.
- `UpdateSessionRequest`: Payload for renaming a session.
- `UpdateSessionSettingsRequest`: Payload for changing session thinking level and/or model provider/model.
- `CompactSessionRequest`: Payload for running Pi compaction with optional custom instructions.
- `UpdateKnowledgeBaseRequest`: Payload for switching the active local knowledge-base path.
- `UpdatePiSecurityRequest`: Payload for changing Pi security mode.
- `CreatePiSecurityApprovalRequest`: Payload for a temporary approval of a blocked Pi tool action.
- `ExtensionUiResponseRequest`: Payload used to answer or cancel a pending Pi extension UI request.
- `UpsertModelProviderRequest`: Payload for saving API or OAuth provider configuration.
- `CapabilityFileUpdateRequest`: Payload for saving an existing capability file.
- `CreateCapabilityFileRequest`: Payload for creating a new skill or schema.
- `WikiPageUpdateRequest`: Payload for updating wiki Markdown content.
- `WikiPageCreateRequest`: Payload for creating a wiki page.
- `MarkdownBrowserFileCreateRequest`: Payload for creating a Markdown file in `wiki`, `raw`, or `inbox`.
- `MarkdownBrowserFileUpdateRequest`: Payload for updating a Markdown file in `wiki`, `raw`, or `inbox`.

## Helper Function Reference

- `_safe_path_payload(path)`: Builds a diagnostics payload for a local path, including existence and directory status.
- `_desktop_bridge_url()`: Reads the Tauri desktop bridge URL from the environment.
- `_post_to_desktop_bridge(path, payload)`: Sends a JSON POST request to the local desktop bridge and normalizes bridge errors.
- `_shell_quote(value)`: Quotes shell values for POSIX terminal commands.
- `_build_direct_pi_shell_command()`: Builds the macOS/Linux fallback shell command that starts Pi with managed extensions.
- `_normalize_windows_shell_value(value)`: Removes Windows extended-path prefixes for terminal compatibility.
- `_windows_cmd_quote(value)`: Quotes values for `cmd.exe`.
- `_is_windows_batch_script(value)`: Detects `.cmd` or `.bat` Pi launch scripts.
- `_build_direct_pi_cmd_command()`: Builds the Windows `cmd.exe` fallback command for starting Pi.
- `_windows_powershell_quote(value)`: Quotes values for PowerShell commands.
- `_build_direct_pi_powershell_command()`: Builds the PowerShell fallback command for starting Pi.
- `_run_windows_login_shell_keep_open(shell_command, cmd_fallback)`: Opens a Windows console and keeps it alive for manual Pi login.
- `_run_osascript_lines(lines)`: Runs AppleScript lines through `osascript` and raises a readable error on failure.
- `_applescript_escape(value)`: Escapes strings embedded inside AppleScript commands.
- `_start_desktop_pi_login_direct()`: Opens a local terminal to run Pi login when the Tauri bridge is unavailable.
- `_local_pi_install_status()`: Builds local Pi install/status diagnostics without using the desktop bridge.
- `_get_pi_install_status()`: Reads Pi install status from the desktop bridge when available, otherwise uses local fallback status.
- `_build_settings_diagnostics()`: Aggregates health, knowledge-base, session, provider, security, Pi runtime, and install diagnostics.
- `lifespan(_app)`: Starts the session cleanup loop on app startup and resets the session pool on shutdown.
- `_dump_turn(turn)`: Converts a Pydantic `ChatTurn` to a dict across Pydantic versions.
- `_resolve_request_id(raw_request_id)`: Uses a caller-provided request id or generates a UUID.
- `_normalize_context_usage(raw_usage)`: Normalizes token/context-window/percent stats for frontend consumption.
- `_session_payload_with_runtime(session_id, pool)`: Combines persisted session metadata with live runtime stats.
- `_frontend_file_response(path)`: Serves frontend files with no-cache headers.
- `_safe_inbox_filename(raw_name)`: Validates upload filenames and allowed extensions.
- `_allocate_inbox_path(inbox_dir, filename)`: Finds a non-conflicting inbox file path.
- `_build_ingest_prompt(inbox_relative_path, knowledge_base_name)`: Builds the prompt suggested after an inbox upload.
- `_inbox_type_info(path)`: Maps inbox file suffixes to semantic kind and UI label.
- `_should_show_inbox_file(path, inbox_dir)`: Filters hidden/readme-like inbox files from browser listings.
- `_inbox_item_payload(path, inbox_dir, knowledge_base_name)`: Builds the frontend-facing inbox item payload.
- `_resolve_inbox_path(raw_path, inbox_dir)`: Resolves an existing inbox file and rejects traversal outside `inbox/`.
- `_resolve_inbox_target_path(raw_path, inbox_dir)`: Resolves an inbox Markdown create/save target.
- `_write_text_file(path, content)`: Writes normalized text through a temp file and atomic replace.
- `_guess_inbox_content_type(path)`: Infers MIME type for an inbox file.
- `_is_inbox_textual(path)`: Checks whether an inbox file can be read as text.
- `_read_inbox_text(path)`: Reads an inbox text file with replacement for invalid UTF-8.
- `_summary_from_text(text)`: Extracts a lightweight summary from text.
- `_inbox_summary(path)`: Builds an inbox summary from text or file type.
- `_inbox_render_mode(path, content_type)`: Chooses frontend render mode: markdown, text, pdf, image, or binary.
- `_knowledge_base_name_for_inbox(kb_dir)`: Resolves the display name used in inbox ingest prompts.
- `_list_inbox_browser_items(include_content)`: Lists inbox browser records, optionally including text content.
- `_get_inbox_browser_item(raw_path, include_content)`: Returns one inbox browser record.
- `_search_inbox_browser_items(query, limit)`: Searches inbox title, path, summary, type, kind, and text content.
- `_normalize_markdown_browser_source(source)`: Validates Markdown browser source as `wiki`, `raw`, or `inbox`.
- `_create_inbox_markdown_file(relative_path, content)`: Creates a Markdown file inside `inbox/`.
- `_save_inbox_markdown_file(relative_path, content)`: Updates an existing inbox Markdown file.
- `_delete_inbox_markdown_file(relative_path)`: Deletes an inbox Markdown file and prunes empty parent directories.
- `_create_markdown_browser_file(source, relative_path, content)`: Dispatches Markdown creation to wiki, raw, or inbox services.
- `_save_markdown_browser_file(source, relative_path, content)`: Dispatches Markdown saving to wiki, raw, or inbox services.
- `_delete_markdown_browser_file(source, relative_path)`: Dispatches Markdown deletion to wiki, raw, or inbox services.

## Route Function Reference

- `landing_page()`: Serves the frontend app shell at `/`.
- `chat_page()`: Serves the frontend app shell at `/chat`.
- `wiki_page_shell()`: Serves the frontend app shell at `/wiki`.
- `healthcheck()`: Returns basic API health, active knowledge-base information, and agent backend status.
- `get_app_settings()`: Returns knowledge-base, provider, Pi install, and startup settings.
- `get_settings_diagnostics()`: Returns the full diagnostics payload from `_build_settings_diagnostics()`.
- `update_settings_security(request)`: Updates Pi security mode and resets sessions so new rules take effect.
- `create_settings_security_approval(request)`: Creates a one-time security approval for a blocked Pi action.
- `update_knowledge_base(request)`: Switches the active knowledge base and resets session state.
- `finish_startup_onboarding()`: Marks first-run onboarding complete.
- `save_model_provider(request)`: Upserts a provider profile and returns updated provider settings.
- `remove_model_provider(provider_key)`: Deletes a provider profile and returns updated provider settings.
- `start_pi_login()`: Starts desktop Pi login through the bridge or terminal fallback.
- `install_pi()`: Starts desktop Pi installation through the bridge.
- `chat_suggestions()`: Returns static starter prompts for the chat UI.
- `upload_inbox_file(request)`: Streams an uploaded file into `knowledge-base/inbox`, enforces size/type limits, and returns ingest metadata.
- `inbox_files()`: Lists inbox files in the knowledge-base settings namespace.
- `inbox_browser_files()`: Lists inbox files for the generic inbox browser.
- `inbox_browser_file(path)`: Returns one inbox browser item with content when available.
- `inbox_browser_search(q, limit)`: Searches inbox browser items.
- `delete_inbox_file(path)`: Deletes an uploaded inbox file.
- `pi_options()`: Returns runtime model options and thinking levels from Pi.
- `chat(request)`: Runs non-streaming session chat through the compatibility `/api/chat` route.
- `chat_stream(request)`: Streams session chat through the compatibility `/api/chat/stream` route as NDJSON.
- `session_event_stream()`: Nested generator inside `chat_stream()` that adapts session events into newline-delimited JSON records.
- `legacy_chat(request)`: Runs deprecated no-session chat and returns deprecation headers.
- `legacy_chat_stream(request)`: Streams deprecated no-session chat and returns deprecation headers.
- `event_stream()`: Nested generator used by legacy/session streaming routes to serialize async chat events as NDJSON.
- `wiki_pages()`: Lists wiki page summaries.
- `wiki_tree()`: Returns the wiki sidebar tree.
- `wiki_page(path)`: Returns one wiki page with content.
- `wiki_search(q, limit)`: Searches wiki pages.
- `create_wiki_page(payload)`: Creates one wiki page.
- `create_markdown_browser_file(payload)`: Creates a Markdown file in wiki, raw, or inbox.
- `update_markdown_browser_file(payload)`: Updates a Markdown file in wiki, raw, or inbox.
- `delete_markdown_browser_file(source, path)`: Deletes a Markdown file in wiki, raw, or inbox.
- `update_wiki_page(payload, path)`: Updates one wiki page.
- `raw_files()`: Lists raw file records.
- `knowledge_base_skills()`: Returns slash-command-style capability entries for skills/schemas.
- `knowledge_base_slash_commands()`: Returns slash commands for chat input.
- `knowledge_base_capabilities()`: Returns the capability editor tree.
- `knowledge_base_capability_file(path)`: Reads one capability file.
- `update_knowledge_base_capability_file(payload)`: Saves one capability file.
- `create_knowledge_base_capability_file(payload)`: Creates a skill or schema capability file.
- `delete_knowledge_base_capability_file(path)`: Deletes a skill or schema capability file.
- `raw_file(path)`: Returns one raw file record with content when textual.
- `raw_search(q, limit)`: Searches raw files.
- `raw_file_download(path)`: Serves a raw file for preview/download.
- `inbox_file_download(path)`: Serves an inbox file for preview/download.
- `list_sessions()`: Lists active/restored sessions for the current knowledge base.
- `create_session(request)`: Creates a new Pi RPC session and returns runtime metadata.
- `destroy_session(session_id)`: Deletes a session, its native session file, app turn history, and registry entry.
- `rename_session(session_id, request)`: Updates a session title.
- `update_session_settings(session_id, request)`: Updates thinking level and/or model settings for an idle session.
- `get_session(session_id)`: Returns one session with runtime stats.
- `get_session_stats(session_id)`: Returns context and token usage stats.
- `compact_session(session_id, request)`: Runs Pi session compaction and returns updated usage stats.
- `get_session_history(session_id, limit, offset)`: Replays session history with pagination from latest messages backward.
- `abort_session_response(session_id)`: Aborts the current response for a session.
- `respond_session_extension_ui(session_id, request)`: Sends a frontend extension UI answer back to Pi.
- `session_chat_stream(session_id, request)`: Streams primary session chat as NDJSON.
