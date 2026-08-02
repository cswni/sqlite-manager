# Install

## Prerequisites

- Go 1.22+
- Node.js 20+ and pnpm
- Rust (stable) + Tauri prerequisites for desktop builds
- Python 3 (optional, for XLSX helpers)

## Binaries

From a release tag, download:

- Desktop installer (Windows / macOS / Linux)
- `sqliteman-core-*` sidecar
- `sqliteman-mcp-*` for MCP clients

Or build from source:

```bash
go build -o bin/sqliteman-core ./core/cmd/sqliteman-core
go build -o bin/sqliteman-mcp ./mcp/cmd/sqliteman-mcp
pnpm --dir apps/web install && pnpm --dir apps/web build
```
