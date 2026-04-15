use std::env;
use std::io::{Read, Write};
use std::net::{SocketAddr, TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::thread;
use std::time::{Duration, Instant};

use anyhow::{anyhow, Context, Result};

const BACKEND_HOST: &str = "127.0.0.1";
const HEALTH_PATH: &str = "/api/health";
const HEALTH_TIMEOUT: Duration = Duration::from_secs(30);
const HEALTH_POLL_INTERVAL: Duration = Duration::from_millis(300);

#[derive(Debug)]
struct Launcher {
    label: String,
    program: String,
    args: Vec<String>,
}

pub struct BackendRuntime {
    pub backend_url: String,
    child: Mutex<Option<Child>>,
}

pub struct BackendState {
    pub backend_url: String,
    runtime: Option<BackendRuntime>,
}

impl BackendState {
    pub fn dev(backend_url: String) -> Self {
        Self {
            backend_url,
            runtime: None,
        }
    }

    pub fn managed(runtime: BackendRuntime) -> Self {
        let backend_url = runtime.backend_url.clone();
        Self {
            backend_url,
            runtime: Some(runtime),
        }
    }
}

impl Drop for BackendState {
    fn drop(&mut self) {
        if let Some(runtime) = self.runtime.as_ref() {
            runtime.stop();
        }
    }
}

impl BackendRuntime {
    fn new(backend_url: String, child: Child) -> Self {
        Self {
            backend_url,
            child: Mutex::new(Some(child)),
        }
    }

    pub fn stop(&self) {
        let Ok(mut guard) = self.child.lock() else {
            return;
        };
        if let Some(child) = guard.as_mut() {
            let _ = child.kill();
            let _ = child.wait();
        }
        *guard = None;
    }
}

impl Drop for BackendRuntime {
    fn drop(&mut self) {
        self.stop();
    }
}

pub fn launch_backend() -> Result<BackendRuntime> {
    let app_root = resolve_app_root()?;
    let port = pick_available_port()?;
    let backend_url = format!("http://{BACKEND_HOST}:{port}");
    let launchers = build_launchers(&app_root, port);
    let mut last_error: Option<anyhow::Error> = None;

    for launcher in launchers {
        match spawn_backend(&app_root, &backend_url, &launcher) {
            Ok(mut child) => match wait_for_backend_ready(&mut child, port) {
                Ok(()) => return Ok(BackendRuntime::new(backend_url.clone(), child)),
                Err(error) => {
                    let _ = child.kill();
                    let _ = child.wait();
                    last_error = Some(anyhow!(
                        "launcher `{}` started but backend did not become ready: {error}",
                        launcher.label
                    ));
                }
            },
            Err(error) => {
                last_error = Some(anyhow!(
                    "launcher `{}` failed to start: {error}",
                    launcher.label
                ));
            }
        }
    }

    Err(last_error.unwrap_or_else(|| anyhow!("no backend launcher succeeded")))
}

fn resolve_app_root() -> Result<PathBuf> {
    if let Ok(raw) = env::var("GOGO_APP_ROOT") {
        let candidate = PathBuf::from(raw);
        if is_app_root(&candidate) {
            return Ok(candidate);
        }
    }

    let current_dir = env::current_dir().context("failed to read current dir")?;
    if is_app_root(&current_dir) {
        return Ok(current_dir);
    }

    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let candidate = manifest_dir
        .parent()
        .map(Path::to_path_buf)
        .ok_or_else(|| anyhow!("failed to resolve app root from CARGO_MANIFEST_DIR"))?;
    if is_app_root(&candidate) {
        return Ok(candidate);
    }

    Err(anyhow!(
        "could not resolve gogo-app root; set GOGO_APP_ROOT explicitly"
    ))
}

fn is_app_root(path: &Path) -> bool {
    path.join("app/backend/main.py").exists() && path.join("app/frontend/index.html").exists()
}

fn pick_available_port() -> Result<u16> {
    let listener = TcpListener::bind((BACKEND_HOST, 0)).context("failed to bind a free port")?;
    let port = listener.local_addr().context("failed to read local addr")?.port();
    drop(listener);
    Ok(port)
}

fn build_launchers(app_root: &Path, port: u16) -> Vec<Launcher> {
    let mut launchers = Vec::new();

    if let Ok(raw_python) = env::var("GOGO_DESKTOP_PYTHON") {
        let candidate = raw_python.trim();
        if !candidate.is_empty() {
            launchers.push(python_launcher(
                "env:GOGO_DESKTOP_PYTHON",
                candidate,
                port,
            ));
        }
    }

    let venv_python_unix = app_root.join(".venv/bin/python");
    if venv_python_unix.exists() {
        launchers.push(python_launcher(
            ".venv/bin/python",
            &venv_python_unix.to_string_lossy(),
            port,
        ));
    }

    let venv_python_windows = app_root.join(".venv/Scripts/python.exe");
    if venv_python_windows.exists() {
        launchers.push(python_launcher(
            ".venv/Scripts/python.exe",
            &venv_python_windows.to_string_lossy(),
            port,
        ));
    }

    launchers.push(Launcher {
        label: "uv run uvicorn".to_string(),
        program: "uv".to_string(),
        args: vec![
            "run".to_string(),
            "uvicorn".to_string(),
            "app.backend.main:app".to_string(),
            "--host".to_string(),
            BACKEND_HOST.to_string(),
            "--port".to_string(),
            port.to_string(),
        ],
    });

    launchers.push(python_launcher("python3", "python3", port));
    launchers.push(python_launcher("python", "python", port));

    launchers
}

fn python_launcher(label: &str, program: &str, port: u16) -> Launcher {
    Launcher {
        label: label.to_string(),
        program: program.to_string(),
        args: vec![
            "-m".to_string(),
            "uvicorn".to_string(),
            "app.backend.main:app".to_string(),
            "--host".to_string(),
            BACKEND_HOST.to_string(),
            "--port".to_string(),
            port.to_string(),
        ],
    }
}

fn spawn_backend(app_root: &Path, backend_url: &str, launcher: &Launcher) -> Result<Child> {
    let mut command = Command::new(&launcher.program);
    command
        .args(&launcher.args)
        .current_dir(app_root)
        .stdin(Stdio::null())
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .env("GOGO_RUNTIME", "desktop")
        .env("GOGO_DESKTOP_BACKEND_URL", backend_url)
        .env("PYTHONUNBUFFERED", "1");

    command
        .spawn()
        .with_context(|| format!("failed to spawn `{}`", launcher.program))
}

fn wait_for_backend_ready(child: &mut Child, port: u16) -> Result<()> {
    let deadline = Instant::now() + HEALTH_TIMEOUT;

    while Instant::now() < deadline {
        if let Some(status) = child.try_wait().context("failed to poll backend child")? {
            return Err(anyhow!("backend exited early with status {status}"));
        }

        if healthcheck_ok(port) {
            return Ok(());
        }

        thread::sleep(HEALTH_POLL_INTERVAL);
    }

    Err(anyhow!(
        "timed out waiting for backend healthcheck on {BACKEND_HOST}:{port}"
    ))
}

fn healthcheck_ok(port: u16) -> bool {
    let socket_addr = SocketAddr::from(([127, 0, 0, 1], port));
    let Ok(mut stream) = TcpStream::connect_timeout(&socket_addr, Duration::from_millis(500)) else {
        return false;
    };

    let _ = stream.set_read_timeout(Some(Duration::from_millis(500)));
    let _ = stream.set_write_timeout(Some(Duration::from_millis(500)));

    let request = format!(
        "GET {HEALTH_PATH} HTTP/1.1\r\nHost: {BACKEND_HOST}:{port}\r\nConnection: close\r\n\r\n"
    );

    if stream.write_all(request.as_bytes()).is_err() {
        return false;
    }

    let mut response = String::new();
    if stream.read_to_string(&mut response).is_err() {
        return false;
    }

    response.starts_with("HTTP/1.1 200") || response.starts_with("HTTP/1.0 200")
}
