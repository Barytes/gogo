from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv


APP_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_KNOWLEDGE_BASE_DIR = APP_ROOT.parent / "knowledge-base"

load_dotenv(APP_ROOT / ".env")


def get_knowledge_base_dir() -> Path:
    raw_path = os.getenv("KNOWLEDGE_BASE_DIR")
    base_dir = Path(raw_path).expanduser() if raw_path else DEFAULT_KNOWLEDGE_BASE_DIR
    return base_dir.resolve()
