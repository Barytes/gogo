# `app/frontend/assets/wiki.js`

Source: [`app/frontend/assets/wiki.js`](../../../../app/frontend/assets/wiki.js)

`wiki.js` owns the Wiki / Raw / Inbox browsing surface.

## Role

This file turns the local knowledge-base into the left-side browsing and editing surface of the workbench. It knows how to list, load, render, navigate, create, edit, and delete Markdown-like content across the `wiki`, `raw`, and `inbox` sources.

It should stay focused on knowledge-base browsing. App settings belong in [`workbench.js`](workbench.md), and session/chat behavior belongs in [`chat.js`](chat.md).

## Main Responsibilities

- Switch between `wiki`, `inbox`, and `raw` modes.
- Build source-specific list and detail API URLs.
- Render grouped page/file lists with search filtering.
- Load and render the selected page or file.
- Convert a constrained Markdown subset into HTML.
- Resolve Markdown links into internal workbench navigation or external open actions.
- Maintain Wiki panel back/forward navigation separate from browser history.
- Support Markdown create, edit, save, and delete flows for editable sources.
- Insert selected inbox ingest prompts into chat.
- Expose `window.WikiWorkbench` for cross-module navigation and prompt insertion.

## State Model

- `activeMode`: Current source mode, normally `wiki`, `inbox`, or `raw`.
- `allPages`: Last fetched page/file index for the active source.
- `activePage`: Fully loaded detail payload for the current page/file.
- `activePath`: Current source-relative path.
- `wikiEditing`: Whether the editor view is active for the current page.
- `wikiSaving`: Whether a create/save/delete mutation is in progress.
- `markdownCreateMode`: Source mode targeted by the create Markdown dialog.
- `wikiBackHistory` and `wikiForwardHistory`: In-app navigation stacks for page-level history.

## Main Function Call Chains

### Bootstrap and Initial Page Selection

```text
bootstrap()
  -> read URLSearchParams for page/inbox/raw
  -> fetchPages()
  -> renderList(allPages)
  -> choose requested path, first page, or empty state
  -> navigateToPage(path, source)
  -> loadPage(path)
  -> renderPageData(data)
```

This is the entry path after `index.html` loads `wiki.js`. The URL can request a specific source, but the module falls back to the first available item.

### Source Switching and Search

```text
setMode(mode)
  -> activeMode = mode
  -> set active source-switch buttons
  -> fetchPages(searchEl.value)
  -> renderList(pages)
  -> renderModeEmptyState(mode, query) when no pages match

fetchPages(query)
  -> currentListEndpoint(query)
  -> fetch(...)
  -> data.pages
```

`currentListEndpoint()` and `listEndpointForMode()` map frontend modes onto backend routes from [`main.py`](../../backend/main.md), [`wiki_service.py`](../../backend/wiki_service.md), and [`raw_service.py`](../../backend/raw_service.md).

### Page Navigation

```text
renderList(pages)
  -> button.addEventListener("click")
  -> navigateToPage(page.path, activeMode, { recordHistory: true })
  -> resolveIndexedPath(path, source)
  -> loadPage(resolvedPath)
  -> renderPageData(data)
  -> update URL query
  -> updateWikiHistoryButtons()
```

`resolveIndexedPath()` allows links and list clicks to resolve exact paths or basename-like targets against the already fetched index.

### Markdown Link Handling

```text
renderPageData(data)
  -> markdownToHtml(data.content)
  -> contentEl.innerHTML = ...
  -> window.GogoMath.renderElement(contentEl)
  -> attach click handlers to rendered anchors
  -> resolveWorkbenchTarget(href, data.path, activeMode)
  -> window.WikiWorkbench.openPage(destination.path, destination.source)
```

Internal links stay inside the workbench. External links are sanitized by `sanitizeMarkdownHref()` and opened through `openExternalMarkdownLink()`, which delegates to `window.GogoDesktop.openPath()` in desktop mode when possible.

### Edit and Save Flow

```text
edit button click
  -> setWikiEditing(true)
  -> syncWikiEditorActions()

saveCurrentWikiPage()
  -> beginWikiMutation()
  -> fetch(currentDetailEndpoint(activePath), { method: "PUT", body })
  -> loadPage(activePath)
  -> setWikiEditing(false)
  -> finishWikiMutation()
```

The editor is only enabled when `canEditCurrentPage()` says the active source/path is editable. `hasUnsavedWikiChanges()` and `confirmDiscardWikiEdits()` protect navigation away from unsaved edits.

### Create Markdown Flow

