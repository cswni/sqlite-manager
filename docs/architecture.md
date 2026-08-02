# Architecture

```mermaid
flowchart LR
  UI[Next.js UI]
  Tauri[Tauri 2 Rust]
  Core[Go sqliteman-core]
  MCP[Go sqliteman-mcp]
  DB[(SQLite files)]

  UI -->|invoke / HTTP RPC| Tauri
  UI -->|dev HTTP| Core
  Tauri -->|stdin JSON-RPC| Core
  MCP -->|same packages| Core
  Core --> DB
```

| Layer | Role |
|---|---|
| `apps/web` | Dense IDE UI (static export) |
| `apps/desktop` | Window, dialogs, sidecar lifecycle |
| `core` | SQLite engine + JSON-RPC (`open`, `query`, `schema`, …) |
| `mcp` | MCP tools over the same engine |
| `python/utils` | Optional CSV/XLSX scripts |

Driver: pure-Go `modernc.org/sqlite` for easy cross-compile in CI.
