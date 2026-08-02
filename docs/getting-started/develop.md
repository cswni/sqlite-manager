# Develop

Two processes for browser development:

```bash
# Terminal 1
go run ./core/cmd/sqliteman-core -listen 127.0.0.1:17832

# Terminal 2
pnpm --dir apps/web dev
```

The UI calls `http://127.0.0.1:17832/rpc` when not running inside Tauri.

## Tests

```bash
cd core && go test ./...
pnpm --dir apps/web build
cd apps/desktop/src-tauri && cargo check
```

## Sample migrations

See `examples/migrations/` — point the Migrations view at that folder to plan/apply.
