# `app/backend/session_manager.py`

Source: [`app/backend/session_manager.py`](../../../app/backend/session_manager.py)

`session_manager.py` is the main session orchestration layer for Pi RPC chat.

## Role

This module owns the primary chat path. It persists app-level session metadata, tracks rich turn history, reconnects to Pi native session files for each operation, and translates Pi protocol events into the frontend stream used by the chat workbench.

Legacy no-session compatibility remains in [`agent_service.py`](agent_service.md). New session behavior should normally be implemented here.

## Core Types

- `SessionInfo` is the persisted metadata record for one chat session, including title, creation/update timestamps, knowledge-base namespace, model provider, thinking level, and context usage.
- `SessionProcess` wraps a live Pi RPC client plus runtime state for one session.
- `SessionPool` manages the registry, live processes, session creation/destruction, chat execution, history, compaction, aborts, and extension UI responses.

`get_session_pool()` exposes the singleton pool used by FastAPI routes. `reset_session_pool()` is used for lifecycle cleanup and tests.

## Persistence Model

Session metadata is persisted outside the user's knowledge base in app-managed state. The registry file tracks sessions and their settings, while rich turn history is stored separately so the frontend can recover prior turns with traces, context usage, and error state.

The session namespace is tied to the active knowledge base. This prevents sessions from one local workspace from being mixed into another workspace's chat list.

## Process Model

Each tracked session owns a durable Pi native `sessionFile` path plus Gogo metadata. `SessionPool` does not keep a Pi RPC client alive across idle turns. Instead, operations such as bootstrap, model changes, stats, compaction, history replay, and streaming chat create a short-lived [`PiRpcClient`](pi_rpc_client.md), switch to the stored native session file when needed, perform the command, and close the subprocess when the operation ends.

Pi launch arguments combine:

- Base Pi RPC command settings from [`config.py`](config.md).
- Thinking level and model provider session settings.
- Managed provider extension args from `config.py`.
- Managed security extension args from [`security_service.py`](security_service.md).
- Session-specific RPC identifiers and directories.

## Main Function Call Chains

### Pool Startup and Restore

```text
get_session_pool()
  -> SessionPool.__init__()
  -> get_pi_rpc_session_dir()
  -> _load_registry()
  -> _restore_sessions_from_registry()
  -> SessionProcess(...)
```

`_restore_sessions_from_registry()` recreates lightweight session records from app state. It does not start Pi. Pi is launched later by the operation that needs it.

### Create Session

```text
SessionPool.create_session()
  -> SessionProcess(...)
  -> _bootstrap_rpc_session()
  -> PiRpcClient(...)
  -> client.get_state()
  -> client.new_session()
  -> client.set_model() when requested
  -> client.set_thinking_level()
  -> client.set_session_name() when requested
  -> client.get_state()
  -> _sync_session_from_state()
  -> _sync_registry_from_session()
```

This chain creates both identities: the Gogo `session_id` and the Pi native session file path.

### Streaming Chat

```text
send_message_async()
  -> get_session()
  -> _stream_rpc_request()
  -> acquire session.lock
  -> PiRpcClient(...)
  -> client.switch_session(session.session_file)
  -> client.set_session_name() when needed
  -> client.prompt_events(message)
  -> _rpc_trace_item_from_event() / text and thinking normalization
  -> _persist_exchange_turns()
  -> _sync_registry_from_session()
  -> release session.lock
```

`_stream_rpc_request()` is the main state machine. It owns pending request state, active extension UI waiters, abort state, trace accumulation, final/error event shaping, and cleanup.

### Settings, Stats, and Compact

```text
update_session_settings()
  -> PiRpcClient(...)
  -> client.switch_session()
  -> client.set_model()
  -> client.set_thinking_level()
  -> client.get_state()
  -> _sync_session_from_state()
  -> _sync_registry_from_session()

get_session_stats()
  -> PiRpcClient(...)
  -> client.switch_session()
  -> client.get_session_stats()

compact_session()
  -> PiRpcClient(...)
  -> client.switch_session()
  -> client.compact()
  -> client.get_session_stats()
  -> client.get_state()
```

All three chains are short-lived RPC operations over the persisted Pi native session file.

### Abort and Extension UI

