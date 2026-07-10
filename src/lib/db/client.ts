/// <reference types="@sqlite.org/sqlite-wasm" />

import type { Sqlite3Static, Database } from '@sqlite.org/sqlite-wasm';

/**
 * SQLite WASM database client with OPFS persistence.
 *
 * The database file is stored in the Origin Private File System (OPFS),
 * which persists across browser sessions like a real file on disk.
 * Falls back to in-memory if OPFS is not available.
 */

let sqlite3: Sqlite3Static | null = null;
let db: Database | null = null;

const DB_FILE = 'evenflow.sqlite3';

export type DBMode = 'opfs' | 'memory';

export async function initDB(mode: DBMode = 'opfs'): Promise<Database> {
  if (db) return db;

  const { default: sqlite3Init } = await import('@sqlite.org/sqlite-wasm');
  sqlite3 = await sqlite3Init();

  let dbName: string;
  if (mode === 'opfs' && 'opfs' in sqlite3) {
    dbName = `opfs:${DB_FILE}`;
  } else {
    dbName = ':memory:';
  }

  db = new sqlite3.oo1.DB(dbName, 'c');
  db.exec('PRAGMA journal_mode=WAL;');
  db.exec('PRAGMA foreign_keys=ON;');

  await migrate(db);

  return db;
}

export function getDB(): Database {
  if (!db) throw new Error('Database not initialized. Call initDB() first.');
  return db;
}

export function closeDB(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function isOPFSAvailable(): boolean {
  return sqlite3 !== null && 'opfs' in sqlite3;
}

/**
 * Export the current database as a Uint8Array (for download).
 */
export async function exportDB(): Promise<Uint8Array> {
  const database = getDB();
  const data = sqlite3!.capi.sqlite3_js_db_export(database);
  return data;
}

/**
 * Import a database from a Uint8Array (replaces current DB).
 */
export async function importDB(data: Uint8Array): Promise<void> {
  closeDB();
  const { default: sqlite3Init } = await import('@sqlite.org/sqlite-wasm');
  sqlite3 = await sqlite3Init();

  // Write the data to OPFS then open it
  if ('opfs' in sqlite3) {
    sqlite3.opfs.writeFile({ filename: DB_FILE, data });
    db = new sqlite3.oo1.DB(`opfs:${DB_FILE}`, 'r');
  } else {
    // In-memory: use deserialize
    db = new sqlite3.oo1.DB(':memory:', 'c');
    const ptr = sqlite3.wasm.allocFromTypedArray(data);
    sqlite3.capi.sqlite3_deserialize(db, 'main', ptr, data.byteLength, data.byteLength, 0);
  }
}

// --- Query helpers ---

export function exec(sql: string): void {
  getDB().exec(sql);
}

export function query<T = Record<string, unknown>>(sql: string, params?: unknown[]): T[] {
  const database = getDB();
  const results: T[] = [];
  database.exec({
    sql,
    bind: params,
    resultRows: results as Record<string, unknown>[],
    rowMode: 'object',
  });
  return results;
}

export function queryOne<T = Record<string, unknown>>(sql: string, params?: unknown[]): T | null {
  const rows = query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export function run(sql: string, params?: unknown[]): number {
  const database = getDB();
  database.exec({
    sql,
    bind: params,
    resultRows: [],
    rowMode: 'object',
  });
  // lastInsertRowId
  return sqlite3!.capi.sqlite3_last_insert_rowid(database);
}