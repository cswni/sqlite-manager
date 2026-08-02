"use client";

import CodeMirror from "@uiw/react-codemirror";
import { sql as sqlLang, SQLite } from "@codemirror/lang-sql";
import { keymap } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { useMemo } from "react";
import { Play } from "lucide-react";
import { useApp } from "@/lib/store";
import { Button, Toolbar } from "@/components/ui";
import { DataGrid } from "@/components/DataGrid";

export function SqlEditor() {
  const {
    sql: sqlText,
    setSql,
    runSql,
    busy,
    lastResult,
    history: queryHistory,
    active,
  } = useApp();

  const extensions = useMemo(
    () => [
      sqlLang({ dialect: SQLite }),
      history(),
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        {
          key: "Mod-Enter",
          run: () => {
            void runSql();
            return true;
          },
        },
      ]),
    ],
    [runSql],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Toolbar>
        <Button variant="accent" disabled={!active || busy} onClick={() => void runSql()}>
          <Play size={12} />
          Run
        </Button>
        <span className="text-[11px] text-muted">Ctrl/Cmd+Enter</span>
        <div className="ml-auto flex max-w-md gap-1 overflow-x-auto">
          {queryHistory.slice(0, 6).map((h) => (
            <button
              key={h.id}
              type="button"
              title={h.sql}
              className="max-w-[8rem] truncate rounded-sm border border-border px-1.5 py-0.5 text-[10px] text-muted hover:bg-surface-2"
              onClick={() => {
                setSql(h.sql);
                void runSql(h.sql);
              }}
            >
              {h.ok ? "✓" : "✗"} {h.sql.slice(0, 24)}
            </button>
          ))}
        </div>
      </Toolbar>
      <div className="h-[40%] min-h-[140px] border-b border-border">
        <CodeMirror
          value={sqlText}
          height="100%"
          extensions={extensions}
          onChange={setSql}
          basicSetup={{ lineNumbers: true, foldGutter: false }}
          style={{ fontSize: 12, height: "100%" }}
        />
      </div>
      <DataGrid result={lastResult} />
    </div>
  );
}
