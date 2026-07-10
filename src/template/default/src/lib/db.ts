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
  type: 'init' | 'query' | 'queryOne' | 'run' | 'export' | 'exec' | 'auth_check' | 'session_create' | 'session_verify' | 'session_delete' | 'password_change' | 'media_insert' | 'media_list' | 'media_get' | 'media_delete';
  sql?: string;
  params?: unknown[];
  username?: string;
  password?: string;
  userId?: number;
  token?: string;
  currentPassword?: string;
  newPassword?: string;
  name?: string;
  mimeType?: string;
  size?: number;
  data?: Uint8Array;
  mediaId?: number;
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

function send(type: WorkerMsg['type'], sql?: string, params?: unknown[], extra?: Record<string, unknown>): Promise<WorkerResp> {
  return new Promise((resolve, reject) => {
    const id = ++counter;
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
    worker!.postMessage({ id, type, sql, params, ...extra } satisfies WorkerMsg);
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

// ── Auth helpers ──

export async function authLogin(username: string, password: string): Promise<{ user: { id: number; username: string; role: string }; token: string } | null> {
  const resp: WorkerResp = await send('auth_check', undefined, undefined, { username, password });
  if (resp.error) throw new Error(resp.error);
  const user = (resp.result as any)?.user;
  if (!user) return null;
  const tokenResp: WorkerResp = await send('session_create', undefined, undefined, { userId: user.id });
  const token = (tokenResp.result as any)?.token;
  if (!token) return null;
  return { user, token };
}

export async function verifySession(token: string): Promise<{ id: number; username: string; role: string; created_at: string } | null> {
  const resp: WorkerResp = await send('session_verify', undefined, undefined, { token });
  if (resp.error) return null;
  const rows = (resp.result as any)?.rows;
  if (!rows || rows.length === 0) return null;
  return rows[0];
}

export async function invalidateSession(token: string): Promise<void> {
  await send('session_delete', undefined, undefined, { token });
}

export async function changePassword(userId: number, currentPassword: string, newPassword: string): Promise<boolean> {
  const resp: WorkerResp = await send('password_change', undefined, undefined, { userId, currentPassword, newPassword });
  if (resp.error) throw new Error(resp.error);
  return true;
}

export type AuthState = { user: { id: number; username: string; role: string }; token: string } | null;

// ── Media helpers ──

export type Media = { id: number; name: string; mime_type: string; size: number; created_at: string };

export async function insertMedia(name: string, mimeType: string, size: number, data: Uint8Array): Promise<number> {
  const resp: WorkerResp = await send('media_insert', undefined, undefined, { name, mimeType, size, data });
  if (resp.error) throw new Error(resp.error);
  return resp.result?.insertId ?? 0;
}

export async function listMedia(): Promise<Media[]> {
  const resp: WorkerResp = await send('media_list');
  if (resp.error) throw new Error(resp.error);
  return (resp.result?.rows ?? []) as Media[];
}

export async function getMedia(id: number): Promise<{ id: number; name: string; mime_type: string; size: number; data: Uint8Array; created_at: string } | null> {
  const resp: WorkerResp = await send('media_get', undefined, undefined, { mediaId: id });
  if (resp.error) return null;
  const rows = (resp.result as any)?.rows;
  if (!rows || rows.length === 0) return null;
  const row = rows[0];
  row.data = resp.data ?? row.data;
  return row;
}

export async function deleteMedia(id: number): Promise<void> {
  await send('media_delete', undefined, undefined, { mediaId: id });
}