```text
abort_pending_request()
  -> mark session.abort_requested
  -> active_loop.call_soon_threadsafe(...)
  -> active_rpc_client.send_extension_ui_response(cancelled=True) when needed
  -> active_rpc_client.abort()

respond_extension_ui_request()
  -> validate active request id
  -> asyncio.run_coroutine_threadsafe(...)
  -> active_rpc_client.send_extension_ui_response()
  -> _clear_extension_ui_wait()
```

These functions are the exception to the short-lived operation model: they talk to the currently active `PiRpcClient` owned by the in-flight `_stream_rpc_request()`.

### History Replay

```text
replay_history()
  -> _load_history_from_app_turns()
  -> _app_turns_fast_path_is_safe()
  -> _load_history_via_rpc()
  -> _load_history_from_native_jsonl()
  -> _merge_rich_history_tail()
  -> _merge_rich_history_by_user_turns()
  -> _slice_history_window()
```

The replay path prefers Gogo rich app turns because they preserve trace, warnings, stopped state, and consulted pages. Pi history is still used as a fallback or alignment source.

## Chat Flow

The streaming chat flow is roughly:

- Resolve or create the session process.
- Build the Pi RPC prompt request from frontend messages and session settings.
- Send the request through the session's Pi RPC client.
- Stream Pi events back to the frontend as normalized app events.
- Persist the completed app turn with assistant text, traces, context usage, and errors.
- Update session metadata such as title, timestamps, and context window stats.

The non-streaming helpers follow the same session model but collect the final assistant response before returning.

## Event Normalization

The session stream converts low-level Pi events into UI-facing events for:

- Assistant text deltas and final text.
- Tool traces and tool result summaries.
- Context window usage.
- Extension UI requests that require frontend/user response.
- Security interruptions and approval-related failures.
- Request completion, cancellation, and errors.

This translation layer is why the frontend can remain mostly independent from Pi's raw RPC protocol.

## Session Operations

`SessionPool` also supports:

- Listing sessions for the active knowledge base.
- Creating, renaming, and deleting sessions.
- Updating per-session settings.
- Returning session detail and runtime stats.
- Compacting a session when context pressure grows.
- Returning persisted history for restoration.
- Aborting the current response.
- Forwarding extension UI responses back into the running Pi request.

## Dependencies

This module composes [`config.py`](config.md), [`pi_rpc_client.py`](pi_rpc_client.md), and [`security_service.py`](security_service.md). It is exposed through session routes in [`main.py`](main.md).

## Change Notes

Avoid duplicating state between `SessionInfo`, rich turn files, and live `SessionProcess` fields. When adding new frontend-visible session data, decide where it belongs: persisted metadata, per-turn history, live runtime stats, or transient stream events.

## Module-Level Function Reference

- `_pi_rpc_extra_args(*args)`: Combines caller-provided Pi CLI args with managed provider extension args and managed security extension args.
- `_run_coro_sync(coro)`: Runs an async coroutine from synchronous code, using a worker thread when already inside an event loop.
- `get_session_pool()`: Returns the global `SessionPool`, creating it lazily.
- `reset_session_pool()`: Stops cleanup, clears pending request flags, syncs registry metadata, and drops the global pool.

## Data Class Reference

- `SessionInfo`: Persisted, UI-facing session metadata such as session id, timestamps, title, pending state, model, and thinking level.
- `SessionInfo.to_dict()`: Converts session metadata into the response shape expected by the frontend.
- `SessionProcess`: Runtime wrapper for one session, including native Pi session file path, workdir, lock, active RPC client, abort state, and extension UI wait state.
- `SessionProcess.__post_init__()`: Ensures nested `SessionInfo` mirrors the owning session id and thinking level.

## SessionPool Architecture

`SessionPool` is the state machine for session chat. It has four main responsibilities:

- Registry state: load, save, restore, and remove session metadata.
- Runtime process state: start Pi RPC sessions, reuse live clients during requests, abort active work, and clean idle sessions when configured.
- History state: persist rich Gogo turn metadata and merge it with native Pi history during replay.
- Stream state: translate Pi RPC events into frontend events, including assistant text, thinking deltas, traces, extension UI prompts, final events, and errors.

## SessionPool Lifecycle and Registry Methods

