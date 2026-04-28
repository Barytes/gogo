# `app/frontend/assets/workbench.js`

Source: [`app/frontend/assets/workbench.js`](../../../../app/frontend/assets/workbench.js)

`workbench.js` owns application-level workspace behavior outside the chat and wiki panels.

## Role

This file is the frontend coordinator for the overall gogo workbench: layout state, startup onboarding, settings, knowledge-base selection, model provider configuration, capability editing, diagnostics, and security settings.

It should not own chat message/session behavior or wiki page rendering. Instead, it exposes workbench-level helpers through `window.WorkbenchUI` and calls public APIs exposed by [`chat.js`](chat.md) when settings changes need the chat runtime to refresh.

## Main Responsibilities

- Persist and apply Wiki/Chat layout mode.
- Hide/show panels and support floating-dock restoration.
- Render startup onboarding for desktop readiness, Pi installation, knowledge-base setup, and provider setup.
- Load and render app settings.
- Switch knowledge-base paths and render recent paths.
- Edit capability files such as skills and schemas.
- Configure API-key and OAuth-style model provider profiles.
- Trigger Pi runtime installation and desktop Pi login flows.
- Render diagnostics, export diagnostics summary, and open relevant local paths in desktop mode.
- Render and save security settings.
- Expose `window.WorkbenchUI` for cross-module layout and settings helpers.

## State Model

- `workbenchState`: Layout mode plus hidden/floating state for Wiki and Chat panels.
- `appSettings`: Last loaded `/api/settings` payload, including knowledge-base, startup, provider, Pi, security, and capability metadata.
- `diagnosticsState`: Cached diagnostics payload and loading/error state.
- `capabilityState`: Capability list, selected file, editor content, dirty state, and loading state.
- `capabilityAgentsGuidanceState`: Derived helper text for wiring `AGENTS.md` to exposed skills/schemas.
- `activeSettingsSection`: Current settings panel section.
- `providerFormMode`: Whether the provider editor is editing API-key or OAuth-style configuration.
- `providerAuthMode`: Current OAuth helper mode, including desktop login when supported.
- `desktopPiLoginPollToken`: Cancels stale polling loops when a new desktop login attempt starts.

## Main Function Call Chains

### App Settings Bootstrap

```text
loadAppSettings()
  -> fetch("/api/settings")
  -> appSettings = payload
  -> renderSettings()
  -> renderStartupOverlay()
  -> loadDiagnostics() when needed by visible sections/startup
```

This file starts by calling `loadAppSettings()` at the bottom of the module. Most settings views are derived from the same cached payload.

### Layout Mode and Floating Panels

```text
setLayout("wiki" | "chat")
  -> workbenchState.layout = layout
  -> applyWorkbenchState()
  -> saveWorkbenchState()

hideChat() / showChat()
  -> update workbenchState.chatHidden
  -> applyWorkbenchState()
  -> saveWorkbenchState()

hideWiki() / showWiki()
  -> update workbenchState.wikiHidden
  -> applyWorkbenchState()
  -> saveWorkbenchState()
```

`applyWorkbenchState()` is the single place that mutates body classes and panel classes. CSS in [`styles.css`](styles.md) reads those classes to express the actual layout.

### Settings Panel Navigation

```text
openSettingsPanel()
  -> settings overlay visible
  -> setActiveSettingsSection(current or default)
  -> renderSettings()

setActiveSettingsSection(section)
  -> toggle nav button state
  -> toggle matching [data-settings-section-pane]
  -> loadDiagnostics() or loadCapabilities() for lazy sections
```

Each settings section owns its own render helpers, but the section switcher controls when expensive data is fetched.

### Startup Onboarding

```text
renderStartupOverlay()
  -> startupSettings()
  -> startupState()
  -> shouldShowStartupOverlay()
  -> startupWizardSteps()
  -> renderStartupWizardProgress()
  -> renderStartupWizardPanel()
  -> renderStartupPhases()

completeStartupOnboarding()
  -> fetch("/api/settings/startup/complete", { method: "POST" })
  -> appSettings = payload.settings
  -> renderStartupOverlay()
```

