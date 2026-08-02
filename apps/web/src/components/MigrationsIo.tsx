"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import { coreRpc } from "@/lib/core";
import { Button, Input, Toolbar } from "@/components/ui";

export function MigrationsView() {
  const { active, refreshSchema } = useApp();
  const [dir, setDir] = useState("");
  const [plan, setPlan] = useState<{ file: string; sql: string }[]>([]);
  const [log, setLog] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function loadPlan() {
    if (!dir.trim()) return;
    setBusy(true);
    try {
      const p = await coreRpc<{ file: string; sql: string }[]>("migrate_plan", {
        dir: dir.trim(),
      });
      setPlan(p);
      setLog(`${p.length} migration file(s)`);
    } catch (e) {
      setLog(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function apply() {
    if (!active || !dir.trim()) return;
    setBusy(true);
    try {
      const applied = await coreRpc<{ file: string; status: string }[]>("migrate_apply", {
        connId: active.id,
        dir: dir.trim(),
      });
      setLog(
        applied.length
          ? `Applied: ${applied.map((a) => a.file).join(", ")}`
          : "Nothing new to apply",
      );
      await refreshSchema();
    } catch (e) {
      setLog(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Toolbar>
        <span className="font-medium">Migrations</span>
        <Button disabled={busy} onClick={() => void loadPlan()}>
          Plan
        </Button>
        <Button variant="primary" disabled={!active || busy} onClick={() => void apply()}>
          Apply pending
        </Button>
      </Toolbar>
      <div className="space-y-3 p-3">
        <label className="block text-[11px] text-muted">Migrations folder</label>
        <Input
          placeholder="D:\project\migrations"
          value={dir}
          onChange={(e) => setDir(e.target.value)}
        />
        {log && <p className="text-[12px] text-muted">{log}</p>}
        <ul className="divide-y divide-border border border-border">
          {plan.map((p) => (
            <li key={p.file} className="p-2">
              <div className="font-mono text-[12px] font-medium">{p.file}</div>
              <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-muted">
                {p.sql}
              </pre>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function IoView() {
  const { active, selectedTable, tables } = useApp();
  const [table, setTable] = useState(selectedTable || tables[0]?.name || "");
  const [path, setPath] = useState("");
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [msg, setMsg] = useState("");

  async function doExport() {
    if (!active || !table || !path) return;
    try {
      await coreRpc("export", {
        connId: active.id,
        table,
        path,
        format,
      });
      setMsg(`Exported ${table} → ${path}`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  }

  async function doImport() {
    if (!active || !table || !path) return;
    try {
      const res = await coreRpc<{ rows: number }>("import", {
        connId: active.id,
        table,
        path,
      });
      setMsg(`Imported ${res.rows} row(s) into ${table}`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Toolbar>
        <span className="font-medium">Import / Export</span>
      </Toolbar>
      <div className="max-w-lg space-y-3 p-3">
        <label className="block text-[11px] text-muted">Table</label>
        <select
          className="h-7 w-full rounded-sm border border-border bg-bg px-2 text-[12px]"
          value={table}
          onChange={(e) => setTable(e.target.value)}
        >
          {tables.map((t) => (
            <option key={t.name} value={t.name}>
              {t.name}
            </option>
          ))}
        </select>
        <label className="block text-[11px] text-muted">File path</label>
        <Input value={path} onChange={(e) => setPath(e.target.value)} placeholder="out.csv" />
        <label className="block text-[11px] text-muted">Format</label>
        <select
          className="h-7 w-full rounded-sm border border-border bg-bg px-2 text-[12px]"
          value={format}
          onChange={(e) => setFormat(e.target.value as "csv" | "json")}
        >
          <option value="csv">CSV</option>
          <option value="json">JSON</option>
        </select>
        <div className="flex gap-2">
          <Button variant="primary" disabled={!active} onClick={() => void doExport()}>
            Export
          </Button>
          <Button disabled={!active || format !== "csv"} onClick={() => void doImport()}>
            Import CSV
          </Button>
        </div>
        {msg && <p className="text-[12px] text-muted">{msg}</p>}
        <p className="text-[11px] text-muted">
          XLSX helpers live in <code className="font-mono">python/utils/</code> for advanced
          formats.
        </p>
      </div>
    </div>
  );
}