- `SessionPool.__init__(max_sessions, idle_timeout)`: Initializes pool settings, session directories, turn history directory, registry file, registry data, and restored sessions.
- `SessionPool._load_registry()`: Reads `gogo-session-registry.json` and returns a dict keyed by session id.
- `SessionPool._save_registry()`: Writes registry metadata atomically-ish through a temp file replacement.
- `SessionPool._sync_registry_from_session(session, force_save)`: Copies live session metadata into the registry and saves immediately or on a throttle.
- `SessionPool._remove_registry_session(session_id)`: Removes one registry record and saves the registry.
- `SessionPool._restore_sessions_from_registry()`: Recreates lightweight `SessionProcess` objects from persisted registry records at startup.
- `SessionPool._evict_oldest()`: Removes the oldest idle session when `max_sessions` is configured.
- `SessionPool.get_session(session_id)`: Returns a session, updates `last_used_at`, and touches the registry.
- `SessionPool.list_sessions()`: Returns sessions sorted by most recently used.
- `SessionPool.get_session_count()`: Returns the number of sessions currently tracked by the pool.
- `SessionPool._delete_native_session_file(session)`: Deletes the native Pi session file for a destroyed session.
- `SessionPool.destroy_session(session_id)`: Removes a session from memory, deletes native/app history files, and removes registry metadata.
- `SessionPool.cleanup_idle()`: Deletes idle sessions when `idle_timeout` is configured.
- `SessionPool.start_cleanup_loop(interval)`: Starts the async periodic idle cleanup task when idle cleanup is enabled.
- `SessionPool.stop_cleanup_loop()`: Cancels the cleanup task.

## Session Creation and Settings Methods

- `SessionPool.create_session(...)`: Creates a new app session, bootstraps a native Pi RPC session, stores metadata, and returns the session id.
- `SessionPool._model_label_from_parts(provider, model_id, name)`: Builds a display label for the selected provider/model.
- `SessionPool._sync_session_from_state(session, state)`: Copies Pi state fields such as session name, thinking level, and model into `SessionInfo`.
- `SessionPool._bootstrap_rpc_session(session)`: Starts a short-lived Pi RPC client, creates a native session, applies model/thinking/title settings, and records the session file path.
- `SessionPool.get_runtime_options()`: Starts a short-lived Pi RPC client to load current Pi state and available models.
- `load_options()`: Nested coroutine inside `get_runtime_options()` that opens the temporary RPC client and fetches state/models.
- `SessionPool.update_session_settings(session_id, thinking_level, model_provider, model_id)`: Switches to a native session and updates model/thinking settings when no request is pending.
- `update_settings()`: Nested coroutine inside `update_session_settings()` that switches the native session and applies model/thinking commands.
- `SessionPool.get_session_stats(session_id)`: Switches to a native session and returns Pi context/token usage stats.
- `load_stats()`: Nested coroutine inside `get_session_stats()` that opens a temporary RPC client, switches session, and calls `get_session_stats`.
- `SessionPool.compact_session(session_id, custom_instructions)`: Switches to a native session, runs Pi compaction, reloads stats/state, and syncs session metadata.

## App Turn History Methods

- `SessionPool._turns_file(session_id)`: Returns the app-managed JSONL file path for rich Gogo turn history.
- `SessionPool._file_mtime(path)`: Safely reads a file modification timestamp.
- `SessionPool._normalize_history_turn(turn)`: Validates and normalizes one persisted user/assistant turn with optional trace, warnings, consulted pages, and stopped state.
- `SessionPool._append_app_turns(session_id, turns)`: Appends normalized user/assistant turns to the app-managed JSONL turn log.
- `SessionPool._slice_history_window(history, max_turns, offset_turns)`: Applies latest-first pagination parameters to a history list.
- `SessionPool._read_app_turn_tail_lines(path, max_lines)`: Reads the tail of a large JSONL turn file without loading the whole file.
- `SessionPool._load_history_from_app_turns(session_id, max_turns, offset_turns)`: Loads rich Gogo turn history from app-managed JSONL.
- `SessionPool._app_turns_fast_path_is_safe(session, app_turns, max_turns, offset_turns)`: Decides whether app turn history is fresh enough to use without falling back to native Pi history.
- `SessionPool._persist_exchange_turns(session, user_message, assistant_event)`: Persists one user turn and one assistant terminal event after a chat exchange.
- `SessionPool._merge_rich_history_tail(base_history, app_turns)`: Replaces a matching tail of native history with richer app turn records.
- `SessionPool._user_turns_with_indices(turns)`: Extracts user message positions and content for history alignment.
- `SessionPool._merge_rich_history_by_user_turns(base_history, app_turns)`: Aligns app history with native history by matching recent user turns.
- `SessionPool._history_from_agent_messages(messages, max_turns)`: Converts Pi message payloads into simple user/assistant history turns.
- `SessionPool._load_history_via_rpc(session, max_turns, offset_turns)`: Loads native session messages through Pi RPC when the session is available and unlocked.
- `fetch_messages()`: Nested coroutine inside `_load_history_via_rpc()` that switches to the native session and fetches Pi messages.
- `SessionPool._load_history_from_native_jsonl(session_file, max_turns, offset_turns)`: Reconstructs a native Pi message chain from the session JSONL file without starting Pi.
- `SessionPool.replay_history(session_id, max_turns, offset_turns)`: Returns the best available history, preferring safe app-turn fast path, then native JSONL/RPC merged with rich app metadata.

