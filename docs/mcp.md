# MCP

Build:

```bash
go build -o bin/sqliteman-mcp ./mcp/cmd/sqliteman-mcp
```

Cursor / Claude Desktop example:

```json
{
  "mcpServers": {
    "sqliteman": {
      "command": "D:/dev/sqlite-manager/bin/sqliteman-mcp.exe"
    }
  }
}
```

## Tools

| Tool | Description |
|---|---|
| `sqlite_open` | Open a database path |
| `sqlite_schema` | Schema for the open DB |
| `sqlite_query` | Run a query |
| `sqlite_exec` | Run DDL/DML |
| `sqlite_export` | Export table to CSV/JSON |
