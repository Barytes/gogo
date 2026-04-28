# `app/backend/agent_service.py`

Source: [`app/backend/agent_service.py`](../../../app/backend/agent_service.py)

`agent_service.py` contains the legacy no-session chat path and compatibility wrappers around Pi RPC chat.

## Role

This module exists because early Gogo chat behavior did not have persistent Pi sessions. It still supports that no-session path, while delegating the session-first flow to [`session_manager.py`](session_manager.md).

Keep this file focused on compatibility and event normalization. It should not grow into a second session registry or long-lived process manager.

## Main Responsibilities

- Report basic agent backend status through `get_agent_backend_status()`.
- Collect lightweight app-side context from wiki and raw files before a legacy prompt is sent.
- Build the no-session prompt format that tells Pi what context Gogo has already gathered.
- Convert Pi RPC events into frontend chat events with stable `type`, `text`, `trace`, and error payloads.
- Normalize tool traces from Pi events so the UI can show read/search/edit/bash activity in a compact way.
- Convert security interruption details into user-facing messages instead of exposing raw protocol payloads.
- Provide compatibility entry points used by `main.py`: `run_agent_chat()`, `stream_agent_chat()`, `run_session_chat()`, and `stream_session_chat()`.

## Legacy Context Flow

The legacy path performs a small amount of retrieval before calling Pi:

- `_collect_context()` searches wiki pages and raw files for the incoming message.
- `_build_pi_prompt()` embeds the selected context and conversation turns into a prompt.
- `_prepare_rpc_request()` converts request data into the Pi RPC payload and adds extension/security arguments.
- `_run_pi_rpc_agent_chat_async()` runs a complete non-streaming call and extracts final assistant text.
- `_stream_pi_rpc_chat()` yields incremental event dictionaries for Server-Sent Events.

This retrieval is intentionally simple. Gogo's design leans on the local llm-wiki filesystem plus Pi's own file-reading capability rather than a separate RAG pipeline.

## Event Normalization

Pi RPC emits lower-level protocol events. The frontend expects a smaller app-level event vocabulary. This module bridges that gap by:

- Extracting assistant text from message arrays and content blocks.
- Describing tool activity with `_describe_tool_trace()` and `_rpc_trace_item_from_event()`.
- Shortening long trace values so event payloads remain UI-friendly.
- Turning timeout, process, RPC, and security errors into structured error responses.
- Auto-canceling extension UI prompts in the legacy path when there is no session UI that can answer them.

Session chat uses similar concepts, but the authoritative implementation for persistent sessions is in [`session_manager.py`](session_manager.md).

## Main Function Call Chains

### Legacy Non-Streaming Chat

```text
run_agent_chat()
  -> _run_coro_sync()
  -> _run_pi_rpc_agent_chat_async()
  -> _prepare_rpc_request()
  -> _collect_context()
  -> _build_consulted_pages()
  -> _build_pi_prompt()
  -> PiRpcClient(..., extra_args=_pi_rpc_extra_args("--no-session"))
  -> rpc_client.get_state()
  -> rpc_client.prompt_events()
  -> _rpc_trace_item_from_event()
  -> _extract_assistant_text_from_messages()
  -> _pi_error_response() on failures
```

This is the old no-session path. It builds a prompt with app-side context because Pi does not have a persisted native session in this mode.

### Legacy Streaming Chat

```text
stream_agent_chat()
  -> _stream_pi_rpc_chat()
  -> _prepare_rpc_request()
  -> yield {"type": "context"}
  -> PiRpcClient(..., extra_args=_pi_rpc_extra_args("--no-session"))
  -> rpc_client.prompt_events()
  -> normalize message_update into text_delta / thinking_delta
  -> _rpc_trace_item_from_event()
  -> _auto_cancel_extension_ui_request() for extension_ui_request
  -> yield final or error event
```

The streaming path mirrors the non-streaming path but emits frontend events as they arrive.

### Session Compatibility Wrappers

```text
run_session_chat()
  -> get_session_pool()
  -> SessionPool.send_message(stream=False)

stream_session_chat()
  -> get_session_pool()
  -> SessionPool.send_message_async()
```

These functions are compatibility shims. They do not own session behavior; they delegate to `session_manager.py`.

### Trace and Error Normalization

```text
_rpc_trace_item_from_event()
  -> _describe_tool_trace()
  -> _normalize_tool_action()
  -> _trace_path_from_args()
  -> _trace_search_query_from_args()

_extract_rpc_error_detail_from_event()
  -> _extract_rpc_error_detail_from_message()
  -> _stringify_rpc_error_detail()
  -> _strip_security_reason_prefix()
  -> _no_visible_text_message()
```

