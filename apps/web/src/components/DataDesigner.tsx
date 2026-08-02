"use client";

import {
  Component,
  useEffect,
  useMemo,
  useState,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { useApp } from "@/lib/store";
import { Button, Input, Toolbar } from "@/components/ui";
import { DataGrid } from "@/components/DataGrid";

export function DataView() {
  const { selectedTable, tables, lastResult, loadTableRows, updateCell, active } = useApp();
  const table = tables.find((t) => t.name === selectedTable);
  const pkCol = table?.columns?.find((c) => c.primaryKey)?.name ?? null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Toolbar>
        <span className="font-medium text-ink">{selectedTable || "No table selected"}</span>
        {selectedTable && (
          <Button onClick={() => void loadTableRows(selectedTable)}>Refresh</Button>
        )}
        {pkCol && <span className="text-[11px] text-muted">Editable · PK {pkCol}</span>}
        {lastResult && (
          <span className="ml-auto text-[11px] text-muted">{lastResult.rowCount} rows shown</span>
        )}
      </Toolbar>
      {!active || !selectedTable ? (
        <div className="flex flex-1 items-center justify-center text-[12px] text-muted">
          Select a table in the explorer.
        </div>
      ) : (
        <DataGrid
          result={lastResult}
          pkCol={pkCol}
          onEdit={
            pkCol
              ? (rowIndex, col, value) => {
                  const row = lastResult?.rows[rowIndex];
                  if (!row || !pkCol || !selectedTable) return;
                  const pkIdx = lastResult!.columns.indexOf(pkCol);
                  const pkVal = row[pkIdx];
                  void updateCell(selectedTable, pkCol, pkVal, col, value === "" ? null : value);
                }
              : undefined
          }
        />
      )}
    </div>
  );
}

export function DesignerView() {
  const { applyDdl, selectedTable, tables, refreshSchema, busy, error } = useApp();
  const existing = useMemo(
    () => tables.find((t) => t.name === selectedTable) ?? null,
    [tables, selectedTable],
  );

  const [name, setName] = useState("new_table");
  const [cols, setCols] = useState("id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL");
  const [preview, setPreview] = useState(
    `CREATE TABLE IF NOT EXISTS "new_table" (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL\n);`,
  );
  const [localError, setLocalError] = useState<string | null>(null);

  const existingName = existing?.name ?? "";
  const existingSql = existing?.sql ?? "";
  const existingColsKey = (existing?.columns ?? []).map((c) => c.name).join(",");

  useEffect(() => {
    if (!existingName) return;
    const t = tables.find((x) => x.name === existingName);
    if (!t) return;
    setName(t.name);
    setCols(
      (t.columns ?? [])
        .map((c) => `${c.name} ${c.type}${c.primaryKey ? " PRIMARY KEY" : ""}`)
        .join(",\n  "),
    );
    setPreview(
      `-- Inspect / alter "${t.name}" (SQLite ALTER is limited)\n${t.sql || ""}\n\n-- Example:\n-- ALTER TABLE "${t.name}" ADD COLUMN note TEXT;`,
    );
  }, [existingName, existingSql, existingColsKey, tables]);

  const ddl = useMemo(() => {
    if (existing) {
      return `-- Inspect / alter "${existing.name}" (SQLite ALTER is limited)\n${existing.sql || ""}\n\n-- Example:\n-- ALTER TABLE "${existing.name}" ADD COLUMN note TEXT;`;
    }
    return `CREATE TABLE IF NOT EXISTS "${name.replace(/"/g, "")}" (\n  ${cols}\n);`;
  }, [existing, name, cols]);

  async function onApply() {
    setLocalError(null);
    try {
      await applyDdl(preview);
      await refreshSchema();
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Toolbar>
        <span className="font-medium">Schema designer</span>
        <Button variant="primary" disabled={busy || !preview.trim()} onClick={() => void onApply()}>
          Apply DDL
        </Button>
        {!existing && <Button onClick={() => setPreview(ddl)}>Update preview</Button>}
      </Toolbar>
      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-2">
        <div className="flex min-h-0 flex-col gap-2 overflow-auto border-r border-border p-3">
          {!existing && (
            <>
              <p className="text-[12px] text-muted">
                No table selected — create one, or pick a table in the explorer to inspect its DDL.
              </p>
              <label className="text-[11px] text-muted">Table name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
              <label className="text-[11px] text-muted">Columns</label>
              <textarea
                className="min-h-[160px] flex-1 resize-none rounded-sm border border-border bg-bg p-2 font-mono text-[12px]"
                value={cols}
                onChange={(e) => setCols(e.target.value)}
              />
            </>
          )}
          {existing && (
            <div className="space-y-2 text-[12px]">
              <p className="text-muted">
                Table <strong className="text-ink">{existing.name}</strong> — edit the DDL on the
                right, then Apply.
              </p>
              <ul className="font-mono text-[11px]">
                {(existing.columns ?? []).map((c) => (
                  <li key={c.name} className="border-b border-border py-1">
                    {c.name} · {c.type || "ANY"}
                    {c.primaryKey ? " · PK" : ""}
                    {c.notNull ? " · NOT NULL" : ""}
                  </li>
                ))}
              </ul>
              <Button onClick={() => setPreview(ddl)}>Reset preview</Button>
            </div>
          )}
          {(localError || error) && (
            <p className="text-[12px] text-danger">{localError || error}</p>
          )}
        </div>
        <textarea
          className="min-h-[200px] flex-1 resize-none border-0 bg-bg p-3 font-mono text-[12px] outline-none"
          value={preview}
          onChange={(e) => setPreview(e.target.value)}
          spellCheck={false}
        />
      </div>
    </div>
  );
}

type BoundaryState = { err: string | null };

export class ViewErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { err: null };

  static getDerivedStateFromError(err: Error): BoundaryState {
    return { err: err.message };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error("view crash", err, info);
  }

  render() {
    if (this.state.err) {
      return (
        <div className="flex flex-1 flex-col items-start gap-2 p-6 text-[13px]">
          <p className="font-medium text-danger">This view crashed</p>
          <p className="font-mono text-[12px] text-muted">{this.state.err}</p>
          <button
            type="button"
            className="rounded-sm border border-border px-2 py-1 text-[12px]"
            onClick={() => this.setState({ err: null })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
