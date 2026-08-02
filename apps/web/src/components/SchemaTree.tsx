"use client";

import { ChevronRight, Table2, Eye, X } from "lucide-react";
import { useApp } from "@/lib/store";
import { clsx } from "clsx";

export function SchemaTree() {
  const {
    connections,
    activeConnId,
    setActiveConn,
    closeConn,
    tables,
    selectedTable,
    loadTableRows,
    setSelectedTable,
    setView,
  } = useApp();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex h-9 items-center border-b border-border px-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
        Explorer
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-1">
        {connections.length === 0 && (
          <p className="px-2 py-3 text-[12px] text-muted">Open a database to browse schema.</p>
        )}
        {connections.map((c) => {
          const name = c.path.split(/[/\\]/).pop() || c.path;
          const active = c.id === activeConnId;
          return (
            <div key={c.id} className="mb-1">
              <div
                className={clsx(
                  "group flex items-center gap-1 rounded-sm px-1 py-0.5 text-[12px]",
                  active ? "bg-selection text-ink" : "hover:bg-surface-2",
                )}
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-1 text-left"
                  onClick={() => setActiveConn(c.id)}
                >
                  <ChevronRight
                    size={12}
                    className={clsx("shrink-0 transition-transform", active && "rotate-90")}
                  />
                  <span className="truncate font-medium" title={c.path}>
                    {name}
                  </span>
                </button>
                <button
                  type="button"
                  className="hidden rounded p-0.5 text-muted hover:text-danger group-hover:block"
                  title="Close"
                  onClick={() => closeConn(c.id)}
                >
                  <X size={12} />
                </button>
              </div>
              {active &&
                tables.map((t) => (
                  <button
                    key={t.name}
                    type="button"
                    className={clsx(
                      "ml-3 flex w-[calc(100%-0.75rem)] items-center gap-1.5 rounded-sm px-1.5 py-0.5 text-left text-[12px]",
                      selectedTable === t.name
                        ? "bg-selection text-primary"
                        : "text-ink hover:bg-surface-2",
                    )}
                    onClick={() => {
                      setSelectedTable(t.name);
                      void loadTableRows(t.name);
                    }}
                    onDoubleClick={() => {
                      setView("diagram");
                    }}
                  >
                    {t.type === "view" ? <Eye size={12} /> : <Table2 size={12} />}
                    <span className="truncate">{t.name}</span>
                    <span className="ml-auto text-[10px] text-muted">{t.columns.length}</span>
                  </button>
                ))}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
