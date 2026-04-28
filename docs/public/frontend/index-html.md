# `app/frontend/index.html`

Source: [`app/frontend/index.html`](../../../app/frontend/index.html)

`index.html` is the single-page workbench shell.

## Role

This file defines the static DOM contract for the frontend. The app does not use a component framework; instead, `index.html` provides the stable elements that [`workbench.js`](assets/workbench.md), [`wiki.js`](assets/wiki.md), and [`chat.js`](assets/chat.md) query and mutate.

Keep element IDs stable unless the matching JavaScript and CSS are updated in the same change.

## Main Responsibilities

- Load global CSS and vendored KaTeX CSS.
- Define the startup onboarding overlay.
- Define the topbar, settings entry, and Wiki/Chat mode switch.
- Define the Wiki/Raw/Inbox browsing surface.
- Define the unified chat panel, session sidebar, composer, controls, context indicator, inbox panel, slash panel, and security modal.
- Define the settings panel and all settings sections.
- Define provider, capability, diagnostics, security, and Markdown create containers.
- Load frontend scripts in dependency order.

## DOM Architecture

### Startup Overlay

The `#startup-overlay` block is controlled by [`workbench.js`](assets/workbench.md). It contains status text, wizard progress, phase cards, diagnostics shortcuts, Pi install action, knowledge-base picker action, and a "browse Wiki first" escape hatch.

### Topbar and Workbench Switch

The topbar contains:

- `#open-settings-panel`, used by `workbench.js` to open settings.
- `#knowledge-base-name`, updated from loaded app settings.
- `#layout-mode-wiki` and `#layout-mode-chat`, used by `workbench.js` to switch body-level layout state.

### Wiki Surface

The Wiki area contains:

- Source switch buttons: `#mode-wiki`, `#mode-inbox`, and `#mode-raw`.
- Search and list containers: `#wiki-search`, `#wiki-list`.
- Detail containers: `#wiki-title`, `#wiki-category`, `#wiki-content`.
- Editor controls: `#wiki-editor`, `#wiki-edit`, `#wiki-save`, `#wiki-cancel`, `#wiki-delete`.
- Creation and ingest controls: `#wiki-create-md`, `#markdown-create-overlay`, `#wiki-insert-ingest`.

[`wiki.js`](assets/wiki.md) owns all behavior for these elements.

### Chat Surface

The chat area contains:

- Session sidebar: `#session-list`, `#new-session-button`, sidebar toggles, and empty state.
- Message viewport and navigation: `#messages`, load-older button, scroll-bottom button, and question navigator.
- Composer: `#chat-form`, `#chat-input`, upload input/button, submit button, and slash button/panel.
- Runtime controls: model, thinking, security, and context controls.
- Inbox panel: upload/list/delete/ingest controls.
- Security modal: approve/deny/steer UI for Pi security extension prompts.

[`chat.js`](assets/chat.md) owns all behavior for these elements.

### Settings Panel

The settings panel contains:

- Navigation buttons marked with `data-settings-section`.
- Section panes marked with `data-settings-section-pane`.
- Knowledge-base path and recent-path controls.
- Capability list/editor controls.
- Model provider form, import, Pi install, and desktop login controls.
- Diagnostics cards, export/open actions, security summary, and security event log.
- Security mode controls.
- Toast viewport.

[`workbench.js`](assets/workbench.md) owns all behavior for these elements.

## Script and Stylesheet Dependency Chains

### Stylesheets

```html
<link rel="stylesheet" href="/assets/vendor/katex/katex.min.css?...">
<link rel="stylesheet" href="/assets/styles.css?...">
```

KaTeX CSS loads first so app styles can refine rendered math layout where needed.

### Script Order

```html
<script src="/assets/vendor/katex/katex.min.js?..."></script>
<script src="/assets/vendor/katex/auto-render.min.js?..."></script>
<script src="/assets/math-render.js?..."></script>
<script src="/assets/desktop-bridge.js?..."></script>
<script src="/assets/workbench.js?..."></script>
<script src="/assets/wiki.js?..."></script>
<script src="/assets/chat.js?..."></script>
```

The order matters:

- KaTeX scripts must load before [`math-render.js`](assets/math-render.md).
- [`math-render.js`](assets/math-render.md) must define `window.GogoMath` before Wiki or chat renders Markdown.
- [`desktop-bridge.js`](assets/desktop-bridge.md) must define `window.GogoDesktop` before workbench or wiki asks for native file/path actions.
- [`workbench.js`](assets/workbench.md) must define `window.WorkbenchUI` before wiki and chat use workbench helpers.
- [`wiki.js`](assets/wiki.md) must define `window.WikiWorkbench` before chat links and consulted-page metadata call back into Wiki navigation.
- [`chat.js`](assets/chat.md) loads last because it depends on the other global integration points.

## Change Notes

This file is easy to break because IDs are code contracts. Before renaming or removing an element, search the frontend assets for the ID or class. If a section becomes dynamic, keep a stable container in `index.html` and let the owning JS module render only that section's internal content.

## DOM Contract Reference

- Startup IDs are owned by [`workbench.js`](assets/workbench.md).
- Layout/topbar IDs are owned by [`workbench.js`](assets/workbench.md).
- Wiki/source/editor/Markdown-create IDs are owned by [`wiki.js`](assets/wiki.md).
- Chat/session/composer/inbox/security modal IDs are owned by [`chat.js`](assets/chat.md).
- Shared visual classes are defined in [`styles.css`](assets/styles.md).
