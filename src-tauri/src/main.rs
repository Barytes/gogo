mod backend;
mod commands;

use std::env;
use std::error::Error;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};

use serde_json::{Map, Value};
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_dialog::DialogExt;

const COMPANION_KNOWLEDGE_BASE_DIRNAME: &str = "gogo-knowledge-base";

fn is_knowledge_base_dir(path: &Path) -> bool {
    path.join("wiki").is_dir() && path.join("raw").is_dir()
}

fn is_empty_directory(path: &Path) -> bool {
    fs::read_dir(path)
        .ok()
        .map(|mut entries| entries.next().is_none())
        .unwrap_or(false)
}

fn load_configured_knowledge_base_dir(app_state_dir: &Path) -> Option<PathBuf> {
    let settings_path = app_state_dir.join("app-settings.json");
    let raw = fs::read_to_string(settings_path).ok()?;
    let parsed = serde_json::from_str::<Value>(&raw).ok()?;
    let candidate = parsed
        .get("knowledge_base_dir")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())?;
    Some(PathBuf::from(candidate))
}

fn persist_configured_knowledge_base_dir(
    app_state_dir: &Path,
    knowledge_base_dir: &Path,
) -> io::Result<()> {
    let settings_path = app_state_dir.join("app-settings.json");
    let mut root = match fs::read_to_string(&settings_path)
        .ok()
        .and_then(|raw| serde_json::from_str::<Value>(&raw).ok())
    {
        Some(Value::Object(map)) => map,
        _ => Map::new(),
    };

    let knowledge_base_dir_string = knowledge_base_dir.to_string_lossy().into_owned();
    root.insert(
        "knowledge_base_dir".to_string(),
        Value::String(knowledge_base_dir_string.clone()),
    );

    let mut recent_paths = vec![Value::String(knowledge_base_dir_string)];
    if let Some(existing) = root.get("recent_knowledge_bases").and_then(Value::as_array) {
        for item in existing {
            let Some(path) = item
                .as_str()
                .map(str::trim)
                .filter(|value| !value.is_empty())
            else {
                continue;
            };
            if recent_paths.iter().any(|value| {
                value
                    .as_str()
                    .is_some_and(|existing_path| existing_path == path)
            }) {
                continue;
            }
            recent_paths.push(Value::String(path.to_string()));
            if recent_paths.len() >= 8 {
                break;
            }
        }
    }
    root.insert(
        "recent_knowledge_bases".to_string(),
        Value::Array(recent_paths),
    );

    fs::create_dir_all(app_state_dir)?;
    let encoded = serde_json::to_string_pretty(&Value::Object(root))
        .map_err(|error| io::Error::other(error.to_string()))?;
    fs::write(settings_path, encoded)
}

fn normalize_companion_knowledge_base_dir(selected_dir: PathBuf) -> PathBuf {
    if is_knowledge_base_dir(&selected_dir) || is_empty_directory(&selected_dir) {
        selected_dir
    } else {
        selected_dir.join(COMPANION_KNOWLEDGE_BASE_DIRNAME)
    }
}

fn resolve_initial_knowledge_base_dir<R: tauri::Runtime>(
    app: &tauri::App<R>,
    app_state_dir: &Path,
    fallback_dir: &Path,
) -> Result<PathBuf, Box<dyn Error>> {
    if let Some(existing_path) = load_configured_knowledge_base_dir(app_state_dir) {
        return Ok(existing_path);
    }

    let selected_dir = app
        .dialog()
        .file()
        .blocking_pick_folder()
        .and_then(|file_path| file_path.into_path().ok())
        .map(normalize_companion_knowledge_base_dir)
        .unwrap_or_else(|| fallback_dir.to_path_buf());

    persist_configured_knowledge_base_dir(app_state_dir, &selected_dir)
        .map_err(|error| -> Box<dyn Error> { Box::new(error) })?;

    Ok(selected_dir)
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::desktop_runtime_info,
            commands::select_knowledge_base_directory,
            commands::open_path
        ])
        .setup(|app| -> Result<(), Box<dyn Error>> {
            let backend_state = if tauri::is_dev() {
                let backend_url = env::var("GOGO_DESKTOP_BACKEND_URL")
                    .ok()
                    .filter(|value| !value.trim().is_empty())
                    .unwrap_or_else(|| "http://127.0.0.1:8000".to_string());
                backend::BackendState::dev(backend_url)
            } else {
                let resource_dir = app
                    .path()
                    .resource_dir()
                    .map_err(|error| io::Error::other(error.to_string()))?;
                let app_state_dir = app
                    .path()
                    .app_data_dir()
                    .map_err(|error| io::Error::other(error.to_string()))?;
                let companion_template_dir = resource_dir.join("knowledge-base");
                let fallback_knowledge_base_dir = app_state_dir.join("knowledge-base");
                let default_knowledge_base_dir = resolve_initial_knowledge_base_dir(
                    app,
                    &app_state_dir,
                    &fallback_knowledge_base_dir,
                )
                .map_err(|error| io::Error::other(error.to_string()))?;
                let runtime = backend::launch_backend(
                    resource_dir,
                    app_state_dir,
                    companion_template_dir,
                    default_knowledge_base_dir,
                )
                .map_err(|error| io::Error::other(error.to_string()))?;
                backend::BackendState::managed(runtime)
            };
            let backend_url = backend_state.backend_url.clone();
            app.manage(backend_state);

            let url = WebviewUrl::External(
                backend_url
                    .parse()
                    .map_err(|error| -> Box<dyn Error> { Box::new(error) })?,
            );

            WebviewWindowBuilder::new(app, "main", url)
                .title("gogo-app")
                .inner_size(1480.0, 980.0)
                .min_inner_size(1120.0, 760.0)
                .build()
                .map(|_| ())
                .map_err(|error| -> Box<dyn Error> { Box::new(error) })?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("failed to run gogo-app tauri shell");
}