```text
openCreateMarkdownFlow()
  -> if desktop runtime and root path known:
       window.GogoDesktop.selectMarkdownSavePath(rootPath, defaultNewWikiPath(mode))
       -> relativePathFromSelectedFile()
  -> otherwise openCreateMarkdownDialog()

createCurrentWikiPage()
  -> normalizeNewWikiPath(input)
  -> createMarkdownFile(activeMode, relativePath, { content })
  -> fetch(source-specific create endpoint)
  -> fetchPages()
  -> navigateToPage(relativePath, activeMode)
  -> setWikiEditing(true)
```

The desktop picker chooses a local path, but backend writes still happen through source-specific API routes so path validation stays server-side.

### Delete Flow

```text
deleteCurrentWikiPage()
  -> confirm(...)
  -> beginWikiMutation()
  -> fetch(currentDetailEndpoint(activePath), { method: "DELETE" })
  -> fetchPages()
  -> navigate to next available page or empty state
  -> finishWikiMutation()
```

Deletes are guarded by `canDeleteCurrentPage()` and a browser confirmation prompt.

### Inbox Ingest Prompt Flow

```text
insertIngestEl click
  -> buildInboxIngestPrompt(activePage)
  -> window.ChatWorkbench.injectPrompt(prompt, true)
  -> window.WorkbenchUI.ensureChatVisible()
```

Wiki does not send the chat message. It only inserts the prompt and lets [`chat.js`](chat.md) own submission.

### Cross-module API

```text
window.WikiWorkbench = {
  openPage,
  showSidebar,
  hideSidebar
}
```

[`chat.js`](chat.md) uses `openPage()` for consulted pages and inline wiki links. Sidebar show/hide is exposed as a narrow UI helper instead of exposing the full Wiki state object.

## Dependencies

This file depends on:

- [`index.html`](../index-html.md) for stable Wiki, editor, source switch, and Markdown create dialog IDs.
- [`workbench.js`](workbench.md) for `window.WorkbenchUI`, app settings, toast feedback, and layout visibility helpers.
- [`chat.js`](chat.md) for `window.ChatWorkbench.injectPrompt()`.
- [`desktop-bridge.js`](desktop-bridge.md) for native file/path behavior.
- [`math-render.js`](math-render.md) for KaTeX rendering after Markdown conversion.
- Backend routes documented in [`wiki_service.py`](../../backend/wiki_service.md), [`raw_service.py`](../../backend/raw_service.md), and [`main.py`](../../backend/main.md).

## Change Notes

When changing this file, verify three paths together: source switching, internal Markdown navigation, and edit/create/delete mutation behavior. Many helpers are intentionally source-aware, so adding a new content source requires endpoint mapping, list rendering, detail rendering, action gating, and URL query updates.

## Key Function Reference

- `isMarkdownWorkbenchMode(mode)`: Returns whether a mode supports Markdown create/edit semantics.
- `syncWikiEditorActions()`: Updates editor, create, delete, save, cancel, and ingest action visibility.
- `setWikiEditing(editing)`: Switches between rendered page view and textarea editor view.
- `currentMarkdownRootAbsolutePath(mode)`: Reads the selected knowledge-base path from `window.WorkbenchUI` and maps source mode to a local root directory.
- `relativePathFromSelectedFile(selectedPath, rootPath)`: Converts a desktop-selected absolute path into a root-relative Markdown path.
- `buildInboxIngestPrompt(page)`: Builds the chat prompt used to ingest the selected inbox file.
- `openCreateMarkdownFlow()`: Chooses desktop save picker or web dialog for creating a Markdown file.
- `sanitizeMarkdownHref(value)`: Rejects unsafe link protocols before rendering anchors.
- `resolveWorkbenchTarget(href, currentPath, currentSource)`: Converts Markdown links and query URLs into `{ source, path }` navigation targets.
- `markdownToHtml(markdown)`: Renders the supported Markdown subset into HTML.
- `renderList(pages)`: Renders the grouped source sidebar and installs list-item click handlers.
- `setMode(mode)`: Switches between Wiki, Inbox, and Raw modes.
- `fetchPages(query)`: Loads the current source index.
- `fetchPagesForMode(mode, query)`: Loads a source index without changing `activeMode`.
- `renderPageData(data)`: Renders detail payload, math, links, metadata, and editor state.
- `loadPage(path)`: Fetches one source detail payload.
- `navigateToPage(path, source, options)`: Resolves, loads, renders, records history, and updates the URL.
- `bootstrap()`: Initializes the Wiki panel on page load.
- `saveCurrentWikiPage()`: Persists the current editor content.
- `deleteCurrentWikiPage()`: Deletes the active Markdown file when allowed.
- `createMarkdownFile(source, relativePath, options)`: Calls the source-specific create endpoint.
- `createCurrentWikiPage()`: Creates a page from the create dialog and opens it in edit mode.
- `setSidebarVisibility(visible)`: Shows or hides the Wiki sidebar.
