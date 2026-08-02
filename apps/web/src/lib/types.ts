export type RpcRequest = {
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
};

export type RpcResponse<T = unknown> = {
  id: string | number;
  result?: T;
  error?: string;
};

export type Column = {
  name: string;
  type: string;
  notNull: boolean;
  default?: string | null;
  primaryKey: boolean;
  cid: number;
};

export type ForeignKey = {
  id: number;
  seq: number;
  table: string;
  from: string;
  to: string;
  onUpdate: string;
  onDelete: string;
};

export type IndexInfo = {
  name: string;
  unique: boolean;
  origin: string;
  cols: string[];
};

export type TableSchema = {
  name: string;
  type: string;
  sql?: string;
  columns?: Column[] | null;
  indexes?: IndexInfo[] | null;
  foreignKeys?: ForeignKey[] | null;
};

export type SchemaResult = { tables: TableSchema[] };

export type QueryResult = {
  columns: string[];
  rows: unknown[][];
  rowCount: number;
  ms: number;
  changes?: number;
  lastInsertId?: number;
};

export type HistoryEntry = {
  id: string;
  connId: string;
  sql: string;
  ok: boolean;
  ms: number;
  at: string;
  error?: string;
  rowCount?: number;
};

export type ConnectionInfo = { id: string; path: string };

export type ViewMode =
  | "welcome"
  | "sql"
  | "data"
  | "diagram"
  | "designer"
  | "migrations"
  | "io";
