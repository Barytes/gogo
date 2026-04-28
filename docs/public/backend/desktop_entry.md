# `app/backend/desktop_entry.py`

Source: [`app/backend/desktop_entry.py`](../../../app/backend/desktop_entry.py)

`desktop_entry.py` is the packaged backend entry point used by the desktop build path.

## Role

The desktop app starts a local Python backend process and connects the Tauri shell to that local server. This file is the minimal Python-side executable for that process.

It imports [`main.py`](main.md) as the ASGI app target and starts it through `uvicorn`.

## Configuration

The entry point reads:

- `GOGO_BACKEND_HOST` for the bind host.
- `GOGO_BACKEND_PORT` for the bind port.

If those variables are absent or invalid, the module falls back to local development defaults. The desktop shell is responsible for deciding the exact host and port it wants to launch.

## Main Function Call Chain

```text
python -m app.backend.desktop_entry
  -> main()
  -> _backend_host()
  -> _backend_port()
  -> uvicorn.run(app, host=..., port=..., log_level="info")
```

`desktop_entry.py` imports `app` from [`main.py`](main.md). All route definitions, session lifecycle, static serving, and Pi behavior remain in the normal FastAPI app.

## Boundaries

This file should stay small. It should not contain product settings, route definitions, Pi process management, or Tauri orchestration logic.

## Change Notes

When changing this file, check the packaged desktop path rather than only `uvicorn app.backend.main:app` development usage. Import-time side effects should stay minimal so backend startup failures are easy to diagnose.

## Function Reference

- `_backend_host()`: Reads `GOGO_BACKEND_HOST` and returns the host the desktop backend should bind to.
- `_backend_port()`: Reads `GOGO_BACKEND_PORT`, coerces it to an integer, and falls back to the default backend port when invalid.
- `main()`: Starts `uvicorn` with `app.backend.main:app` for the desktop-packaged backend process.
