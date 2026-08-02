# Desktop

Tauri 2 wraps the Next.js static export and spawns `sqliteman-core` as a sidecar (stdin JSON-RPC).

## Dev

```bash
# Build / refresh the Windows sidecar name Tauri expects
go build -o bin/sqliteman-core.exe ./core/cmd/sqliteman-core
cp bin/sqliteman-core.exe apps/desktop/src-tauri/binaries/sqliteman-core-x86_64-pc-windows-msvc.exe

pnpm --dir apps/desktop install
pnpm --dir apps/desktop tauri dev
```

On macOS/Linux, use the matching target triple filename under `binaries/` (see Tauri `externalBin` docs).

## Release build

```bash
pnpm --dir apps/desktop tauri build
```

Installers land under `apps/desktop/src-tauri/target/release/bundle/`.
