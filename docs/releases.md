# Releases

Push a `v*` tag (or run **Release** manually). GitHub Actions:

1. Cross-builds `sqliteman-core` and `sqliteman-mcp`
2. Builds Tauri installers (Windows / macOS / Linux)
3. Attaches assets to a draft GitHub Release

Docs site publishes on every push to `main` / `master` via the **Docs** workflow (MkDocs Material → GitHub Pages).
