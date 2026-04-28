# `app/frontend/assets/chat.js`

Source: [`app/frontend/assets/chat.js`](../../../../app/frontend/assets/chat.js)

`chat.js` owns the chat workspace.

## Role

This file is the frontend owner for Pi-backed conversation work: session list, session switching, draft state, streaming responses, assistant traces, security intervention UI, model controls, thinking controls, context-window display, slash commands, and inbox upload.

It should stay focused on chat/session behavior. Application settings and diagnostics belong in [`workbench.js`](workbench.md), and knowledge-base browsing belongs in [`wiki.js`](wiki.md).

## Main Responsibilities

- Render and update the session sidebar.
- Maintain a draft chat before the first message creates a backend session.
- Switch between sessions while preserving rendered DOM state and scroll position.
- Hydrate current and older history from backend event storage.
- Send messages to the streaming chat endpoint and consume NDJSON stream events.
- Render user messages, assistant text, thinking deltas, trace groups, warnings, and consulted pages.
- Expose model, thinking level, security mode, and context-window controls.
- Queue and answer security extension UI requests.
- Upload, list, delete, and ingest inbox files.
- Load slash commands from knowledge-base capabilities and insert command text into the editor.
- Expose `window.ChatWorkbench` for cross-module prompt injection and runtime refresh.

## State Model

- `currentSessionId`: The active backend session ID, or draft state when absent.
- `sessions`: Cached session records rendered in the sidebar.
- `draftHistory`: Messages shown before the first message creates a session.
- `sessionHistories`: Map from session ID to normalized chat history turns.
- `sessionViewNodes`: Map from session ID to already-rendered DOM nodes, preserving thinking/trace details across switches.
- `pendingSessionIds`: Session IDs with an in-flight assistant reply.
- `abortingSessionIds`: Session IDs currently waiting for abort confirmation.
- `hydratedSessionIds`: Sessions whose backend history has already been loaded.
- `sessionHistoryHasOlder`: Tracks whether "load older" should remain available per session.
- `availableModels`, `availableThinkingLevels`, and `draftChatSettings`: Runtime options plus default draft-session model/thinking settings returned by Pi settings endpoints.
- `securitySettingsState` and `securityInterventionQueue`: Current security mode plus pending approval/deny UI prompts.
- `inboxFiles` and `inboxDeletingPaths`: Inbox panel state.
- `availableSlashCommands`: Capability-derived slash commands shared with the capability editor in `workbench.js`.

## Main Function Call Chains

### Bootstrap and Startup Warmup

```text
bootstrapChat()
  -> loadSessionSidebarState()
  -> fetchSessions()
  -> renderSessionList()
  -> restore remembered session with switchToSession()
  -> otherwise enterDraftState()
  -> warmStartupDataInBackground()
     -> fetchPiOptions()
     -> loadSlashCommands()
     -> reloadSecuritySettings()
     -> refreshInboxFiles()
```

The chat panel becomes usable quickly, then less critical runtime data is warmed in the background.

### First Message Session Creation

```text
submitCurrentMessage()
  -> sendMessage(message)
  -> createSessionForFirstMessage(message) when currentSessionId is empty
  -> fetch("/api/sessions", { method: "POST" })
  -> mergeSessionIntoCache(session)
  -> rememberSessionId(session.id)
  -> renderSessionList()
```

The draft panel is intentionally local until the user sends the first message. The backend session is created only when conversation actually starts.

### Streaming Message Flow

```text
submitCurrentMessage()
  -> sendMessage(message)
  -> appendMessage("user", message)
  -> createStreamingAssistantMessage("")
  -> setChatPending(true)
  -> fetch("/api/chat/stream", { method: "POST" })
  -> consumeNdjsonStream(response, onEvent)
  -> handle text_delta / thinking_delta / trace / warning / security / final / error
  -> upsertAssistantTurn(history, finalText, extras)
  -> refreshCurrentSessionDetailInBackground(sessionId)
  -> setChatPending(false)
```

`consumeNdjsonStream()` is the stream boundary. It reads newline-delimited JSON events from the backend and lets `sendMessage()` decide how each event mutates the UI.

