"use client";

import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { Button, Input, Toolbar } from "@/components/ui";
import { DataGrid } from "@/components/DataGrid";

export function DataView() {
  const { selectedTable, tables, lastResult, loadTableRows, updateCell, active } = useApp();
  const table = tables.find((t) => t.name === selectedTable);
  const pkCol = table?.columns.find((c) => c.primaryKey)?.name ?? null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Toolbar>
        <span className="font-medium text-ink">{selectedTable || "No table selected"}</span>
        {selectedTable && (
          <Button onClick={() => void loadTableRows(selectedTable)}>Refresh</Button>
        )}
        {pkCol && <span className="text-[11px] text-muted">Editable · PK {pkCol}</span>}
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
  const { applyDdl, selectedTable, tables, refreshSchema } = useApp();
  const existing = tables.find((t) => t.name === selectedTable);
  const [name, setName] = useState("new_table");
  const [cols, setCols] = useState("id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL");
  const [preview, setPreview] = useState(
    `CREATE TABLE IF NOT EXISTS "new_table" (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL\n);`,
  );

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setCols(
        existing.columns
          .map((c) => `${c.name} ${c.type}${c.primaryKey ? " PRIMARY KEY" : ""}`)
          .join(",\n  "),
      );
      setPreview(
        `-- Alter via raw DDL (SQLite limited ALTER)\n-- Current: ${existing.name}\n${existing.sql || ""}\n\n-- Example add column:\n-- ALTER TABLE ${existing.name} ADD COLUMN note TEXT;`,
      );
    }
  }, [existing]);

  const ddl = useMemo(() => {
    if (existing) {
      return `-- Alter via raw DDL (SQLite limited ALTER)\n-- Current: ${existing.name}\n${existing.sql || ""}\n\n-- Example add column:\n-- ALTER TABLE ${existing.name} ADD COLUMN note TEXT;`;
    }
    return `CREATE TABLE IF NOT EXISTS "${name}" (\n  ${cols}\n);`;
  }, [existing, name, cols]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Toolbar>
        <span className="font-medium">Schema designer</span>
        <Button
          variant="primary"
          onClick={() => void applyDdl(preview).then(() => refreshSchema())}
        >
          Apply DDL
        </Button>
      </Toolbar>
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-0">
        <div className="flex flex-col gap-2 border-r border-border p-3">
          {!existing && (
            <>
              <label className="text-[11px] text-muted">Table name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
              <label className="text-[11px] text-muted">Columns</label>
              <textarea
                className="min-h-[160px] flex-1 resize-none rounded-sm border border-border bg-bg p-2 font-mono text-[12px]"
                value={cols}
                onChange={(e) => setCols(e.target.value)}
              />
              <Button onClick={() => setPreview(ddl)}>Update preview</Button>
            </>
          )}
          {existing && (
            <div className="space-y-2 text-[12px]">
              <p className="text-muted">
                Editing <strong className="text-ink">{existing.name}</strong> — SQLite has limited
                ALTER. Edit the DDL preview and apply carefully.
              </p>
              <ul className="font-mono text-[11px]">
                {existing.columns.map((c) => (
                  <li key={c.name} className="border-b border-border py-1">
                    {c.name} · {c.type}
                    {c.primaryKey ? " · PK" : ""}
                    {c.notNull ? " · NOT NULL" : ""}
                  </li>
                ))}
              </ul>
              <Button onClick={() => setPreview(ddl)}>Reset preview</Button>
            </div>
          )}
        </div>
        <textarea
          className="min-h-0 flex-1 resize-none border-0 bg-bg p-3 font-mono text-[12px] outline-none"
          value={preview}
          onChange={(e) => setPreview(e.target.value)}
          spellCheck={false}
        />
      </div>
    </div>
  );
}
