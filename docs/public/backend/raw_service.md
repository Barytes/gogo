# `app/backend/raw_service.py`

Source: [`app/backend/raw_service.py`](../../../app/backend/raw_service.py)

`raw_service.py` provides filesystem access for the knowledge base's `raw/` directory.

## Role

The `raw/` directory stores source material that belongs to the knowledge base but is not necessarily a polished wiki page. This service exposes that directory to the frontend while keeping all paths constrained inside the active knowledge base.

## Public Operations

- `list_raw_files()` returns metadata for files under `raw/`.
- `get_raw_file()` returns one file with metadata and content when it is readable as text.
- `create_raw_file()` creates a new Markdown file under `raw/`.
- `save_raw_file()` updates a Markdown raw file.
- `delete_raw_file()` removes a Markdown raw file.
- `search_raw_files()` searches text-like files for a query.
- `get_raw_file_path()` returns a safe filesystem path for download/preview routes.

## Path Safety

Two helper families enforce boundaries:

- `_safe_raw_path()` resolves existing files and rejects paths outside `knowledge-base/raw`.
- `_safe_raw_target_path()` resolves create/save targets and rejects traversal, absolute paths, and non-Markdown write targets.

This module must never expose arbitrary local filesystem access. Every path accepted from the frontend should stay relative to `raw/`.

## Content Handling

The service distinguishes text-like files from binary or unsupported files. Text-like files can be summarized, searched, and returned with content. Other files can still appear in listings and be downloaded through safe paths.

Summaries are intentionally lightweight: they are derived from the first useful text content rather than from a model or indexing service.

## Main Function Call Chains

### List and Search

```text
list_raw_files()
  -> _iter_raw_files()
  -> _raw_record(include_content=False)
  -> _guess_content_type()
  -> _summary_for_file()

search_raw_files()
  -> list_raw_files()
  -> get_raw_file() for searchable text records
```

Raw search stays simple and filesystem-backed. It does not build a persistent index.

### Read and Download

```text
get_raw_file(relative_path)
  -> _safe_raw_path()
  -> _raw_record(include_content=True)
  -> _read_text() when textual

get_raw_file_path(relative_path)
  -> _safe_raw_path()
```

The download route in `main.py` uses `get_raw_file_path()` so file serving still passes through raw path validation.

### Create, Save, and Delete

```text
create_raw_file()
  -> _safe_raw_target_path()
  -> write temp file
  -> replace target
  -> _raw_record(include_content=True)

save_raw_file()
  -> _safe_raw_path()
  -> require textual file
  -> write temp file
  -> replace target
  -> _raw_record(include_content=True)

delete_raw_file()
  -> _safe_raw_path()
  -> unlink file
  -> prune empty parent directories
```

Raw writes are intentionally narrower than raw reads: only textual files should be edited through this Markdown browser path.

## Dependencies

The active raw root comes from [`config.py`](config.md), which resolves the current knowledge-base directory. Route handlers in [`main.py`](main.md) call this service for API responses and download path validation.

## Change Notes

When expanding raw file support, keep write operations narrower than read operations. Reading many file types is useful, but creating and editing should remain conservative unless the frontend editor explicitly supports the file type.

## Function Reference

- `_raw_dir()`: Returns the active knowledge base's `raw/` directory.
- `_iter_raw_files()`: Lists non-hidden files recursively under `raw/`.
- `_safe_raw_path(relative_path)`: Resolves an existing file path and rejects anything outside `raw/`.
- `_safe_raw_target_path(relative_path)`: Resolves a create/save target and restricts writable files to Markdown.
- `_guess_content_type(path)`: Infers MIME type from the filename.
- `_is_textual(path)`: Checks whether a file extension is safe to read/search as text.
- `_read_text(path)`: Reads a text file with replacement for invalid UTF-8.
- `_summary_from_text(text)`: Picks the first non-empty line as a lightweight summary.
- `_summary_for_file(path)`: Returns a text-derived summary or a file-type summary for binary/PDF files.
- `_raw_record(path, include_content)`: Builds the frontend-facing raw file payload.
- `list_raw_files()`: Returns records for all raw files.
- `get_raw_file(relative_path)`: Returns one raw file record with content when textual.
- `create_raw_file(relative_path, content)`: Creates a new Markdown raw file through an atomic temp-file write.
- `delete_raw_file(relative_path)`: Deletes a Markdown raw file and prunes empty parent directories.
- `save_raw_file(relative_path, content)`: Rewrites an existing Markdown raw file through an atomic temp-file replace.
- `search_raw_files(query, limit)`: Searches title, summary, path, and textual content for matching raw files.
- `get_raw_file_path(relative_path)`: Returns a safe filesystem path for preview/download routes.