### History Hydration and "Load Older"

```text
switchToSession(sessionId)
  -> storeCurrentSessionView()
  -> restoreSessionView(sessionId) if available
  -> hydrateSessionHistoryFromStore(sessionId)
  -> fetchSessionHistoryPage(sessionId, { limit, offset: 0 })
  -> hydrateSessionHistoryPage(...)
  -> renderHistory(messages)
  -> refreshLoadOlderButton()

loadOlderHistoryForCurrentSession()
  -> fetchSessionHistoryPage(sessionId, { limit, offset })
  -> hydrateSessionHistoryPage(..., prepend: true)
  -> prependHistory(messages)
```

The DOM-node cache avoids losing expanded thinking or trace details when switching sessions, while backend history remains the durable source.

### Runtime Option Controls

```text
fetchPiOptions()
  -> fetch("/api/pi/options")
  -> applyPiOptions(payload)
  -> renderChatControlMenus()
  -> refreshChatControls()

applyModelSelection(model)
  -> fetch(`/api/sessions/${sessionId}/model`, { method: "PATCH" })
  -> update local session settings
  -> refreshChatControls()

applyThinkingSelection(level)
  -> fetch(`/api/sessions/${sessionId}/thinking`, { method: "PATCH" })
  -> update local session settings
  -> refreshChatControls()
```

Model and thinking selection are session-aware. The controls are disabled or constrained when runtime options do not support a selected level.

### Context Window and Compact Command

```text
refreshChatContextIndicator()
  -> currentSessionContextUsage()
  -> currentSessionContextWindow()
  -> currentSessionContextPercent()
  -> update ring, token labels, and compact affordance

sendCompactCommand()
  -> inject compact prompt into current session
  -> sendMessage(compactCommand, { compact: true })
```

The context indicator is read-only state derived from the current session detail. Compacting still uses the normal chat send path.

### Security Intervention Flow

```text
handleIncomingExtensionUiRequest(request, sessionId)
  -> buildSecurityInterventionFromUiRequest(request, sessionId)
  -> enqueueSecurityIntervention(intervention)
  -> openNextSecurityIntervention()
  -> renderSecurityInterventionModal()

handleSecurityApproval()
  -> sendSessionExtensionUiResponse(sessionId, { action: "approve", ... })
  -> closeActiveSecurityIntervention()

handleSecurityDeny()
  -> sendSessionExtensionUiResponse(sessionId, { action: "deny", reason })
  -> closeActiveSecurityIntervention()
```

Security UI requests originate in Pi extension events. The frontend queues them so multiple prompts do not overwrite each other.

### Inbox Upload and Ingest Flow

```text
uploadInput/drop
  -> uploadInboxFiles(fileList)
  -> postInboxUpload(file)
  -> refreshInboxFiles({ open: true, highlightPath })
  -> renderInboxPanel()

ingestInboxPanelButton click
  -> injectPrompt(INBOX_INGEST_PROMPT, true)
  -> focusChatInput()
```

The inbox panel manages file transfer and prompt preparation. The actual ingest is still performed by sending a normal chat message to Pi.

### Slash Command Flow

```text
loadSlashCommands()
  -> fetch("/api/capabilities/slash-commands")
  -> normalizeSlashCommandItem()
  -> renderSlashPanel()

input or slash button
  -> openSlashPanel()
  -> filteredSlashCommands()
  -> groupedSlashCommands()
  -> applySlashCommand(item)
  -> insertTextAtCursor(item.insert_text)
```

`workbench.js` calls `window.ChatWorkbench.reloadSlashCommands()` after capability edits so the chat input and capability editor stay synchronized.

### Abort Flow

```text
abortCurrentReply()
  -> abortSessionReply(currentSessionId)
  -> fetch(`/api/sessions/${sessionId}/abort`, { method: "POST" })
  -> mark session as aborting
  -> refreshChatPendingState()
```

Abort state is tracked separately from pending state so the submit button can distinguish "stop requested" from "reply still streaming".

### Cross-module API

