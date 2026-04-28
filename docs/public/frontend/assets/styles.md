# `app/frontend/assets/styles.css`

Source: [`app/frontend/assets/styles.css`](../../../../app/frontend/assets/styles.css)

`styles.css` contains the full visual system and layout CSS for the single-page workbench.

## Role

This stylesheet is the visual and layout contract for the entire frontend. JavaScript modules mutate body classes, element classes, hidden states, ARIA attributes, and data attributes; `styles.css` translates those states into the actual workbench layout.

Because the app is a single static page, CSS is not scoped by component framework boundaries. Treat selector names as public contracts with [`index.html`](../index-html.md), [`workbench.js`](workbench.md), [`wiki.js`](wiki.md), and [`chat.js`](chat.md).

## Main Responsibilities

- Define global theme variables, typography, panels, buttons, fields, and feedback styles.
- Style the startup overlay and onboarding wizard.
- Style the settings panel, including knowledge-base, provider, capability, diagnostics, and security sections.
- Define Wiki-first and Chat-first workbench layouts.
- Style Wiki source sidebar, content panel, editor, Markdown output, and navigation controls.
- Style chat session sidebar, messages, composer, runtime controls, context indicator, slash panel, inbox panel, and security modal.
- Define responsive behavior for desktop, tablet, and narrow mobile screens.
- Provide state styles for body classes such as `layout-wiki`, `layout-chat`, `chat-hidden`, `wiki-hidden`, and `session-sidebar-collapsed`.

## Main Style Dependency Chains

### Workbench Layout State

```text
workbench.js setLayout()/hideChat()/hideWiki()
  -> applyWorkbenchState()
  -> body.classList toggles:
       layout-wiki
       layout-chat
       chat-hidden
       wiki-hidden
  -> styles.css body.layout-* selectors
  -> grid, panel size, visibility, and floating behavior
```

The layout is state-driven. Avoid hardcoding inline styles in JavaScript when a class/state selector can express the change.

### Session Sidebar State

```text
chat.js applySessionSidebarState(collapsed)
  -> body.classList.toggle("session-sidebar-collapsed")
  -> styles.css body.session-sidebar-collapsed selectors
  -> chat body grid and session sidebar collapse
```

The session sidebar uses a body-level class because its width affects the main chat grid.

### Wiki Sidebar Visibility

```text
wiki.js setSidebarVisibility(visible)
  -> .wiki-sidebar class toggles
  -> .workbench-wiki class toggles
  -> styles.css body.layout-chat .workbench-wiki .wiki-sidebar...
```

In Chat-first layout, the Wiki panel can act as a narrow side drawer. In Wiki-first layout, the sidebar is part of the main browsing surface.

### Startup Overlay

```text
workbench.js renderStartupOverlay()
  -> toggles .hidden on #startup-overlay children
  -> renders startup step cards and phase cards
  -> styles.css .startup-* selectors
```

Startup styles are intentionally separate from settings styles, even when the startup wizard embeds the provider settings pane.

### Settings Panel Sections

```text
workbench.js setActiveSettingsSection(section)
  -> [data-settings-section] button active state
  -> [data-settings-section-pane] .active
  -> styles.css .settings-* selectors
```

Settings panes share common card/field/help/feedback styles. Specialized selectors are added only when the section needs a distinct visual grammar.

### Capability Editor

```text
workbench.js renderCapabilitySettings()
  -> .settings-capability-* elements
  -> skill/schema badge classes
  -> unsaved editor feedback
  -> styles.css capability browser/editor layout
```

Capability styles depend on stable item, badge, guidance, editor, and toolbar classes.

### Provider and Pi Runtime Settings

```text
workbench.js renderModelProviderSettings()
  -> .settings-provider-* elements
  -> provider mode buttons
  -> install/login action buttons
  -> styles.css provider cards, chips, actions, and form blocks
```

Provider styles serve both the normal settings panel and the startup embedded provider pane.

### Diagnostics and Security

```text
workbench.js renderDiagnostics()
  -> .settings-diagnostics-* cards and lists
  -> renderSecuritySummary()
  -> renderSecurityEvents()
  -> .settings-security-* selectors
```

Diagnostics and security styles are read-heavy and should prioritize scannability over dense controls.

### Chat Runtime Controls

```text
chat.js renderChatControlMenus()/refreshChatControls()
  -> .chat-control-menu-shell
  -> .chat-control-button
  -> .chat-control-menu
  -> .chat-control-menu-item active/unsupported states
```

Control menus use shared styling for model, thinking level, security mode, and context window affordances.

### Chat Streaming and Messages

```text
chat.js appendMessage()/createStreamingAssistantMessage()
  -> message DOM nodes and trace/details nodes
  -> .messages, .message, .message-* and trace styles
  -> math post-processing by math-render.js
```

Styles must support both fully hydrated history messages and mutable streaming assistant messages.

### Slash Command and Inbox Panels

```text
chat.js openSlashPanel()/renderSlashPanel()
  -> .chat-slash-panel and .chat-slash-item

chat.js openInboxPanel()/renderInboxPanel()
  -> inbox panel classes
```

Both are anchored to the composer area and need to remain usable in Wiki-first compact chat mode.

### Security Intervention Modal

```text
chat.js renderSecurityInterventionModal()
  -> #chat-security-modal
  -> .chat-security-* selectors
```

This modal is separate from diagnostics security styles. It is an active decision UI, not a read-only report.

## Dependencies

This file depends on:

- [`index.html`](../index-html.md) for stable DOM structure, IDs, and classes.
- [`workbench.js`](workbench.md) for body-level workbench state classes and settings/startup rendering.
- [`wiki.js`](wiki.md) for Wiki sidebar, editor, source switch, and Markdown content classes.
- [`chat.js`](chat.md) for chat, session, composer, slash, inbox, context, and security modal classes.
- [`math-render.js`](math-render.md) and KaTeX CSS for rendered math inside Wiki and chat content.

## Change Notes

When changing selectors, check whether the selector is created statically by `index.html` or dynamically by JavaScript. If a class is toggled by JavaScript, update the owning JS file and this documentation in the same change.

## Selector Contract Reference

- `body.layout-wiki`: Wiki-first workbench layout.
- `body.layout-chat`: Chat-first workbench layout.
- `body.chat-hidden`: Chat panel hidden or minimized.
- `body.wiki-hidden`: Wiki panel hidden or minimized.
- `body.session-sidebar-collapsed`: Chat session sidebar collapsed.
- `.startup-*`: Startup overlay, wizard, phases, status, and embedded provider setup.
- `.settings-*`: Shared settings panel layout, fields, buttons, feedback, toast, and specialized settings sections.
- `.settings-capability-*`: Capability browser/editor and skill/schema guidance.
- `.settings-provider-*`: Provider profiles, provider form, OAuth/API mode controls, and Pi install actions.
- `.settings-diagnostics-*`: Diagnostics cards, lists, and actions.
- `.settings-security-*`: Read-only security summary and event log styles inside diagnostics/settings.
- `.workbench-grid`, `.workbench-wiki`, `.unified-chat-panel`: Top-level workspace layout containers.
- `.wiki-*`: Wiki source switch, sidebar, list, content panel, editor, history controls, and Markdown output.
- `.chat-*`: Chat panel, messages, session sidebar, composer, runtime controls, slash panel, inbox panel, context popover, and security modal.
- `.hidden`: Shared utility used by multiple modules for conditional visibility.
