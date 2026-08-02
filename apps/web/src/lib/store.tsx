"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { coreRpc, getRecent, pushRecent } from "@/lib/core";
import type {
  HistoryEntry,
  QueryResult,
  SchemaResult,
  TableSchema,
  ViewMode,
} from "@/lib/types";

type ConnState = {
  id: string;
  path: string;
  schema: SchemaResult | null;
};

type AppState = {
  connections: ConnState[];
  activeConnId: string | null;
  view: ViewMode;
  selectedTable: string | null;
  sql: string;
  lastResult: QueryResult | null;
  error: string | null;
  busy: boolean;
  history: HistoryEntry[];
  recent: string[];
  setView: (v: ViewMode) => void;
  setSelectedTable: (t: string | null) => void;
  setSql: (s: string) => void;
  openPath: (path: string, create?: boolean) => Promise<void>;
  closeConn: (id: string) => Promise<void>;
  setActiveConn: (id: string) => void;
  refreshSchema: () => Promise<void>;
  runSql: (sql?: string) => Promise<void>;
  loadTableRows: (table: string, offset?: number) => Promise<void>;
  updateCell: (
    table: string,
    pkCol: string,
    pkVal: unknown,
    col: string,
    val: unknown,
  ) => Promise<void>;
  applyDdl: (ddl: string) => Promise<void>;
  loadHistory: () => Promise<void>;
  active: ConnState | null;
  tables: TableSchema[];
};

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [connections, setConnections] = useState<ConnState[]>([]);
  const [activeConnId, setActiveConnId] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("welcome");
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [sql, setSql] = useState("SELECT name FROM sqlite_master WHERE type='table';\n");
  const [lastResult, setLastResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [recent, setRecent] = useState<string[]>(() =>
    typeof window !== "undefined" ? getRecent() : [],
  );

  const active = useMemo(
    () => connections.find((c) => c.id === activeConnId) ?? null,
    [connections, activeConnId],
  );
  const tables = active?.schema?.tables ?? [];

  const refreshSchema = useCallback(async () => {
    if (!activeConnId) return;
    const schema = await coreRpc<SchemaResult>("schema", { connId: activeConnId });
    setConnections((prev) =>
      prev.map((c) => (c.id === activeConnId ? { ...c, schema } : c)),
    );
  }, [activeConnId]);

  const openPath = useCallback(async (path: string, create = false) => {
    setBusy(true);
    setError(null);
    try {
      const res = await coreRpc<{ connId: string; path: string }>(
        create ? "create" : "open",
        { path },
      );
      const schema = await coreRpc<SchemaResult>("schema", { connId: res.connId });
      const conn: ConnState = { id: res.connId, path: res.path || path, schema };
      setConnections((prev) => {
        const rest = prev.filter((c) => c.path !== conn.path);
        return [...rest, conn];
      });
      setActiveConnId(res.connId);
      pushRecent(conn.path);
      setRecent(getRecent());
      setView("sql");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  const closeConn = useCallback(
    async (id: string) => {
      try {
        await coreRpc("close", { connId: id });
      } catch {
        /* ignore */
      }
      setConnections((prev) => {
        const next = prev.filter((c) => c.id !== id);
        if (activeConnId === id) {
          setActiveConnId(next[0]?.id ?? null);
          if (!next.length) setView("welcome");
        }
        return next;
      });
    },
    [activeConnId],
  );

  const runSql = useCallback(
    async (override?: string) => {
      if (!activeConnId) return;
      const text = (override ?? sql).trim();
      if (!text) return;
      setBusy(true);
      setError(null);
      try {
        const result = await coreRpc<QueryResult>("query", {
          connId: activeConnId,
          sql: text,
          limit: 2000,
        });
        setLastResult(result);
        if (!text.toUpperCase().startsWith("SELECT") && !text.toUpperCase().startsWith("WITH")) {
          await refreshSchema();
        }
        const hist = await coreRpc<HistoryEntry[]>("history_list", { limit: 40 });
        setHistory(hist);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [activeConnId, sql, refreshSchema],
  );

  const loadTableRows = useCallback(
    async (table: string, offset = 0) => {
      if (!activeConnId) return;
      setBusy(true);
      setError(null);
      setSelectedTable(table);
      try {
        const result = await coreRpc<QueryResult>("table_rows", {
          connId: activeConnId,
          table,
          offset,
          limit: 200,
        });
        setLastResult(result);
        setView("data");
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [activeConnId],
  );

  const updateCell = useCallback(
    async (
      table: string,
      pkCol: string,
      pkVal: unknown,
      col: string,
      val: unknown,
    ) => {
      if (!activeConnId) return;
      await coreRpc("update_cell", {
        connId: activeConnId,
        table,
        pkCol,
        pkVal,
        col,
        val,
      });
      await loadTableRows(table);
    },
    [activeConnId, loadTableRows],
  );

  const applyDdl = useCallback(
    async (ddl: string) => {
      if (!activeConnId) return;
      setBusy(true);
      setError(null);
      try {
        await coreRpc("schema_apply", { connId: activeConnId, ddl });
        await refreshSchema();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [activeConnId, refreshSchema],
  );

  const loadHistory = useCallback(async () => {
    const hist = await coreRpc<HistoryEntry[]>("history_list", { limit: 40 });
    setHistory(hist);
  }, []);

  const value: AppState = {
    connections,
    activeConnId,
    view,
    selectedTable,
    sql,
    lastResult,
    error,
    busy,
    history,
    recent,
    setView,
    setSelectedTable,
    setSql,
    openPath,
    closeConn,
    setActiveConn: setActiveConnId,
    refreshSchema,
    runSql,
    loadTableRows,
    updateCell,
    applyDdl,
    loadHistory,
    active,
    tables,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp outside provider");
  return v;
}
