from __future__ import annotations

from pathlib import Path
from typing import Any
import re

from .config import get_knowledge_base_dir

KNOWLEDGE_BASE_DIR = get_knowledge_base_dir()
WIKI_DIR = KNOWLEDGE_BASE_DIR / "wiki"


def _iter_wiki_files() -> list[Path]:
    return sorted(path for path in WIKI_DIR.rglob("*.md") if path.is_file())


def _read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _title_from_text(text: str, fallback: str) -> str:
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("# "):
            return stripped[2:].strip()
    return fallback


def _summary_from_text(text: str) -> str:
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith(("#", "-", "*", ">", "`")):
            continue
        return stripped[:180]
    return "No summary available yet."


def _category_for_path(path: Path) -> str:
    rel_path = path.relative_to(WIKI_DIR)
    if len(rel_path.parts) == 1:
        return "root"
    return rel_path.parts[0]


def _safe_wiki_path(relative_path: str) -> Path:
    candidate = (WIKI_DIR / relative_path).resolve()
    if WIKI_DIR.resolve() not in candidate.parents and candidate != WIKI_DIR.resolve():
        raise ValueError("Path must stay inside knowledge-base/wiki.")
    if candidate.suffix != ".md":
        raise ValueError("Only markdown pages are supported.")
    if not candidate.exists():
        raise FileNotFoundError(relative_path)
    return candidate


def _page_record(path: Path, include_content: bool = False) -> dict[str, Any]:
    text = _read_text(path)
    rel_path = path.relative_to(WIKI_DIR).as_posix()
    record: dict[str, Any] = {
        "source": "wiki",
        "path": rel_path,
        "title": _title_from_text(text, path.stem),
        "summary": _summary_from_text(text),
        "category": _category_for_path(path),
        "section": path.parent.relative_to(WIKI_DIR).as_posix() or "root",
        "modified_at": path.stat().st_mtime,
        "size": path.stat().st_size,
        "content_type": "text/markdown",
        "is_text": True,
        "render_mode": "markdown",
    }
    if include_content:
        record["content"] = text
    return record


def list_pages() -> list[dict[str, Any]]:
    return [_page_record(path) for path in _iter_wiki_files()]


def get_page(relative_path: str) -> dict[str, Any]:
    return _page_record(_safe_wiki_path(relative_path), include_content=True)


def _match_score(query: str, page: dict[str, Any]) -> int:
    if not query.strip():
        return 0

    normalized_query = query.lower()
    ascii_tokens = re.findall(r"[a-z0-9]+", normalized_query)
    cjk_fragments = re.findall(r"[\u4e00-\u9fff]+", normalized_query)

    tokens = list(ascii_tokens)
    for fragment in cjk_fragments:
        if len(fragment) <= 4:
            tokens.append(fragment)
            continue
        tokens.extend(fragment[index : index + 2] for index in range(len(fragment) - 1))

    haystack_title = page["title"].lower()
    haystack_summary = page["summary"].lower()
    content = page.get("content", "").lower()
    score = 0
    for token in tokens:
        score += haystack_title.count(token) * 5
        score += haystack_summary.count(token) * 3
        score += content.count(token)
    return score


def search_pages(query: str, limit: int = 12) -> list[dict[str, Any]]:
    enriched_pages = []
    for path in _iter_wiki_files():
        page = _page_record(path, include_content=True)
        score = _match_score(query, page)
        if score > 0 or not query.strip():
            page["score"] = score
            enriched_pages.append(page)

    enriched_pages.sort(
        key=lambda page: (page["score"], page["modified_at"], page["title"]),
        reverse=True,
    )
    trimmed = []
    for page in enriched_pages[:limit]:
        page_copy = dict(page)
        page_copy.pop("content", None)
        trimmed.append(page_copy)
    return trimmed


def get_tree() -> dict[str, Any]:
    root: dict[str, Any] = {
        "name": "wiki",
        "path": "",
        "type": "directory",
        "children": [],
    }

    nodes: dict[str, dict[str, Any]] = {"": root}

    def ensure_dir(rel_dir: str) -> dict[str, Any]:
        if rel_dir in nodes:
            return nodes[rel_dir]

        parent_rel = "/".join(rel_dir.split("/")[:-1])
        parent = ensure_dir(parent_rel)
        node = {
            "name": rel_dir.split("/")[-1],
            "path": rel_dir,
            "type": "directory",
            "children": [],
        }
        parent["children"].append(node)
        nodes[rel_dir] = node
        return node

    for path in _iter_wiki_files():
        rel_path = path.relative_to(WIKI_DIR).as_posix()
        rel_dir = path.parent.relative_to(WIKI_DIR).as_posix()
        if rel_dir == ".":
            rel_dir = ""
        parent = ensure_dir(rel_dir)
        parent["children"].append(
            {
                "name": _title_from_text(_read_text(path), path.stem),
                "path": rel_path,
                "type": "file",
                "category": _category_for_path(path),
            }
        )

    def sort_node(node: dict[str, Any]) -> None:
        if node["type"] != "directory":
            return
        node["children"].sort(
            key=lambda child: (child["type"] != "directory", child["name"].lower())
        )
        for child in node["children"]:
            sort_node(child)

    sort_node(root)
    return root
