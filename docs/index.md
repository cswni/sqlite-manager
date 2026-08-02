# SQLite Manager

Dense local IDE for SQLite databases — open files, run SQL, browse rows, view ER diagrams, design schema, apply migrations, import/export, and talk to the same engine over MCP.

## Features

- **SQL studio** — CodeMirror editor, Ctrl/Cmd+Enter to run, result grid, query history
- **Explorer** — multi-connection schema tree
- **Data** — virtualized grid with cell edit when a primary key exists
- **Diagram** — ER view (React Flow) synced to foreign keys
- **Designer / Migrations** — DDL apply and folder-based `.sql` migrations
- **Import / Export** — CSV and JSON (XLSX via Python helpers)
- **MCP** — `sqliteman-mcp` stdio server for agents

## Quick start

```bash
# Engine (HTTP for browser UI)
go run ./core/cmd/sqliteman-core -listen 127.0.0.1:17832

# UI
pnpm --dir apps/web install
pnpm --dir apps/web dev
```

Open [http://localhost:3000](http://localhost:3000), enter a `.db` path, run SQL.

Desktop: see [Desktop](getting-started/desktop.md).
