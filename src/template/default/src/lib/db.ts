/// <reference types="@sqlite.org/sqlite-wasm" />

/**
 * Evenflow CMS — SQLite WASM database with OPFS persistence.
 *
 * SQLite runs inside a Web Worker (required for OPFS).
 * The main thread sends SQL queries to the worker and gets results back.
 * This enables true persistence — the database survives across page navigations.
 */

type QueryResult = {
  rows: Record<string, unknown>[];
  insertId?: number;
};

type WorkerMsg = {
  id: number;
  type: 'init' | 'query' | 'queryOne' | 'run' | 'export' | 'exec';
  sql?: string;
  params?: unknown[];
};

type WorkerResp = {
  id: number;
  result?: QueryResult;
  data?: Uint8Array;
  error?: string;
  ready?: boolean;
  opfs?: boolean;
  initError?: string | null;
};

let worker: Worker | null = null;
let ready = false;
let opfs = false;
let pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
let counter = 0;

export async function initDB(): Promise<void> {
  if (ready) return;

  // Use Vite's worker import — Vite bundles the worker + sqlite-wasm together
  worker = new Worker(new URL('./db-worker.ts', import.meta.url), { type: 'module' });

  worker.onmessage = (e: MessageEvent<WorkerResp>) => {
    const resp = e.data;
    const p = pending.get(resp.id);
    if (!p) return;
    pending.delete(resp.id);
    if (resp.error) {
      p.reject(new Error(resp.error));
    } else if (resp.ready) {
   opfs = resp.opfs ?? false;
   ready = true;
   if (resp.initError) {
     console.error('[Evenflow] OPFS init error:', resp.initError);
   }
   p.resolve(true);
    } else {
      p.resolve(resp);
    }
  };

  worker.onerror = (e) => {
    console.error('Evenflow DB worker error:', e);
  };

  await send('init');
}

function send(type: WorkerMsg['type'], sql?: string, params?: unknown[]): Promise<WorkerResp> {
  return new Promise((resolve, reject) => {
    const id = ++counter;
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
    worker!.postMessage({ id, type, sql, params } satisfies WorkerMsg);
  });
}

export function isOPFSAvailable(): boolean {
  return opfs;
}

export async function query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]> {
  const resp = await send('query', sql, params);
  return (resp.result?.rows ?? []) as T[];
}

export async function queryOne<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | null> {
  const resp = await send('queryOne', sql, params);
  const rows = resp.result?.rows ?? [];
  return rows.length > 0 ? (rows[0] as T) : null;
}

export async function run(sql: string, params?: unknown[]): Promise<number> {
  const resp = await send('run', sql, params);
  return resp.result?.insertId ?? 0;
}

export async function exportDB(): Promise<Uint8Array> {
  const resp = await send('export');
  return resp.data ?? new Uint8Array();
}