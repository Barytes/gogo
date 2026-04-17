import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, "..");
const host = process.env.GOGO_BACKEND_HOST || "127.0.0.1";
const port = process.env.GOGO_BACKEND_PORT || "8000";

const env = {
  ...process.env,
  GOGO_RUNTIME: "desktop",
};

function spawnBackend(command, args, label) {
  const child = spawn(command, args, {
    cwd: appRoot,
    env,
    stdio: "inherit",
  });

  child.on("spawn", () => {
    console.log(`[gogo-tauri-dev] starting backend via ${label}`);
  });

  child.on("error", (error) => {
    if (error && error.code === "ENOENT") {
      return;
    }
    console.error(`[gogo-tauri-dev] failed to start backend via ${label}: ${error}`);
    process.exit(1);
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.exit(1);
      return;
    }
    process.exit(code ?? 0);
  });

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
      child.kill(signal);
    });
  }
}

function run() {
  const candidates = [];
  const configuredPython = String(process.env.GOGO_DESKTOP_PYTHON || "").trim();
  if (configuredPython) {
    candidates.push({
      label: "GOGO_DESKTOP_PYTHON",
      command: configuredPython,
      args: ["-m", "uvicorn", "app.backend.main:app", "--host", host, "--port", port],
    });
  }

  const venvUnix = path.join(appRoot, ".venv", "bin", "python");
  if (existsSync(venvUnix)) {
    candidates.push({
      label: ".venv/bin/python",
      command: venvUnix,
      args: ["-m", "uvicorn", "app.backend.main:app", "--host", host, "--port", port],
    });
  }

  const venvWindows = path.join(appRoot, ".venv", "Scripts", "python.exe");
  if (existsSync(venvWindows)) {
    candidates.push({
      label: ".venv/Scripts/python.exe",
      command: venvWindows,
      args: ["-m", "uvicorn", "app.backend.main:app", "--host", host, "--port", port],
    });
  }

  candidates.push({
    label: "uv run uvicorn",
    command: "uv",
    args: ["run", "uvicorn", "app.backend.main:app", "--host", host, "--port", port],
  });

  candidates.push({
    label: "python3",
    command: "python3",
    args: ["-m", "uvicorn", "app.backend.main:app", "--host", host, "--port", port],
  });

  candidates.push({
    label: "python",
    command: "python",
    args: ["-m", "uvicorn", "app.backend.main:app", "--host", host, "--port", port],
  });

  const next = candidates.shift();
  if (!next) {
    console.error("[gogo-tauri-dev] no usable Python launcher found");
    process.exit(1);
  }

  const child = spawn(next.command, next.args, {
    cwd: appRoot,
    env,
    stdio: "inherit",
  });

  child.on("spawn", () => {
    console.log(`[gogo-tauri-dev] starting backend via ${next.label}`);
  });

  child.on("error", (error) => {
    if (error && error.code === "ENOENT") {
      runFallback(candidates);
      return;
    }
    console.error(`[gogo-tauri-dev] failed to start backend via ${next.label}: ${error}`);
    process.exit(1);
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.exit(1);
      return;
    }
    process.exit(code ?? 0);
  });

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
      child.kill(signal);
    });
  }
}

function runFallback(candidates) {
  const next = candidates.shift();
  if (!next) {
    console.error("[gogo-tauri-dev] no usable Python launcher found");
    process.exit(1);
  }

  const child = spawn(next.command, next.args, {
    cwd: appRoot,
    env,
    stdio: "inherit",
  });

  child.on("spawn", () => {
    console.log(`[gogo-tauri-dev] starting backend via ${next.label}`);
  });

  child.on("error", (error) => {
    if (error && error.code === "ENOENT") {
      runFallback(candidates);
      return;
    }
    console.error(`[gogo-tauri-dev] failed to start backend via ${next.label}: ${error}`);
    process.exit(1);
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.exit(1);
      return;
    }
    process.exit(code ?? 0);
  });

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
      child.kill(signal);
    });
  }
}

run();
