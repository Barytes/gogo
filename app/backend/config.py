from __future__ import annotations

import os
import shutil
from pathlib import Path

from dotenv import load_dotenv


APP_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_KNOWLEDGE_BASE_DIR = APP_ROOT.parent / "knowledge-base"

load_dotenv(APP_ROOT / ".env")


def get_knowledge_base_dir() -> Path:
    raw_path = os.getenv("KNOWLEDGE_BASE_DIR")
    base_dir = Path(raw_path).expanduser() if raw_path else DEFAULT_KNOWLEDGE_BASE_DIR
    return base_dir.resolve()


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
        return Path(raw_path).expanduser().resolve()
    return (APP_ROOT.parent / ".gogo" / "pi-rpc-sessions").resolve()
