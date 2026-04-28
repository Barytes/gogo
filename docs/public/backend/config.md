# `app/backend/config.py`

Source: [`app/backend/config.py`](../../../app/backend/config.py)

`config.py` centralizes runtime configuration, local app state, knowledge-base selection, Pi command discovery, and model provider profiles.

## Role

Most backend modules depend on this file. It defines where Gogo reads user content from, where it stores app-owned state, how it invokes Pi, and how managed provider configuration is exposed to Pi through extensions.

Because this module defines filesystem and runtime boundaries, changes should be conservative and easy to reason about.

## Runtime and State Roots

The module separates several important locations:

- The project/app root used for bundled assets and development defaults.
- The app state directory used for user settings, Pi auth integration, generated extensions, and session support files.
- The active knowledge-base directory, which is user-owned content.
- The Pi working directory and Pi RPC session directory.

`get_gogo_runtime()` and `is_desktop_runtime()` distinguish desktop packaging from web/development usage. Desktop-specific behavior should be guarded through these helpers rather than scattered environment checks.

## Knowledge-Base Selection

Knowledge-base selection is handled through:

- `get_knowledge_base_dir()` for the resolved active path.
- `get_knowledge_base_settings()` for UI-facing state such as display name, path, and recent entries.
- `get_startup_settings()` and `complete_startup_onboarding()` for first-run flow.
- `set_knowledge_base_dir()` for validating and switching to a user-selected workspace.

The selected directory is treated as user-owned. Gogo should provide access to `wiki/`, `raw/`, `inbox/`, `skills/`, `schemas/`, and root `AGENTS.md`, but it should not assume ownership of the entire workspace.

## Pi Runtime Configuration

Pi invocation is resolved through:

- `get_pi_command()` for the command string used by backend chat flows.
- `get_pi_command_path()` for the effective executable path when one can be determined.
- `get_managed_pi_command_path()` and `get_bundled_pi_command_path()` for desktop/bundled command discovery.
- `get_pi_timeout_seconds()` for request timeout behavior.
- `get_pi_thinking_level()` for the default thinking setting.
- `get_pi_workdir()` for the process working directory.
- `get_pi_rpc_session_dir()` for Pi session persistence.

Backend code should use these helpers instead of reading environment variables or settings files directly.

## Model Provider Profiles

Gogo stores app-managed model provider profiles and renders them into a generated Pi extension. The public API surface is:

- `get_model_provider_settings()` for settings UI payloads.
- `upsert_model_provider_profile()` for creating or updating a provider.
- `delete_model_provider_profile()` for removing a provider.
- `get_pi_extension_paths()` and `get_pi_extension_args()` for passing generated provider extensions into Pi RPC.

The provider code normalizes provider keys, display names, auth modes, model lists, and timestamp metadata. It also supports known OAuth presets and API-key references without forcing all providers into one authentication model.

## Generated Extensions

`_write_managed_provider_extension()` renders provider configuration into TypeScript extension source consumed by Pi. This keeps provider setup visible and inspectable instead of hiding it behind opaque backend logic.

Generated files belong to app state, not to the user's knowledge base. The knowledge base should remain portable and independent from Gogo's local runtime files.

## Main Function Call Chains

### Settings File Access

```text
_load_app_settings()
  -> _load_json_file(APP_SETTINGS_FILE, {})

_save_app_settings()
  -> _save_json_file(APP_SETTINGS_FILE, data)

_load_pi_auth() / _save_pi_auth()
  -> _load_json_file() / _save_json_file(private=True)

_load_pi_settings_json() / _save_pi_settings_json()
  -> _load_json_file() / _save_json_file()
```

Most public operations begin by loading app settings, Pi auth, or Pi settings and end by writing normalized state back to disk.

### Knowledge-Base Resolution

```text
get_knowledge_base_dir()
  -> _load_app_settings()
  -> _resolve_knowledge_base_dir()
  -> _ensure_default_knowledge_base_dir()
  -> _ensure_companion_knowledge_base_dir() in desktop runtime
  -> _is_valid_knowledge_base_dir()

get_knowledge_base_settings()
  -> get_knowledge_base_dir()
  -> _knowledge_base_display_name()
  -> _knowledge_base_session_namespace()
  -> _load_app_settings()

set_knowledge_base_dir()
  -> _resolve_knowledge_base_dir()
  -> _is_valid_knowledge_base_dir()
  -> _save_app_settings()
  -> get_knowledge_base_settings()
```