Startup is derived from settings and diagnostics. It guides the user through knowledge-base selection, Pi readiness, and model provider setup without blocking Wiki browsing.

### Knowledge-base Switching

```text
pickKnowledgeBasePath()
  -> window.GogoDesktop.selectKnowledgeBaseDirectory()
  -> applyKnowledgeBasePath(path)

applyKnowledgeBasePath(path, options)
  -> fetch("/api/settings/knowledge-base", { method: "PATCH", body })
  -> appSettings = payload.settings
  -> renderSettings()
  -> renderStartupOverlay()
  -> window.location.reload() unless reload is disabled
```

The reload is deliberate: changing the knowledge-base changes wiki indexes, capabilities, settings context, and active chat assumptions.

### Capability Editor

```text
loadCapabilities(force)
  -> fetch("/api/capabilities")
  -> capabilityState.items = payload.items
  -> renderCapabilitySettings()

loadCapabilityFile(path)
  -> ensureCapabilitySwitchAllowed()
  -> fetch(`/api/capabilities/file?path=...`)
  -> capabilityState.selected = payload
  -> renderCapabilityEditor()
  -> showCapabilityAgentsGuidance()

saveCapabilityFile()
  -> fetch("/api/capabilities/file", { method: "PUT", body })
  -> refreshSlashCommandsAfterCapabilityChange()
  -> loadCapabilities(true)
```

Capability edits stay in settings, while slash command refresh is delegated to `window.ChatWorkbench.reloadSlashCommands()`.

### Capability Create/Delete Flow

```text
createCapability("skill" | "schema")
  -> validate capabilityCreateNameInputEl
  -> fetch("/api/capabilities", { method: "POST", body })
  -> loadCapabilities(true)
  -> loadCapabilityFile(payload.path)

deleteCapability()
  -> confirm(...)
  -> fetch("/api/capabilities/file", { method: "DELETE", body })
  -> resetCapabilityEditor()
  -> refreshSlashCommandsAfterCapabilityChange()
  -> loadCapabilities(true)
```

The frontend validates only interaction-level concerns. Backend services still own path validation and file safety.

### Provider Configuration

```text
renderModelProviderSettings()
  -> renderProviderProfiles()
  -> renderApiTypeOptions()
  -> renderOauthPresetOptions()
  -> renderOauthAuthModeOptions()
  -> renderPiInstallActions()

saveProviderProfile()
  -> providerSavePayload()
  -> fetch("/api/settings/model-providers", { method: "PUT", body })
  -> appSettings = payload.settings
  -> renderSettings()
  -> refreshPiOptionsAfterProviderChange()
```

Provider configuration is settings-owned, but chat runtime options are refreshed through `window.ChatWorkbench.reloadPiOptions()`.

### Provider Import Flow

```text
importProviderConfigFromModelsText()
  -> tryImportProviderConfigFromModelsText()
  -> parseProviderImportPayload(text)
  -> pickImportedProviderConfig(source)
  -> normalizeImportedModelItem(rawItem)
  -> applyProviderImportPayload(payload)
```

The import flow accepts model/provider JSON in a few shapes and normalizes it into the provider form fields.

### Pi Install and Desktop Login

```text
triggerPiInstall()
  -> fetch("/api/settings/pi-install", { method: "POST" })
  -> pollPiInstallUntilSettled()
     -> loadAppSettings()
     -> renderPiInstallActions()
     -> stop on installed/error/timeout

triggerDesktopPiLogin(providerKey)
  -> fetch("/api/settings/pi-login", { method: "POST", body })
  -> poll loadAppSettings()
  -> compare providerDesktopLoginFingerprint()
  -> refreshPiOptionsAfterProviderChange()
```

These flows are desktop-aware and long-running. Poll tokens prevent stale login polling from updating the UI after a newer login attempt starts.

### Diagnostics and Local Path Actions

