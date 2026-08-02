"use client";

import type { RpcRequest, RpcResponse } from "./types";

const HTTP_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_CORE_URL) ||
  "http://127.0.0.1:17832/rpc";

let seq = 1;

async function isTauri(): Promise<boolean> {
  try {
    return !!(window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
  } catch {
    return false;
  }
}

export async function coreRpc<T = unknown>(
  method: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const id = seq++;
  const req: RpcRequest = { id, method, params };

  if (await isTauri()) {
    const { invoke } = await import("@tauri-apps/api/core");
    const res = (await invoke("core_rpc", { method, params })) as RpcResponse<T>;
    if (res.error) throw new Error(res.error);
    return res.result as T;
  }

  const r = await fetch(HTTP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!r.ok) throw new Error(`core HTTP ${r.status}`);
  const res = (await r.json()) as RpcResponse<T>;
  if (res.error) throw new Error(res.error);
  return res.result as T;
}

const RECENT_KEY = "sqliteman.recent";

export function getRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

export function pushRecent(path: string) {
  const next = [path, ...getRecent().filter((p) => p !== path)].slice(0, 12);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}
