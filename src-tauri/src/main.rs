mod backend;
mod commands;

use std::error::Error;
use std::env;
use std::io;

use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::desktop_runtime_info,
            commands::select_knowledge_base_directory,
            commands::open_path
        ])
        .setup(|app| -> Result<(), Box<dyn Error>> {
            let backend_state = if cfg!(debug_assertions) {
                let backend_url = env::var("GOGO_DESKTOP_BACKEND_URL")
                    .ok()
                    .filter(|value| !value.trim().is_empty())
                    .unwrap_or_else(|| "http://127.0.0.1:8000".to_string());
                backend::BackendState::dev(backend_url)
            } else {
                let runtime = backend::launch_backend()
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