## Event and Trace Normalization Methods

- `SessionPool._extract_text_from_content(content)`: Extracts text from string or typed content-block arrays.
- `SessionPool._extract_assistant_text_from_messages(messages)`: Finds the latest assistant text across Pi messages.
- `SessionPool._extract_assistant_text_from_message(message)`: Extracts assistant text from one message.
- `SessionPool._normalize_tool_action(tool_name)`: Maps low-level tool names into UI action categories.
- `SessionPool._short_trace_text(value, max_length)`: Normalizes and truncates trace text for compact UI display.
- `SessionPool._trace_path_from_args(args)`: Finds a likely path argument in a tool-call argument object.
- `SessionPool._trace_search_query_from_args(args)`: Finds a likely query/pattern argument in a tool-call argument object.
- `SessionPool._describe_tool_trace(tool_name, args)`: Converts a tool event into action, title, and display detail.
- `SessionPool._rpc_trace_item_from_event(event)`: Converts Pi tool/error/extension events into frontend trace items.
- `SessionPool._stringify_rpc_error_detail(value, max_length)`: Extracts readable error text from nested RPC payloads.
- `SessionPool._parse_security_reason(detail)`: Parses `[gogo-security]` JSON payloads into readable messages and structured security metadata.
- `SessionPool._extract_rpc_error_detail_from_message(message)`: Extracts error detail from one Pi message.
- `SessionPool._extract_rpc_error_detail_from_event(event)`: Extracts error detail from a Pi stream event.
- `SessionPool._no_visible_text_message(raw_error_detail)`: Builds a fallback final message when Pi produces no visible assistant text.
- `SessionPool._user_aborted_terminal_event(session, trace, streamed_text_chunks)`: Builds the final event used when the user aborts a response.

## Extension UI and Abort Methods

- `SessionPool._extension_ui_timeout_seconds(request)`: Converts an extension UI timeout field into seconds, falling back to the default.
- `SessionPool._begin_extension_ui_wait(session, request)`: Registers the active extension UI request and creates a future that will be completed by the frontend response.
- `SessionPool._clear_extension_ui_wait(session, request_id)`: Clears the active extension UI request and returns its waiter when ids match.
- `SessionPool.abort_pending_request(session_id)`: Marks the current request aborted, cancels any pending extension UI request, sends Pi abort, and returns status.
- `schedule_abort()`: Nested callback inside `abort_pending_request()` scheduled onto the active event loop thread.
- `run_abort()`: Nested coroutine inside `schedule_abort()` that cancels pending extension UI and sends Pi's abort command.
- `SessionPool.respond_extension_ui_request(session_id, payload)`: Validates a frontend extension UI answer and sends it to the active Pi RPC client.
- `run_response()`: Nested coroutine inside `respond_extension_ui_request()` that sends the extension UI response on the active RPC client.

## Chat Execution Methods

- `SessionPool._stream_rpc_request(session, message, request_id)`: Core streaming state machine; switches/starts Pi RPC, sends the prompt, yields frontend events, persists terminal turns, handles aborts, timeouts, security errors, extension UI, and cleanup.
- `flush_pending_thinking()`: Nested helper inside `_stream_rpc_request()` that batches accumulated thinking deltas into a trace item before visible events are emitted.
- `SessionPool.send_message(session_id, message, stream, request_id)`: Synchronous entry point; returns a stream-ok marker for streaming mode or gathers the final event for non-streaming mode.
- `gather_final()`: Nested coroutine inside `send_message()` that consumes the stream until a final or error event is produced.
- `SessionPool.send_message_async(session_id, message, request_id)`: Async generator entry point used by FastAPI streaming routes.
