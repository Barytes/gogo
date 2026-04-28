# `app/backend/skill_service.py`

Source: [`app/backend/skill_service.py`](../../../app/backend/skill_service.py)

`skill_service.py` reads and edits the knowledge base's agent-facing capabilities.

## Role

Gogo intentionally exposes the knowledge base's capabilities instead of hiding them behind a fixed UI. This service makes `skills/` and `schemas/` visible, searchable, editable, and usable as slash commands.

## Capability Sources

The service reads from:

- `skills/`, where each skill usually has its own directory and `SKILL.md`.
- `schemas/`, where markdown or schema-like files describe structured knowledge formats.

Both roots are resolved relative to the active knowledge base from [`config.py`](config.md).

## Discovery

Public discovery functions include:

- `list_skills()` for skill cards and capability browsing.
- `list_schemas()` for schema cards and structured knowledge browsing.
- `list_slash_commands()` for chat input slash command suggestions.
- `list_capability_entries()` for the capability editor tree.

Metadata is extracted from frontmatter when available, with fallback heuristics that infer names and descriptions from file content.

## Editing

Capability editing is exposed through:

- `get_capability_file()` to read a file under supported capability roots.
- `save_capability_file()` to update an existing capability file.
- `create_capability_file()` to create a skill, schema, or support file.
- `delete_capability_file()` to remove a capability file.

The create path understands skill and schema conventions so the UI can create useful files without forcing the user to know every directory detail.

## Slash Commands

Slash command entries are built from the same capability records exposed in the settings panel. This keeps chat invocation and capability editing aligned: if the user changes a skill or schema in the knowledge base, the slash list should reflect that same local source of truth.

## Path Safety

`_resolve_capability_path()` validates that editable paths stay inside `skills/`, `schemas/`, or the root `AGENTS.md`. The service should not become a general-purpose file editor for the whole knowledge base.

## Main Function Call Chains

### Slash Command Discovery

```text
list_slash_commands()
  -> list_skills()
  -> _skills_dir()
  -> _parse_frontmatter()
  -> _guess_metadata_from_text()
  -> _normalize_skill_name()
  -> list_schemas()
  -> _schemas_dir()
  -> _strip_schema_suffix()
  -> sorted skill/schema command records
```

The chat slash list and the capability editor read from the same local files, so changes in the knowledge base are reflected without app-only registration state.

### Capability Tree

```text
list_capability_entries()
  -> list_skills()
  -> include SKILL.md records
  -> include README.md / AGENTS.md support files
  -> list_schemas()
  -> include schema files and support docs
  -> include root AGENTS.md when present
```

This is the settings-panel view. It is broader than slash commands because it also includes editable support documents.

### Read and Save

```text
get_capability_file()
  -> _resolve_capability_path()
  -> read text

save_capability_file()
  -> _resolve_capability_path()
  -> write text
```

Both paths rely on the same resolver so read/write permissions stay aligned.

### Create and Delete

```text
create_capability_file()
  -> normalize source and name
  -> _normalize_skill_name()
  -> create skills/<slug>/SKILL.md
     or schemas/<slug>.md
  -> get_capability_file()

delete_capability_file()
  -> _resolve_capability_path()
  -> protect root AGENTS.md and support docs
  -> remove skill directory or schema file
```

Create/delete operations enforce project conventions instead of exposing arbitrary filesystem mutation.

## Dependencies

[`main.py`](main.md) exposes this service through `/api/knowledge-base/skills`, `/api/knowledge-base/slash-commands`, `/api/knowledge-base/capabilities`, and `/api/knowledge-base/capability-file`.

## Change Notes

When adding a new capability type, keep the rule clear: the capability should be user-owned, knowledge-base-local, and understandable as part of the llm-wiki workflow. Avoid app-only hidden capability state.

## Function Reference

- `_skills_dir()`: Returns the active knowledge base's `skills/` directory.
- `_schemas_dir()`: Returns the active knowledge base's `schemas/` directory.
- `_parse_frontmatter(text)`: Parses simple YAML-like frontmatter key/value pairs from a Markdown document.
- `_normalize_skill_name(value, fallback)`: Converts a display name into a slash-command-friendly slug.
- `_strip_schema_suffix(filename)`: Removes common schema suffixes from a filename to derive a fallback schema name.
- `_guess_metadata_from_text(text)`: Reads frontmatter or inline `title/name/description` lines from a capability file.
- `list_skills()`: Discovers skill directories that contain `SKILL.md` and returns slash-command metadata.
- `list_schemas()`: Discovers schema files, reads JSON/Markdown metadata, and returns slash-command metadata.
- `list_slash_commands()`: Combines skills and schemas into the sorted slash command list used by chat input.
- `list_capability_entries()`: Builds the settings-panel capability tree, including support docs such as `README.md`, `AGENTS.md`, and root `AGENTS.md`.
- `_resolve_capability_path(relative_path)`: Validates editable capability paths and restricts them to supported files under `skills/`, `schemas/`, or root `AGENTS.md`.
- `get_capability_file(relative_path)`: Reads one validated capability file.
- `save_capability_file(relative_path, content)`: Writes one validated existing capability file.
- `create_capability_file(source, name, description)`: Creates a new skill `SKILL.md` or schema Markdown file from a starter template.
- `delete_capability_file(relative_path)`: Deletes a skill directory or schema file while protecting support docs and root `AGENTS.md`.
