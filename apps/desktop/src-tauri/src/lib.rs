use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::io::{BufRead, BufReader, Write};
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager, State};
use uuid::Uuid;

#[derive(Clone)]
struct CoreState {
    inner: Arc<Mutex<CoreInner>>,
}

struct CoreInner {
    child: Option<Child>,
    stdin: Option<ChildStdin>,
    pending: HashMap<String, tokio::sync::oneshot::Sender<RpcResponse>>,
}

#[derive(Serialize, Deserialize, Clone)]
struct RpcResponse {
    id: Option<Value>,
    result: Option<Value>,
    error: Option<String>,
}

fn spawn_core(app: &AppHandle) -> Result<(Child, ChildStdin, BufReader<std::process::ChildStdout>), String> {
    let sidecar = app
        .path()
        .resource_dir()
        .map_err(|e| e.to_string())
        .ok()
        .and_then(|d| {
            let p = d.join("binaries").join(sidecar_name());
            if p.exists() { Some(p) } else { None }
        });

    let bin = if let Some(p) = sidecar {
        p
    } else {
        // dev: repo bin/
        let mut cand = std::env::current_dir().map_err(|e| e.to_string())?;
        for _ in 0..5 {
            let p = cand.join("bin").join(sidecar_name());
            if p.exists() {
                return start_process(p);
            }
            if !cand.pop() {
                break;
            }
        }
        return Err(format!(
            "sqliteman-core binary not found (looked for {})",
            sidecar_name()
        ));
    };
    start_process(bin)
}

fn sidecar_name() -> String {
    if cfg!(windows) {
        "sqliteman-core.exe".into()
    } else {
        "sqliteman-core".into()
    }
}

fn start_process(
    bin: std::path::PathBuf,
) -> Result<(Child, ChildStdin, BufReader<std::process::ChildStdout>), String> {
    let mut cmd = Command::new(&bin);
    cmd.stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null());

    // Hide the sidecar console window on Windows (avoids a second cmd popping up)
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("spawn {}: {e}", bin.display()))?;
    let stdin = child.stdin.take().ok_or("no stdin")?;
    let stdout = child.stdout.take().ok_or("no stdout")?;
    Ok((child, stdin, BufReader::new(stdout)))
}

fn ensure_core(app: &AppHandle, state: &CoreState) -> Result<(), String> {
    let mut g = state.inner.lock().map_err(|e| e.to_string())?;
    if g.child.is_some() {
        return Ok(());
    }
    let (child, stdin, mut reader) = spawn_core(app)?;
    g.child = Some(child);
    g.stdin = Some(stdin);

    let pending = state.inner.clone();
    std::thread::spawn(move || {
        let mut line = String::new();
        loop {
            line.clear();
            match reader.read_line(&mut line) {
                Ok(0) => break,
                Ok(_) => {
                    if let Ok(res) = serde_json::from_str::<RpcResponse>(&line) {
                        let id = res
                            .id
                            .as_ref()
                            .and_then(|v| match v {
                                Value::String(s) => Some(s.clone()),
                                Value::Number(n) => Some(n.to_string()),
                                _ => None,
                            });
                        if let Some(id) = id {
                            if let Ok(mut g) = pending.lock() {
                                if let Some(tx) = g.pending.remove(&id) {
                                    let _ = tx.send(res);
                                }
                            }
                        }
                    }
                }
                Err(_) => break,
            }
        }
    });
    Ok(())
}

#[tauri::command]
async fn core_rpc(
    app: AppHandle,
    state: State<'_, CoreState>,
    method: String,
    params: Value,
) -> Result<RpcResponse, String> {
    ensure_core(&app, &state)?;
    let id = Uuid::new_v4().to_string();
    let (tx, rx) = tokio::sync::oneshot::channel();
    {
        let mut g = state.inner.lock().map_err(|e| e.to_string())?;
        g.pending.insert(id.clone(), tx);
        let req = serde_json::json!({
            "id": id,
            "method": method,
            "params": params,
        });
        let stdin = g.stdin.as_mut().ok_or("core not started")?;
        writeln!(stdin, "{req}").map_err(|e| e.to_string())?;
        stdin.flush().map_err(|e| e.to_string())?;
    }
    tokio::time::timeout(std::time::Duration::from_secs(120), rx)
        .await
        .map_err(|_| "core rpc timeout".to_string())?
        .map_err(|_| "core rpc cancelled".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .manage(CoreState {
            inner: Arc::new(Mutex::new(CoreInner {
                child: None,
                stdin: None,
                pending: HashMap::new(),
            })),
        })
        .invoke_handler(tauri::generate_handler![core_rpc])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
