"use client";

import { useMemo, useRef } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { QueryResult } from "@/lib/types";

export function DataGrid({
  result,
  onEdit,
  pkCol,
}: {
  result: QueryResult | null;
  onEdit?: (rowIndex: number, col: string, value: string) => void;
  pkCol?: string | null;
}) {
  const parentRef = useRef<HTMLDivElement>(null);

  const columns = useMemo<ColumnDef<unknown[]>[]>(() => {
    if (!result) return [];
    return result.columns.map((name, i) => ({
      id: name,
      accessorFn: (row) => row[i],
      header: name,
      cell: ({ getValue, row }) => {
        const v = getValue();
        const display = v === null || v === undefined ? "NULL" : String(v);
        if (!onEdit || !pkCol) {
          return (
            <span className={v == null ? "italic text-muted" : ""} title={display}>
              {display}
            </span>
          );
        }
        return (
          <input
            className="h-full w-full min-w-[6rem] border-0 bg-transparent px-1 font-mono text-[12px] outline-none focus:bg-selection"
            defaultValue={v == null ? "" : String(v)}
            onBlur={(e) => {
              const next = e.target.value;
              const prev = v == null ? "" : String(v);
              if (next !== prev) onEdit(row.index, name, next);
            }}
          />
        );
      },
    }));
  }, [result, onEdit, pkCol]);

  const table = useReactTable({
    data: result?.rows ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const rows = table.getRowModel().rows;
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 26,
    overscan: 20,
  });

  if (!result) {
    return (
      <div className="flex flex-1 items-center justify-center text-[12px] text-muted">
        Run a query or open a table to see results.
      </div>
    );
  }

  if (result.columns.length === 0) {
    return (
      <div className="flex flex-1 items-center px-3 text-[12px] text-muted">
        OK — {result.changes ?? 0} change(s) in {result.ms}ms
        {result.lastInsertId ? ` · last_insert_rowid=${result.lastInsertId}` : ""}
      </div>
    );
  }

  return (
    <div ref={parentRef} className="min-h-0 flex-1 overflow-auto font-mono text-[12px]">
      <div style={{ height: virtualizer.getTotalSize() + 28, position: "relative" }}>
        <table className="w-max min-w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-surface-2">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                <th className="border-b border-r border-border px-2 py-1 text-left text-[10px] font-semibold text-muted">
                  #
                </th>
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    className="border-b border-r border-border px-2 py-1 text-left text-[11px] font-semibold text-ink"
                  >
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {virtualizer.getVirtualItems().map((vr) => {
              const row = rows[vr.index];
              return (
                <tr
                  key={row.id}
                  className="hover:bg-selection/60"
                  style={{
                    height: vr.size,
                    transform: `translateY(${vr.start}px)`,
                    position: "absolute",
                    top: 28,
                    left: 0,
                    width: "100%",
                    display: "table",
                    tableLayout: "fixed",
                  }}
                >
                  <td className="border-b border-r border-border px-2 text-muted">{vr.index + 1}</td>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="border-b border-r border-border px-0">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