```text
window.ChatWorkbench = {
  injectPrompt,
  focusInput,
  openInbox,
  reloadPiOptions,
  reloadSecuritySettings,
  reloadSlashCommands,
}
```

[`wiki.js`](wiki.md) uses `injectPrompt()` for quoting pages and inbox ingest prompts. [`workbench.js`](workbench.md) uses `reloadPiOptions()` and `reloadSlashCommands()` after provider or capability changes, and can call `reloadSecuritySettings()` when chat-side security controls need to refresh.

## Dependencies

This file depends on:

- [`index.html`](../index-html.md) for stable chat, session, modal, control, and inbox DOM IDs.
- [`workbench.js`](workbench.md) for `window.WorkbenchUI.ensureChatVisible()` and settings-facing refresh flows.
- [`wiki.js`](wiki.md) for `window.WikiWorkbench.openPage()` when opening consulted pages or inline wiki links.
- [`math-render.js`](math-render.md) for KaTeX rendering inside chat messages.
- Backend routes documented in [`main.py`](../../backend/main.md), [`session_manager.py`](../../backend/session_manager.md), [`skill_service.py`](../../backend/skill_service.md), and [`security_service.py`](../../backend/security_service.md).

## Change Notes

This is the largest frontend file. When changing it, test at least one draft-to-session send, one existing-session switch, one streamed reply, one history hydration, and one control refresh path. Be especially careful not to break the stream event vocabulary expected by the backend session manager.

## Key Function Reference

- `bootstrapChat()`: Initializes session state, restores the last active session, and starts background runtime warmup.
- `warmStartupDataInBackground()`: Loads runtime options, slash commands, security settings, and inbox files after initial render.
- `fetchSessions()`: Loads session summaries from the backend.
- `renderSessionList()`: Renders the session sidebar and session actions.
- `enterDraftState(options)`: Resets the chat panel into local draft mode.
- `switchToSession(sessionId, options)`: Saves current view state, opens another session, and hydrates its history.
- `createSessionForFirstMessage(message)`: Creates a backend session when the first draft message is sent.
- `sendMessage(message, options)`: Owns the full streaming request lifecycle.
- `submitCurrentMessage()`: Reads the input, validates it, and calls `sendMessage()`.
- `consumeNdjsonStream(response, onEvent)`: Parses newline-delimited JSON from the streaming endpoint.
- `createStreamingAssistantMessage(initialText, options)`: Creates mutable DOM/state handles for the in-progress assistant response.
- `appendMessage(role, content, consultedPages, trace, warnings)`: Adds one completed message to the current DOM.
- `renderMessageBody(container, role, content)`: Renders Markdown-like message text and math.
- `renderTrace(wrapper, trace, warnings)`: Renders tool traces and warnings.
- `hydrateSessionHistoryFromStore(sessionId)`: Loads session history from backend event storage if needed.
- `fetchSessionHistoryPage(sessionId, options)`: Fetches one paginated history page.
- `loadOlderHistoryForCurrentSession()`: Prepends older history into the current message list.
- `fetchPiOptions()`: Loads available models, thinking levels, and provider/runtime option data.
- `applyPiOptions(payload)`: Applies runtime options to menus and session controls.
- `applyModelSelection(model)`: Persists the selected model for the active session.
- `applyThinkingSelection(level)`: Persists the selected thinking level for the active session.
- `fetchSecuritySettings()`: Loads current security settings.
- `applySecuritySelection(mode)`: Persists the selected security mode.
- `handleIncomingExtensionUiRequest(request, sessionId)`: Converts Pi extension UI requests into the security modal queue.
- `sendSessionExtensionUiResponse(sessionId, payload)`: Sends approve/deny decisions back to the session manager.
- `abortCurrentReply()`: Requests cancellation for the active session stream.
- `loadSlashCommands()`: Loads capability-derived slash commands.
- `applySlashCommand(item)`: Inserts a selected slash command into the chat input.
- `refreshInboxFiles(options)`: Reloads inbox files and optionally opens/highlights the panel.
- `uploadInboxFiles(fileList)`: Uploads user-selected or dropped files into inbox.
- `deleteInboxFile(file)`: Deletes one inbox file from the panel.