```text
loadDiagnostics(force)
  -> fetch("/api/diagnostics")
  -> diagnosticsState.data = payload
  -> renderDiagnostics()
  -> renderDiagnosticsActions()

exportDiagnosticsSummary()
  -> buildDiagnosticsSummary()
  -> downloadTextFile(...)

openDesktopPath(path, label)
  -> window.GogoDesktop.openPath(path)
  -> showSettingsToast() or diagnostics feedback
```

Diagnostics rendering is read-only except for local path opening and summary export.

### Security Settings

```text
renderSecurityControls()
  -> securitySettings()
  -> set select/help text

saveSecuritySettings()
  -> fetch("/api/settings/security", { method: "PATCH", body })
  -> loadDiagnostics(true)
  -> renderDiagnosticsActions()
```

Security settings are saved in workbench settings and reflected in diagnostics. Runtime security interruption UI is handled by [`chat.js`](chat.md), which has its own security settings reload path.

### Cross-module API

```text
window.WorkbenchUI = {
  getState,
  setLayout,
  hideChat,
  showChat,
  hideWiki,
  showWiki,
  ensureChatVisible,
  ensureWikiVisible,
  getAppSettings,
  showToast
}
```

[`wiki.js`](wiki.md) uses app settings, toasts, and layout helpers. [`chat.js`](chat.md) uses visibility helpers when injecting prompts or focusing the chat input.

## Dependencies

This file depends on:

- [`index.html`](../index-html.md) for stable topbar, layout, settings, startup, provider, capability, diagnostics, and security DOM IDs.
- [`desktop-bridge.js`](desktop-bridge.md) for directory picking, local path opening, and desktop detection.
- [`chat.js`](chat.md) for runtime refresh hooks after provider/capability/security changes.
- Backend routes documented in [`main.py`](../../backend/main.md), [`config.py`](../../backend/config.md), [`skill_service.py`](../../backend/skill_service.md), and [`security_service.py`](../../backend/security_service.md).

## Change Notes

This file coordinates many independent UI sections. Keep new API calls grouped by settings area, route product behavior through the owning module, and keep `window.WorkbenchUI` small enough to be a stable coordination surface rather than a general event bus.

## Key Function Reference

- `loadWorkbenchState()`: Reads persisted layout state from local storage.
- `saveWorkbenchState()`: Persists layout state to local storage.
- `applyWorkbenchState()`: Applies layout state to body and panel classes.
- `setLayout(layout)`: Switches between Wiki-first and Chat-first workbench modes.
- `hideChat()` / `showChat()`: Hide or restore the chat panel.
- `hideWiki()` / `showWiki()`: Hide or restore the Wiki panel.
- `showSettingsToast(message, variant, duration)`: Displays transient settings feedback.
- `openSettingsSection(section)`: Opens a specific settings section.
- `renderStartupOverlay()`: Renders onboarding state and actions.
- `completeStartupOnboarding()`: Persists startup completion.
- `loadCapabilities(force)`: Loads detected skills/schemas/capability files.
- `loadCapabilityFile(path, options)`: Loads one editable capability file.
- `saveCapabilityFile()`: Saves the selected capability file.
- `deleteCapability()`: Deletes the selected capability file.
- `createCapability(source)`: Creates a skill or schema file set.
- `loadDiagnostics(force)`: Loads diagnostics payload.
- `renderDiagnostics()`: Renders diagnostics lists and status chips.
- `exportDiagnosticsSummary()`: Downloads a text diagnostics summary.
- `loadAppSettings()`: Loads and renders the app settings payload.
- `applyKnowledgeBasePath(pathOverride, options)`: Saves the selected knowledge-base path.
- `pickKnowledgeBasePath(options)`: Uses the desktop directory picker and applies the selected path.
- `providerSavePayload()`: Builds the provider form payload.
- `saveProviderProfile()`: Saves a provider profile.
- `deleteProviderProfile(providerKey)`: Deletes a provider profile.
- `triggerPiInstall()`: Starts managed Pi runtime installation.
- `triggerDesktopPiLogin(providerKey)`: Starts desktop-assisted provider login and polls for completion.
- `saveSecuritySettings()`: Persists the selected security mode.
