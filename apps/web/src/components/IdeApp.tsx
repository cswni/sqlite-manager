"use client";

import { ActivityBar } from "@/components/ActivityBar";
import { SchemaTree } from "@/components/SchemaTree";
import { SqlEditor } from "@/components/SqlEditor";
import { WelcomeView } from "@/components/WelcomeView";
import { DiagramView } from "@/components/DiagramView";
import { DataView, DesignerView } from "@/components/DataDesigner";
import { MigrationsView, IoView } from "@/components/MigrationsIo";
import { StatusBar } from "@/components/ui";
import { AppProvider, useApp } from "@/lib/store";

function Shell() {
  const { view, active, busy, error, lastResult, connections } = useApp();

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1">
        <ActivityBar />
        {view !== "welcome" && <SchemaTree />}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-bg">
          {view === "welcome" && <WelcomeView />}
          {view === "sql" && <SqlEditor />}
          {view === "data" && <DataView />}
          {view === "diagram" && <DiagramView />}
          {view === "designer" && <DesignerView />}
          {view === "migrations" && <MigrationsView />}
          {view === "io" && <IoView />}
        </main>
      </div>
      <StatusBar>
        <span>{busy ? "Working…" : "Ready"}</span>
        <span>
          {connections.length} connection{connections.length === 1 ? "" : "s"}
        </span>
        {active && <span className="truncate font-mono">{active.path}</span>}
        {lastResult && (
          <span>
            {lastResult.rowCount} rows · {lastResult.ms}ms
          </span>
        )}
        {error && <span className="truncate text-danger">{error}</span>}
      </StatusBar>
    </div>
  );
}

export function IdeApp() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
