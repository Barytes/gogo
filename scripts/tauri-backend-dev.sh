#!/bin/sh

set -eu

APP_ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$APP_ROOT"

HOST="127.0.0.1"
PORT="8000"

run_backend() {
  launcher_label="$1"
  shift
  echo "[gogo-tauri-dev] starting backend via ${launcher_label}"
  exec "$@" app.backend.main:app --host "$HOST" --port "$PORT"
}

if [ -n "${GOGO_DESKTOP_PYTHON:-}" ]; then
  run_backend "GOGO_DESKTOP_PYTHON" "$GOGO_DESKTOP_PYTHON" -m uvicorn
fi

if [ -x "$APP_ROOT/.venv/bin/python" ]; then
  run_backend ".venv/bin/python" "$APP_ROOT/.venv/bin/python" -m uvicorn
fi

if [ -x "$APP_ROOT/.venv/Scripts/python.exe" ]; then
  run_backend ".venv/Scripts/python.exe" "$APP_ROOT/.venv/Scripts/python.exe" -m uvicorn
fi

if command -v uv >/dev/null 2>&1; then
  echo "[gogo-tauri-dev] starting backend via uv run uvicorn"
  exec uv run uvicorn app.backend.main:app --host "$HOST" --port "$PORT"
fi

if command -v python3 >/dev/null 2>&1; then
  run_backend "python3" python3 -m uvicorn
fi

if command -v python >/dev/null 2>&1; then
  run_backend "python" python -m uvicorn
fi

echo "[gogo-tauri-dev] no usable Python launcher found" >&2
exit 1