These helpers keep legacy event shapes close to the richer session stream shapes so the frontend can render both paths with similar UI components.

## Dependencies

This module depends on:

- [`config.py`](config.md) for Pi command, timeout, thinking level, working directory, and extension args.
- [`pi_rpc_client.py`](pi_rpc_client.md) for the JSONL RPC transport.
- [`security_service.py`](security_service.md) for security extension args and approval-aware error handling.
- [`wiki_service.py`](wiki_service.md) and [`raw_service.py`](raw_service.md) for legacy app-side context lookup.
- [`session_manager.py`](session_manager.md) for session-based wrappers.

## Change Notes

When changing this file, verify whether the behavior belongs in the legacy no-session path or the session path. New product behavior should usually go into `session_manager.py`; this module should remain a compatibility layer plus shared normalization helpers.

## Function Reference

- `_pi_rpc_extra_args(*args)`: Combines caller-provided Pi CLI args with managed provider extension args and managed security extension args.
- `get_agent_backend_status()`: Returns a diagnostics payload describing the Pi backend mode, command path, thinking level, workdir, RPC availability, and session pool count.
- `_collect_context(message)`: Performs legacy app-layer retrieval against wiki and raw files before a no-session prompt is sent.
- `_build_pi_prompt(message, history, wiki_hits, raw_hits)`: Builds the legacy no-session prompt by combining the current question, recent chat history, and pre-retrieved local context.
- `_build_consulted_pages(wiki_hits, raw_hits)`: Converts wiki/raw search hits into UI metadata shown as consulted local sources.
- `_default_suggested_prompts()`: Returns fallback follow-up prompts for legacy responses.
- `_pi_error_response(...)`: Builds the normalized legacy error response shape used by non-streaming chat.
- `_pi_error_event(error_response)`: Converts a legacy error response into the streaming event shape.
- `_prepare_rpc_request(message, history)`: Collects context, checks Pi availability, and returns either the prepared RPC prompt payload or a normalized error response.
- `_extract_text_from_content(content)`: Extracts plain text from Pi message content that may be either a string or a list of content blocks.
- `_extract_assistant_text_from_messages(messages)`: Finds the latest assistant text in a list of Pi messages.
- `_extract_assistant_text_from_message(message)`: Extracts text from one assistant message and ignores non-assistant roles.
- `_normalize_tool_action(tool_name)`: Maps low-level tool names such as `grep`, `rg`, or `ls` into UI action categories.
- `_short_trace_text(value, max_length)`: Normalizes whitespace and truncates long trace/error text for UI display.
- `_trace_path_from_args(args)`: Pulls the most likely path-like field from a Pi tool argument object.
- `_trace_search_query_from_args(args)`: Pulls the most likely search query or pattern from a Pi tool argument object.
- `_describe_tool_trace(tool_name, args)`: Converts tool name and arguments into action, title, and human-readable detail text.
- `_rpc_trace_item_from_event(event)`: Converts Pi tool/error/extension events into frontend trace items.
- `_stringify_rpc_error_detail(value, max_length)`: Recursively extracts a readable error message from nested Pi RPC error payloads.
- `_strip_security_reason_prefix(detail)`: Detects the `[gogo-security]` prefix and returns a cleaned security-block message.
- `_extract_rpc_error_detail_from_message(message)`: Extracts a readable error from a Pi message payload.
- `_extract_rpc_error_detail_from_event(event)`: Extracts a readable error from a Pi stream event.
- `_no_visible_text_message(raw_error_detail)`: Builds a fallback message when Pi ends without visible assistant text.
- `_auto_cancel_extension_ui_request(rpc_client, event)`: Cancels extension UI prompts in the legacy no-session path, because there is no persistent UI wait state to answer them.
- `_run_pi_rpc_agent_chat_async(message, history, request_id)`: Executes the complete legacy no-session chat flow and returns one final response payload.
- `_stream_pi_rpc_chat(message, history, request_id)`: Executes the legacy no-session chat flow as an async stream of frontend events.
- `run_agent_chat(message, history, request_id)`: Synchronous wrapper for legacy non-streaming chat.
- `stream_agent_chat(message, history, request_id)`: Async wrapper for legacy streaming chat.
- `run_session_chat(session_id, message, request_id)`: Compatibility wrapper that delegates non-streaming session chat to `SessionPool`.
- `stream_session_chat(session_id, message, request_id)`: Compatibility wrapper that delegates streaming session chat to `SessionPool`.
