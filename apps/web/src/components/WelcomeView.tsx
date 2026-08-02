"use client";

import { useState } from "react";
import { FolderOpen, FilePlus2 } from "lucide-react";
import { useApp } from "@/lib/store";
import { Button, Input } from "@/components/ui";

export function WelcomeView() {
  const { openPath, recent, busy, error } = useApp();
  const [path, setPath] = useState("");

  async function pickOpen() {
    try {
      const isTauri = !!(window as unknown as { __TAURI_INTERNALS__?: unknown })
        .__TAURI_INTERNALS__;
      if (isTauri) {
        const { open } = await import("@tauri-apps/plugin-dialog");
        const selected = await open({
          multiple: false,
          filters: [{ name: "SQLite", extensions: ["db", "sqlite", "sqlite3"] }],
        });
        if (typeof selected === "string") await openPath(selected);
        return;
      }
    } catch {
      /* fall through */
    }
    if (path.trim()) await openPath(path.trim());
  }

  async function pickCreate() {
    try {
      const isTauri = !!(window as unknown as { __TAURI_INTERNALS__?: unknown })
        .__TAURI_INTERNALS__;
      if (isTauri) {
        const { save } = await import("@tauri-apps/plugin-dialog");
        const selected = await save({
          filters: [{ name: "SQLite", extensions: ["db"] }],
        });
        if (typeof selected === "string") await openPath(selected, true);
        return;
      }
    } catch {
      /* fall through */
    }
    if (path.trim()) await openPath(path.trim(), true);
  }

  return (
    <div className="flex flex-1 flex-col items-start justify-center gap-6 px-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">SQLite Manager</h1>
        <p className="mt-1 max-w-md text-[13px] text-muted">
          Dense local studio for schema, SQL, diagrams, migrations, and data — one engine for
          you and MCP agents.
        </p>
      </div>

      <div className="flex w-full max-w-xl flex-col gap-2">
        <label className="text-[11px] font-medium text-muted">Database path</label>
        <Input
          placeholder="D:\data\app.db or /tmp/app.db"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void pickOpen();
          }}
        />
        <div className="flex gap-2">
          <Button variant="primary" disabled={busy} onClick={() => void pickOpen()}>
            <FolderOpen size={13} />
            Open
          </Button>
          <Button disabled={busy} onClick={() => void pickCreate()}>
            <FilePlus2 size={13} />
            Create
          </Button>
        </div>
        {error && <p className="text-[12px] text-danger">{error}</p>}
      </div>

      {recent.length > 0 && (
        <div className="w-full max-w-xl">
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Recent
          </h2>
          <ul className="divide-y divide-border border border-border">
            {recent.map((r) => (
              <li key={r}>
                <button
                  type="button"
                  className="block w-full truncate px-3 py-2 text-left font-mono text-[12px] hover:bg-selection"
                  onClick={() => void openPath(r)}
                >
                  {r}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
