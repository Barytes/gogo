# `app/frontend/assets/desktop-bridge.js`

Source: [`app/frontend/assets/desktop-bridge.js`](../../../../app/frontend/assets/desktop-bridge.js)

`desktop-bridge.js` exposes the browser-side adapter for Tauri-only desktop capabilities.

## Role

This file is the frontend boundary between the web workbench and the desktop shell. It lets the rest of the frontend ask for native actions without importing Tauri directly or failing in plain web mode.

Keep this file small. It should not contain application state, settings logic, wiki behavior, or chat behavior.

## Main Responsibilities

- Detect whether the current runtime exposes a Tauri `invoke` function.
- Normalize access to both modern `window.__TAURI__.core.invoke` and older `window.__TAURI_INTERNALS__.invoke`.
- Expose `window.GogoDesktop` as the only desktop bridge used by other frontend files.
- Return safe no-op results for optional desktop actions when running in web mode.
- Throw a clear error for actions that cannot be emulated in web mode, such as opening a local path.

## Exported API

`window.GogoDesktop` exposes:

- `isDesktopRuntime()`: Returns `true` when a Tauri invoke function is available.
- `getRuntimeInfo()`: Returns desktop runtime metadata from the backend shell, or a web-mode fallback payload.
- `selectKnowledgeBaseDirectory()`: Opens the native directory picker in desktop mode and returns `{ canceled, path }`.
- `selectMarkdownSavePath(rootPath, defaultFileName)`: Opens the native Markdown save picker and returns `{ canceled, path }`.
- `openPath(targetPath)`: Asks the desktop shell to reveal or open a local path.

## Main Function Call Chains

### Desktop Runtime Detection

```text
window.GogoDesktop.isDesktopRuntime()
  -> resolveInvoke()
  -> window.__TAURI__.core.invoke if available
  -> window.__TAURI_INTERNALS__.invoke if available
  -> null in web mode
```

This chain is used by [`workbench.js`](workbench.md) and [`wiki.js`](wiki.md) before showing native directory/file-picker behavior.

### Runtime Metadata

```text
window.GogoDesktop.getRuntimeInfo()
  -> resolveInvoke()
  -> invoke("desktop_runtime_info")
  -> fallback { desktop_runtime: false, backend_url: "", platform: "web" }
```

The fallback keeps the same shape as the desktop response so callers do not need separate data models.

### Knowledge-base Directory Picker

```text
workbench.js pickKnowledgeBasePath()
  -> window.GogoDesktop.selectKnowledgeBaseDirectory()
  -> resolveInvoke()
  -> invoke("select_knowledge_base_directory")
  -> { canceled: !path, path: path || "" }
```

The returned object is intentionally simple because `workbench.js` owns validation, settings writes, feedback, and reload behavior.

### Markdown Save Picker

```text
wiki.js openCreateMarkdownFlow()
  -> window.GogoDesktop.selectMarkdownSavePath(rootPath, defaultFileName)
  -> resolveInvoke()
  -> invoke("select_markdown_save_path", { rootPath, defaultFileName })
  -> { canceled: !path, path: path || "" }
```

`wiki.js` converts the selected absolute path back into a knowledge-base-relative Markdown path before calling backend create APIs.

### Open Local Path

```text
workbench.js openDesktopPath() or wiki.js openExternalMarkdownLink()
  -> window.GogoDesktop.openPath(targetPath)
  -> resolveInvoke()
  -> invoke("open_path", { path })
  -> throw Error("当前不是桌面版运行时。") in web mode
```

Opening a local path is not silently ignored in web mode because callers need user-visible feedback.

## Dependencies

This file depends only on the global Tauri objects injected by the desktop shell. It is loaded before [`workbench.js`](workbench.md), [`wiki.js`](wiki.md), and [`chat.js`](chat.md) in [`index.html`](../index-html.md).

## Change Notes

When adding a desktop command, add only the thin `window.GogoDesktop` wrapper here. Put validation, rendering, state changes, and API writes in the caller module that owns the product flow.
