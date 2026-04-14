from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
from pathlib import Path

from dotenv import load_dotenv


APP_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_KNOWLEDGE_BASE_DIR = APP_ROOT.parent / "knowledge-base"
APP_STATE_DIR = (APP_ROOT.parent / ".gogo").resolve()
APP_SETTINGS_FILE = APP_STATE_DIR / "app-settings.json"

load_dotenv(APP_ROOT / ".env")


def _load_app_settings() -> dict:
    if not APP_SETTINGS_FILE.exists():
        return {}
    try:
        return json.loads(APP_SETTINGS_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _save_app_settings(data: dict) -> None:
    APP_STATE_DIR.mkdir(parents=True, exist_ok=True)
    APP_SETTINGS_FILE.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def _resolve_knowledge_base_dir(raw_path: str | None) -> Path:
    base_dir = Path(raw_path).expanduser() if raw_path else DEFAULT_KNOWLEDGE_BASE_DIR
    return base_dir.resolve()


def get_knowledge_base_dir() -> Path:
    settings = _load_app_settings()
    raw_path = str(settings.get("knowledge_base_dir") or "").strip()
    if raw_path:
        return _resolve_knowledge_base_dir(raw_path)
    env_path = os.getenv("KNOWLEDGE_BASE_DIR")
    return _resolve_knowledge_base_dir(env_path)


def _knowledge_base_display_name(path: Path) -> str:
    name = path.name.strip()
    return name or str(path)


def _knowledge_base_session_namespace(path: Path) -> str:
    slug_source = _knowledge_base_display_name(path).lower()
    slug = re.sub(r"[^a-z0-9\u4e00-\u9fff]+", "-", slug_source, flags=re.IGNORECASE).strip("-")
    slug = slug[:32] or "knowledge-base"
    digest = hashlib.sha1(str(path).encode("utf-8")).hexdigest()[:8]
    return f"{slug}-{digest}"


def get_knowledge_base_settings() -> dict[str, object]:
    path = get_knowledge_base_dir()
    settings = _load_app_settings()
    recent_items = settings.get("recent_knowledge_bases")
    recent_paths: list[dict[str, str]] = []
    if isinstance(recent_items, list):
        for item in recent_items:
            raw = str(item or "").strip()
            if not raw:
                continue
            resolved = _resolve_knowledge_base_dir(raw)
            recent_paths.append(
                {
                    "path": str(resolved),
                    "name": _knowledge_base_display_name(resolved),
                }
            )
    deduped: list[dict[str, str]] = []
    seen: set[str] = set()
    current_path = str(path)
    for item in [{"path": current_path, "name": _knowledge_base_display_name(path)}, *recent_paths]:
        key = item["path"]
        if key in seen:
            continue
        seen.add(key)
        deduped.append(item)
    return {
        "path": current_path,
        "name": _knowledge_base_display_name(path),
        "session_namespace": _knowledge_base_session_namespace(path),
        "recent": deduped[:8],
    }


def set_knowledge_base_dir(raw_path: str) -> dict[str, object]:
    candidate = _resolve_knowledge_base_dir(raw_path.strip())
    wiki_dir = candidate / "wiki"
    raw_dir = candidate / "raw"
    if not candidate.exists() or not candidate.is_dir():
        raise ValueError("知识库路径不存在，或不是目录。")
    if not wiki_dir.exists() or not wiki_dir.is_dir():
        raise ValueError("知识库目录下缺少 `wiki/` 子目录。")
    if not raw_dir.exists() or not raw_dir.is_dir():
        raise ValueError("知识库目录下缺少 `raw/` 子目录。")

    settings = _load_app_settings()
    settings["knowledge_base_dir"] = str(candidate)
    recent_items = settings.get("recent_knowledge_bases")
    recent_paths = [str(item or "").strip() for item in recent_items] if isinstance(recent_items, list) else []
    recent_paths = [path for path in recent_paths if path and _resolve_knowledge_base_dir(path) != candidate]
    settings["recent_knowledge_bases"] = [str(candidate), *recent_paths][:8]
    _save_app_settings(settings)
    return get_knowledge_base_settings()


def get_pi_command() -> str:
    return os.getenv("PI_COMMAND", "pi").strip() or "pi"


def get_pi_command_path() -> str | None:
    configured = shutil.which(get_pi_command())
    if configured:
        return configured
    return shutil.which("pi")


def get_pi_timeout_seconds() -> int | None:
    raw_value = os.getenv("PI_TIMEOUT_SECONDS", "").strip().lower()
    if raw_value in {"", "0", "off", "none", "false", "no"}:
        return None
    try:
        parsed = int(raw_value)
    except ValueError:
        return None
    if parsed <= 0:
        return None
    return max(10, parsed)


def get_pi_thinking_level() -> str:
    allowed = {"off", "minimal", "low", "medium", "high", "xhigh"}
    value = os.getenv("PI_THINKING_LEVEL", "medium").strip().lower()
    if value in allowed:
        return value
    return "medium"


def get_pi_workdir() -> Path:
    raw_path = os.getenv("PI_WORKDIR")
    if raw_path:
        return Path(raw_path).expanduser().resolve()
    return get_knowledge_base_dir()


def get_pi_rpc_session_dir() -> Path:
    raw_path = os.getenv("PI_RPC_SESSION_DIR")
    if raw_path:
        base_dir = Path(raw_path).expanduser().resolve()
    else:
        base_dir = (APP_ROOT.parent / ".gogo" / "pi-rpc-sessions").resolve()
    return (base_dir / _knowledge_base_session_namespace(get_knowledge_base_dir())).resolve()
