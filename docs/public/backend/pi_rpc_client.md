# `app/backend/pi_rpc_client.py`

Source: [`app/backend/pi_rpc_client.py`](../../../app/backend/pi_rpc_client.py)

`pi_rpc_client.py` is the async transport layer for `pi --mode rpc`.

## Role

This module is deliberately protocol-focused. It starts a Pi RPC subprocess, writes JSONL requests to stdin, reads JSONL events from stdout, and routes responses back to the coroutine waiting for each request.

Product behavior, session policy, and UI event interpretation belong in [`session_manager.py`](session_manager.md) or [`agent_service.py`](agent_service.md).

## Transport Model

`PiRpcClient` manages:

- The subprocess process object.
- A single stdout reader task.
- A request-id to waiter map for RPC responses.
- A prompt/event queue for streaming events.
- A write lock so JSONL requests are not interleaved.
- A prompt lock so prompt operations that expect a coherent event stream do not collide.

The transport assumes one JSON object per line with LF framing. Messages without valid JSON or without expected protocol shape are treated as transport-level errors or ignored depending on context.

## Lifecycle

The typical lifecycle is:

- Construct `PiRpcClient(command, args, cwd, env)`.
- Call `start()` to spawn Pi and begin the reader task.
- Send RPC requests through the client.
- Consume streaming events from the queue when running prompt operations.
- Call `close()` to terminate the subprocess and clean up pending waiters.

Callers should always close the client when a session is destroyed or the app shuts down.

## Error Handling

`PiRpcError` represents subprocess, protocol, or RPC command failures. Callers are expected to convert these errors into app-level messages.

The client should not decide whether an error is user-facing, security-related, retriable, or fatal to the UI. That interpretation belongs above the transport layer.

## Main Function Call Chains

### Client Lifecycle

```text
async with PiRpcClient(...) as client
  -> __aenter__()
  -> start()
  -> asyncio.create_subprocess_exec(command_path, "--mode", "rpc", ...)
  -> create _reader_loop() task
  -> caller RPC operations
  -> __aexit__()
  -> close()
  -> terminate/kill subprocess when needed
  -> _fail_pending_waiters()
  -> _signal_stream_closed()
```

The client is a transport wrapper. It does not own product session state; callers decide when to create and close it.

### Command/Response RPC

```text
get_state() / get_messages() / get_available_models()
set_model() / set_thinking_level() / compact()
  -> _send_command_and_wait_response()
  -> _ensure_running()
  -> create response Future in _response_waiters[id]
  -> _write_command()
  -> _wait_with_timeout(future)
  -> _reader_loop() resolves matching response by id
```

All request/response commands share the same waiter map. This prevents multiple coroutines from reading stdout directly.

### Prompt Event Stream

```text
prompt_events()
  -> acquire _prompt_lock
  -> _send_command_and_wait_response(command_type="prompt")
  -> loop:
       _next_event()
       yield event
       stop on agent_end
  -> release _prompt_lock
```

Only one prompt stream may be active on a client. The lock protects the event queue from two simultaneous prompt consumers.

### Reader Loop and Framing

```text
_reader_loop()
  -> _read_record()
  -> _read_line()
  -> parse JSON
  -> if type == "response":
       _response_waiters[id].set_result(record)
     else:
       _event_queue.put(record)
  -> on error:
       _fail_pending_waiters()
       _signal_stream_closed()
```

This single-reader design is the central concurrency rule of the transport layer.

### Abort and Extension UI

```text
abort()
  -> _write_command({"type": "abort"})

send_extension_ui_response()
  -> validate value / confirmed / cancelled
  -> _write_command({"type": "extension_ui_response", ...})
```

These operations write to the active Pi process and rely on the reader loop to keep the stream consistent.

## Dependencies

This module should have few dependencies and avoid importing higher-level backend services. It can use Python standard library async subprocess primitives, but it should not depend on FastAPI, app settings routes, or frontend event concepts.

## Change Notes

When changing this file, preserve the simple transport invariant: one Pi process, one stdout reader, request dispatch by `id`, and strict JSONL writes. If Pi's RPC protocol changes, update this file first and then adapt `session_manager.py` and `agent_service.py` to the new event shapes.

## Class and Function Reference

- `PiRpcError`: Transport/protocol exception raised when the Pi process, command response, or event stream fails.
- `PiRpcClient.__init__(...)`: Stores command, working directory, timeout, extension args, subprocess state, reader state, waiters, queues, and locks.
- `PiRpcClient.__aenter__()`: Starts the subprocess for `async with` usage and returns the client.
- `PiRpcClient.__aexit__(...)`: Closes the subprocess and cleans pending state on context-manager exit.
- `PiRpcClient.start()`: Launches `pi --mode rpc`, resets transport state, and starts the stdout reader task.
- `PiRpcClient.close()`: Terminates/kills the subprocess, stops the reader task, fails pending waiters, and closes the event stream.
- `PiRpcClient.get_state(request_id)`: Sends `get_state` and returns Pi's current state object.
- `PiRpcClient.get_messages(request_id)`: Sends `get_messages` and returns normalized message dictionaries.
- `PiRpcClient.get_available_models(request_id)`: Sends `get_available_models` and returns model records.
- `PiRpcClient.get_session_stats(request_id)`: Sends `get_session_stats` and returns context/token stats.
- `PiRpcClient.abort(request_id)`: Sends an `abort` command without waiting for a normal command response.
- `PiRpcClient.send_extension_ui_response(...)`: Sends a response/cancel payload back to a pending Pi extension UI request.
- `PiRpcClient.new_session(request_id, parent_session)`: Creates a new native Pi session and returns its state payload.
- `PiRpcClient.switch_session(session_path, request_id)`: Switches Pi to an existing native session file.
- `PiRpcClient.set_session_name(name, request_id)`: Updates the native Pi session display name.
- `PiRpcClient.set_thinking_level(level, request_id)`: Updates Pi's thinking level for the current session.
- `PiRpcClient.set_model(provider, model_id, request_id)`: Updates the active model provider/model for the current session.
- `PiRpcClient.compact(custom_instructions, request_id)`: Runs Pi's compact operation and returns the result payload.
- `PiRpcClient.prompt_events(message, request_id, images)`: Sends a prompt and yields stream events until `agent_end`.
- `PiRpcClient._send_command_and_wait_response(...)`: Writes one command, registers a response waiter by `id`, enforces timeout, and raises on failed RPC responses.
- `PiRpcClient._write_command(command)`: Serializes one command as UTF-8 JSON plus LF and writes it under the write lock.
- `PiRpcClient._reader_loop()`: Continuously reads stdout records, dispatching `response` records to waiters and all other records to the event queue.
- `PiRpcClient._read_record()`: Reads lines until it can parse a JSON object record.
- `PiRpcClient._read_line()`: Implements LF framing over stdout chunks and handles trailing buffered data at EOF.
- `PiRpcClient._next_event()`: Reads the next stream event, translating stream closure or invalid payloads into errors.
- `PiRpcClient._wait_with_timeout(awaitable, label)`: Applies the configured client timeout to any awaited operation.
- `PiRpcClient._ensure_running()`: Verifies that the subprocess exists, has not exited, and the reader has not failed.
- `PiRpcClient._fail_pending_waiters(exc)`: Fails all outstanding command waiters when the transport breaks or closes.
- `PiRpcClient._signal_stream_closed()`: Pushes the stream-closed sentinel into the event queue so prompt iterators can stop.