This chain keeps workspace selection centralized. Other services should call `get_knowledge_base_dir()` rather than resolving workspace paths on their own.

### Pi Command and Runtime Paths

```text
get_pi_command_path()
  -> get_bundled_pi_command_path()
  -> get_managed_pi_command_path()
  -> get_pi_command()
  -> PATH lookup

get_pi_workdir()
  -> configured PI_WORKDIR
     or get_knowledge_base_dir()

get_pi_rpc_session_dir()
  -> app state session root
  -> _knowledge_base_session_namespace(get_knowledge_base_dir())
```

Pi command discovery intentionally prefers packaged/bundled runtime paths before falling back to the user's shell `PATH`.

### Provider Profile Save

```text
upsert_model_provider_profile()
  -> _load_app_settings()
  -> _load_pi_auth()
  -> _normalize_provider_key()
  -> _parse_models_text()
  -> _normalize_oauth_auth_mode()
  -> _save_app_settings()
  -> _save_pi_auth()
  -> _save_pi_settings_json()
  -> _write_managed_provider_extension()
  -> get_model_provider_settings()
```

Saving a provider updates both app-managed profile metadata and Pi-facing auth/settings files when credentials or defaults are present.

### Provider Settings Read

```text
get_model_provider_settings()
  -> _load_app_settings()
  -> _load_pi_auth()
  -> _managed_provider_profiles()
  -> _profile_payload_from_profile()
  -> _write_managed_provider_extension()
```

The read path also ensures the managed provider extension exists and reflects the current profile set.

### Managed Extension Args

```text
get_pi_extension_args()
  -> get_pi_extension_paths()
  -> _write_managed_provider_extension()
  -> ["--extension", path, ...]
```

Session and legacy agent code append these args whenever they launch `pi --mode rpc`.

## Dependencies

This module should remain near the bottom of the dependency graph. Other backend services can import `config.py`, but `config.py` should avoid importing higher-level services such as `main.py`, `session_manager.py`, or `agent_service.py`.

## Change Notes

When changing configuration behavior, check both desktop and development flows. A path change can affect wiki browsing, raw file access, sessions, generated extensions, security approvals, and Pi login/install diagnostics at the same time.

## Function Reference

