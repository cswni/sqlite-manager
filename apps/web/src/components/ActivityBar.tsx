"use client";

import {
  Database,
  FileInput,
  GitBranch,
  LayoutGrid,
  Play,
  Table2,
  Workflow,
} from "lucide-react";
import { clsx } from "clsx";
import { useApp } from "@/lib/store";
import type { ViewMode } from "@/lib/types";

const items: { id: ViewMode; icon: typeof Database; label: string }[] = [
  { id: "sql", icon: Play, label: "SQL" },
  { id: "data", icon: Table2, label: "Data" },
  { id: "diagram", icon: Workflow, label: "Diagram" },
  { id: "designer", icon: LayoutGrid, label: "Designer" },
  { id: "migrations", icon: GitBranch, label: "Migrations" },
  { id: "io", icon: FileInput, label: "Import/Export" },
];

export function ActivityBar() {
  const { view, setView, active } = useApp();
  return (
    <nav
      className="flex w-10 shrink-0 flex-col items-center gap-1 border-r border-border bg-surface py-2"
      aria-label="Views"
    >
      <button
        type="button"
        title="Welcome"
        className={clsx(
          "flex h-8 w-8 items-center justify-center rounded-sm text-muted hover:bg-surface-2 hover:text-ink",
          view === "welcome" && "bg-selection text-primary",
        )}
        onClick={() => setView("welcome")}
      >
        <Database size={16} strokeWidth={1.75} />
      </button>
      <div className="my-1 h-px w-6 bg-border" />
      {items.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          type="button"
          title={label}
          disabled={!active && id !== "sql"}
          className={clsx(
            "flex h-8 w-8 items-center justify-center rounded-sm text-muted hover:bg-surface-2 hover:text-ink disabled:opacity-30",
            view === id && "bg-selection text-primary",
          )}
          onClick={() => setView(id)}
        >
          <Icon size={16} strokeWidth={1.75} />
        </button>
      ))}
    </nav>
  );
}
