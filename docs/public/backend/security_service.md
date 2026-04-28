# `app/backend/security_service.py`

Source: [`app/backend/security_service.py`](../../../app/backend/security_service.py)

`security_service.py` manages the local Pi security boundary.

## Role

This module defines what host filesystem and command access Pi is allowed to use when launched by Gogo. It is part of the product safety boundary, not just a settings helper.

The core rule is that Gogo should make agent capability visible and configurable without silently expanding access beyond the user-selected workspace.

## Security Modes

The service normalizes supported modes such as:

- `readonly` for browse-oriented use with limited mutation.
- `workspace-write` for normal local knowledge-base work.
- `full-access` for advanced users who explicitly choose broader host access.

Mode metadata is exposed to the settings UI so the user can understand the tradeoff before changing it.

## Trusted Roots

Trusted workspace roots are derived from the active knowledge base and app-managed runtime paths. Path checks normalize host paths and detect whether a target stays inside trusted roots.

The security extension uses this information to decide whether Pi operations should be allowed, blocked, logged, or routed through a temporary approval flow.

## Generated Security Extension

`_build_security_extension_source()` renders a managed TypeScript extension consumed by Pi. The generated extension enforces:

- Filesystem read/write/edit restrictions.
- Dangerous command checks for shell operations.
- Protected path detection.
- Allow/block audit logging.
- Approval-aware behavior for actions that the user temporarily permits.

`get_pi_security_extension_paths()` and `get_pi_security_extension_args()` expose this extension to Pi invocation code.

## Approvals and Logs

Temporary approvals are persisted separately from general settings. The approval flow:

- Accepts approval payloads from the settings/API layer.
- Stores expiry timestamps.
- Prunes expired approvals.
- Lets the generated extension grant narrowly scoped temporary access.

Recent JSONL logs are read for diagnostics so users can see what was allowed or blocked.

The primary chat UI now answers inline security prompts through Pi RPC `extension_ui_response`. `pi-security-approvals.json` remains as a compatibility and narrow pre-approval mechanism, but it is not the main path for the chat modal's "allow once" interaction.

## Main Function Call Chains

### Security Settings Read

```text
get_pi_security_settings()
  -> _current_security_mode()
  -> _security_mode_meta()
  -> _trusted_workspace_items()
  -> _ensure_security_extension()
  -> _load_security_approvals()
  -> _prune_security_approvals()
  -> _read_recent_jsonl()
```

This is the diagnostics/settings payload path. It combines current mode, generated extension path, trusted roots, approval state, and recent audit rows.

### Security Mode Update

```text
update_pi_security_settings()
  -> _normalize_security_mode()
  -> _load_app_settings()
  -> _save_app_settings()
  -> _ensure_security_extension()
  -> get_pi_security_settings()
```

The caller in `main.py` resets the session pool after this chain so future Pi RPC launches load the updated generated extension.

### One-Time Approval

```text
create_pi_security_approval()
  -> _load_security_approvals()
  -> _prune_security_approvals()
  -> validate tool / command / target path
  -> _save_security_approvals()
```

Approvals are intentionally narrow and time-bound. They are separate from global security mode changes.

### Managed Extension Generation

```text
get_pi_security_extension_args()
  -> get_pi_security_extension_paths()
  -> _ensure_security_extension()
  -> _build_security_extension_source()
  -> _trusted_workspace_items()
  -> _find_dangerous_bash_rule()
  -> _is_within_trusted_roots()
  -> _detect_protected_path()
```

The generated extension carries the current workspace roots, dangerous-command rules, protected path rules, and approval/log paths into Pi.

## Public Operations

- `create_pi_security_approval()` records a temporary approval.
- `get_pi_security_extension_args()` returns Pi CLI args for loading the managed security extension.
- `get_pi_security_settings()` returns settings, mode metadata, trusted roots, approvals, and logs.
- `update_pi_security_settings()` updates the selected security mode.

## Dependencies

This service depends on [`config.py`](config.md) for app state paths and knowledge-base roots. It is consumed by [`main.py`](main.md), [`agent_service.py`](agent_service.md), and [`session_manager.py`](session_manager.md) when building Pi RPC commands.

## Change Notes

Changes here deserve extra caution. Prefer explicit, narrow allowances over broad exceptions. If a new Pi tool or host action is added, document whether it is read-only, workspace-scoped, approval-gated, or full-access only.

## Function Reference

- `_load_app_settings()`: Loads app settings from the shared Gogo settings file.
- `_save_app_settings(data)`: Persists app settings after security mode changes.
- `_normalize_security_mode(raw_value)`: Converts raw settings into one of the supported security modes.
- `_security_mode_meta(mode)`: Returns UI-facing label, description, and risk metadata for a mode.
- `_current_security_mode()`: Reads the active security mode from settings with a safe default.
- `_trusted_workspace_items()`: Builds the list of host roots that should be trusted for the current workspace.
- `_render_ts_string(value)`: Escapes strings for generated TypeScript source.
- `_render_ts_json(value)`: Renders JSON values for generated TypeScript source.
- `_normalize_host_path(value)`: Normalizes host paths into comparable absolute path strings.
- `_is_within_trusted_roots(target_path)`: Checks whether a target path is inside an allowed workspace root.
- `_detect_protected_path(target_path)`: Returns the protected-root label when a path points into a sensitive host area.
- `_regex_flags_from_string(raw_flags)`: Converts serialized regex flags into Python `re` flags.
- `_find_dangerous_bash_rule(command)`: Matches shell commands against dangerous-command rules.
- `_load_security_approvals()`: Loads temporary security approvals from app state.
- `_save_security_approvals(items)`: Persists temporary security approvals.
- `_parse_approval_datetime(raw_value)`: Parses approval expiry timestamps.
- `_approval_is_expired(item, now)`: Returns whether one approval has expired.
- `_prune_security_approvals(items)`: Removes expired approvals before returning or saving approval state.
- `create_pi_security_approval(payload)`: Validates and stores a narrow temporary approval for `bash`, `write`, or `edit`.
- `_build_security_extension_source()`: Generates the TypeScript source for the managed Pi security extension.
- `_ensure_security_extension()`: Writes the managed security extension to disk and returns its path.
- `get_pi_security_extension_paths()`: Returns security extension paths that should be passed to Pi.
- `get_pi_security_extension_args()`: Converts security extension paths into `--extension` CLI args.
- `_read_recent_jsonl(path, limit)`: Reads recent audit log rows from a JSONL file for diagnostics.
- `get_pi_security_settings()`: Returns UI-facing security mode, trusted roots, approvals, logs, and extension status.
- `update_pi_security_settings(payload)`: Validates and saves a new security mode.
