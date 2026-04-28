# `app/backend/wiki_service.py`

Source: [`app/backend/wiki_service.py`](../../../app/backend/wiki_service.py)

`wiki_service.py` provides filesystem access for the knowledge base's `wiki/` directory.

## Role

The `wiki/` directory is the primary browsable knowledge surface in a local llm-wiki workspace. This service gives the frontend structured access to wiki pages without turning Gogo into a general-purpose file manager.

## Public Operations

- `list_pages()` returns page summaries for browsing and search setup.
- `get_page()` returns one page with full Markdown content.
- `create_page()` creates a new Markdown page.
- `save_page()` updates an existing Markdown page.
- `delete_page()` removes a Markdown page.
- `search_pages()` ranks pages against a text query.
- `get_tree()` builds the nested tree used by the wiki sidebar.

## Page Records

Page records include:

- Relative path inside `wiki/`.
- Title inferred from the first Markdown heading or filename.
- Category inferred from folder structure.
- Lightweight summary text.
- Optional full content when requested.

This is intentionally filesystem-first. There is no database or embedding index between the Markdown files and the app.

## Search Behavior

`search_pages()` uses simple text matching and scoring. It favors direct matches in title/path/content and returns a limited result set. This matches Gogo's design principle of trusting the local filesystem plus the agent's own reading ability instead of maintaining a separate RAG service.

## Path Safety

`_safe_wiki_path()` validates existing page paths. `_safe_wiki_target_path()` validates create/update targets. Both keep access inside `knowledge-base/wiki` and restrict wiki writes to Markdown files.

## Main Function Call Chains

### List and Search

```text
list_pages()
  -> _iter_wiki_files()
  -> _page_record(include_content=False)
  -> _title_from_text()
  -> _summary_from_text()
  -> _category_for_path()

search_pages()
  -> list_pages()
  -> get_page() for content-bearing records
  -> _match_score()
```

Listing is metadata-first. Search adds content inspection only when it needs text to score matches.

### Read Page

```text
get_page(relative_path)
  -> _safe_wiki_path()
  -> _page_record(include_content=True)
  -> _read_text()
```

The safety helper resolves the requested path before the file is read.

### Create, Save, and Delete

```text
create_page()
  -> _safe_wiki_target_path()
  -> write temp file
  -> replace target
  -> _page_record(include_content=True)

save_page()
  -> _safe_wiki_path()
  -> write temp file
  -> replace target
  -> _page_record(include_content=True)

delete_page()
  -> _safe_wiki_path()
  -> unlink file
  -> prune empty parent directories
```

Write paths use temp-file replacement so partially written Markdown is less likely to be observed by the frontend.

### Tree

```text
get_tree()
  -> _iter_wiki_files()
  -> ensure_dir()
  -> _page_record()
  -> sort_node()
```

`ensure_dir()` and `sort_node()` are nested helpers used only to build the sidebar tree payload.

## Dependencies

The wiki root is resolved through [`config.py`](config.md). API routes in [`main.py`](main.md) expose this service to the frontend.

## Change Notes

When adding wiki behavior, preserve the assumption that the user's Markdown remains portable. Avoid storing app-only metadata inside page files unless the user can understand and edit it directly.

## Function Reference

- `_wiki_dir()`: Returns the active knowledge base's `wiki/` directory.
- `_iter_wiki_files()`: Lists Markdown files recursively under `wiki/`.
- `_read_text(path)`: Reads a Markdown file as UTF-8 text.
- `_title_from_text(text, fallback)`: Extracts the first H1 heading as the title, falling back to the filename stem.
- `_summary_from_text(text)`: Picks the first non-empty, non-markup-looking line as a summary.
- `_category_for_path(path)`: Uses the first folder under `wiki/` as the page category, or `root` for top-level pages.
- `_safe_wiki_path(relative_path)`: Resolves an existing Markdown page and rejects traversal outside `wiki/`.
- `_safe_wiki_target_path(relative_path)`: Resolves a create/save target and requires a Markdown suffix.
- `_page_record(path, include_content)`: Builds the frontend-facing wiki page payload.
- `list_pages()`: Returns summary records for all wiki pages.
- `get_page(relative_path)`: Returns one wiki page with full Markdown content.
- `create_page(relative_path, content)`: Creates a new Markdown page through an atomic temp-file write.
- `delete_page(relative_path)`: Deletes a page and prunes empty parent directories.
- `save_page(relative_path, content)`: Rewrites an existing page through an atomic temp-file replace.
- `_match_score(query, page)`: Scores title/path matches for ASCII tokens and CJK fragments.
- `search_pages(query, limit)`: Returns scored wiki search results without full content.
- `get_tree()`: Builds a sorted directory/file tree for the wiki sidebar.
- `ensure_dir(rel_dir)`: Nested helper inside `get_tree()` that creates or returns directory nodes while preserving parent-child links.
- `sort_node(node)`: Nested helper inside `get_tree()` that sorts directories before files and recursively sorts child nodes.