- `_load_json_file(path, default)`: Reads a JSON file and returns `default` when the file is missing or invalid.
- `_save_json_file(path, data, private)`: Writes formatted JSON and optionally restricts permissions for secret-bearing files.
- `_load_app_settings()`: Loads Gogo app settings from `app-settings.json`.
- `_save_app_settings(data)`: Persists Gogo app settings.
- `_load_pi_auth()`: Loads Pi auth credentials from `~/.pi/agent/auth.json`.
- `_save_pi_auth(data)`: Persists Pi auth credentials with private file permissions.
- `_load_pi_settings_json()`: Loads Pi settings from `~/.pi/agent/settings.json`.
- `_save_pi_settings_json(data)`: Persists Pi settings.
- `_trimmed(value)`: Converts a value to a stripped string for consistent settings normalization.
- `_is_valid_knowledge_base_dir(path)`: Checks that a directory exists and contains required `wiki/` and `raw/` subdirectories.
- `_ensure_default_knowledge_base_dir()`: Resolves the default knowledge-base directory and prepares the desktop companion copy if needed.
- `_ensure_companion_knowledge_base_dir(candidate)`: In desktop runtime, copies a companion/template knowledge base into place when the target is missing or invalid.
- `get_gogo_runtime()`: Returns the normalized runtime name, currently `desktop` or `web`.
- `is_desktop_runtime()`: Returns whether the current runtime is desktop.
- `_resolve_knowledge_base_dir(raw_path)`: Resolves a configured or default knowledge-base path and applies companion setup.
- `get_knowledge_base_dir()`: Returns the active knowledge-base directory from app settings, environment, or default fallback.
- `_knowledge_base_display_name(path)`: Derives a user-facing name from a knowledge-base path.
- `_knowledge_base_session_namespace(path)`: Builds a stable per-knowledge-base namespace for Pi RPC session storage.
- `get_knowledge_base_settings()`: Returns UI-facing knowledge-base settings, including path, name, namespace, and recent workspaces.
- `get_startup_settings()`: Returns first-run/onboarding state and current/default knowledge-base paths.
- `complete_startup_onboarding()`: Marks onboarding as complete and returns updated startup settings.
- `set_knowledge_base_dir(raw_path)`: Validates and stores a new active knowledge-base directory and updates recent workspaces.
- `get_pi_command()`: Returns the configured Pi command name, defaulting to `pi`.
- `get_managed_pi_command_path()`: Finds an app-managed Pi binary under Gogo's runtime directory.
- `get_bundled_pi_command_path()`: Finds a bundled Pi binary shipped with the app.
- `get_pi_command_path()`: Resolves the effective Pi executable path, preferring bundled, then managed, then `PATH`.
- `get_pi_timeout_seconds()`: Reads and normalizes `PI_TIMEOUT_SECONDS`.
- `get_pi_thinking_level()`: Reads and validates the default Pi thinking level.
- `get_pi_workdir()`: Returns the Pi working directory, defaulting to the active knowledge base.
- `get_pi_rpc_session_dir()`: Returns the namespaced directory where Pi RPC session files are stored.
- `_normalize_provider_key(raw_value)`: Converts provider identifiers into stable lowercase keys.
- `_provider_display_name(provider_key, display_name)`: Chooses an explicit, preset, or fallback provider display name.
- `_normalize_oauth_auth_mode(raw_value, default)`: Normalizes OAuth auth mode to desktop Pi login or manual tokens.
- `_oauth_auth_mode_label(mode)`: Returns the UI label for an OAuth auth mode.
- `_is_known_oauth_preset(provider_key)`: Checks whether a provider key is one of the built-in OAuth presets.
- `_default_api_key_reference(provider_key)`: Builds the environment variable reference used in generated provider extensions.
- `_parse_model_flag(value, truthy, falsy)`: Converts model-list text flags into optional booleans.
- `_normalize_model_config_item(raw_item)`: Validates and normalizes one model config object.
- `_extract_models_array_from_json(parsed)`: Finds a `models` array in supported JSON shapes.
- `_normalize_models_json_text(raw_value)`: Prepares user-provided model JSON text for parsing.
- `_parse_models_json(raw_value)`: Parses JSON model configuration and returns normalized model records.
- `_parse_models_text(raw_value)`: Parses either JSON model configuration or line-based `id | name | flags` text.
- `_serialize_models_text(models)`: Serializes model records back into the JSON text format used by settings UI.
- `_timestamp_ms()`: Returns the current timestamp in milliseconds.
- `_coerce_ms(raw_value)`: Converts a raw value into a positive millisecond timestamp when possible.
- `_escape_ts_string(value)`: Escapes a string for generated TypeScript source by using JSON string encoding.
- `_render_ts_value(value, indent)`: Renders Python values into TypeScript literals for generated provider extensions.
- `_managed_provider_profiles(settings)`: Extracts normalized app-managed provider profile records from app settings.
- `_default_oauth_auth_mode(profile, auth_entry)`: Determines the effective OAuth auth mode from profile config and detected Pi auth data.
- `_requires_extension(profile)`: Returns whether a provider profile needs a generated Pi extension.
- `_build_provider_extension_config(profile)`: Converts a provider profile into the config object passed to `pi.registerProvider`.
- `_write_managed_provider_extension(settings)`: Generates or removes the managed TypeScript provider extension.
- `get_pi_extension_paths()`: Returns generated provider extension paths that should be passed to Pi.
- `get_pi_extension_args()`: Converts extension paths into `--extension` CLI args.
- `_profile_payload_from_profile(profile, auth_entry)`: Builds a UI-facing provider payload from app profile data and Pi auth data.
- `get_model_provider_settings()`: Returns all provider settings, OAuth presets, API types, defaults, and related file paths.
- `upsert_model_provider_profile(payload)`: Validates and saves an API or OAuth provider profile, updates credentials, and regenerates extensions.
- `delete_model_provider_profile(provider_key)`: Removes a provider profile, related auth/default settings, and regenerated extension state.
