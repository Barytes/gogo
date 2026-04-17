from __future__ import annotations

import os

import uvicorn

from app.backend.main import app


def _backend_host() -> str:
    return str(os.getenv("GOGO_BACKEND_HOST") or "127.0.0.1").strip() or "127.0.0.1"


def _backend_port() -> int:
    raw_value = str(os.getenv("GOGO_BACKEND_PORT") or "8000").strip()
    try:
        return int(raw_value)
    except ValueError:
        return 8000


def main() -> None:
    uvicorn.run(app, host=_backend_host(), port=_backend_port(), log_level="info")


if __name__ == "__main__":
    main()
