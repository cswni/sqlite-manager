# SQLite Manager

Dense local IDE for SQLite — schema explorer, SQL editor, data grid, ER diagram, designer, migrations, import/export, and MCP.

## Stack

| Layer | Tech |
|---|---|
| Desktop shell | Tauri 2 (Rust) |
| UI | Next.js 15 (static export) |
| Engine | Go `sqliteman-core` JSON-RPC sidecar |
| Agents | Go `sqliteman-mcp` (stdio MCP) |
| Utils | Python CSV/XLSX helpers |

## Develop

```bash
# Terminal 1 — core HTTP for browser UI
go run ./core/cmd/sqliteman-core -listen 127.0.0.1:17832

# Terminal 2 — web UI
pnpm --dir apps/web install
pnpm --dir apps/web dev
```

Open http://localhost:3000 — open a `.db` path and run SQL (Ctrl/Cmd+Enter).

### Desktop (Tauri)

```bash
go build -o bin/sqliteman-core.exe ./core/cmd/sqliteman-core   # Windows
# go build -o bin/sqliteman-core ./core/cmd/sqliteman-core    # Unix

pnpm --dir apps/desktop install
pnpm --dir apps/desktop tauri dev
```

### Tests

```bash
cd core && go test ./...
pnpm --dir apps/web build
```

## MCP

```bash
go build -o bin/sqliteman-mcp.exe ./mcp/cmd/sqliteman-mcp
```

Cursor / Claude MCP config example:

```json
{
  "mcpServers": {
    "sqliteman": {
      "command": "D:/dev/sqlite-manager/bin/sqliteman-mcp.exe"
    }
  }
}
```

Tools: `sqlite_open`, `sqlite_schema`, `sqlite_query`, `sqlite_exec`, `sqlite_export`.

## Releases

Push a `v*` tag. GitHub Actions builds Go binaries and Tauri installers (Windows / macOS / Linux) via `.github/workflows/release.yml`.

## Layout

```
apps/web          Next.js UI
apps/desktop      Tauri 2
core/             Go engine + RPC
mcp/              MCP server
python/utils      optional CSV/XLSX scripts
packages/protocol shared type mirror
```
