/// <reference types="@sqlite.org/sqlite-wasm" />
import type { Sqlite3Static, Database } from '@sqlite.org/sqlite-wasm';

/**
 * Evenflow CMS — SQLite WASM database with OPFS persistence.
 *
 * The entire CMS database lives in the browser. Content is stored in SQLite
 * compiled to WebAssembly, persisted to the Origin Private File System (OPFS).
 * No server. No external API. The site self-hosts its own backend.
 */

let sqlite3: Sqlite3Static | null = null;
let db: Database | null = null;
const DB_FILE = 'evenflow-cms.sqlite3';

export async function initDB(): Promise<Database> {
  if (db) return db;

  const { default: sqlite3Init } = await import('@sqlite.org/sqlite-wasm');
  sqlite3 = await sqlite3Init();

  const dbName = 'opfs' in sqlite3 ? `opfs:${DB_FILE}` : ':memory:';
  db = new sqlite3.oo1.DB(dbName, 'c');
  db.exec('PRAGMA foreign_keys=ON;');

  migrate(db);
  return db;
}

export function getDB(): Database {
  if (!db) throw new Error('DB not initialized. Call initDB() first.');
  return db;
}

export function isOPFSAvailable(): boolean {
  return sqlite3 !== null && 'opfs' in sqlite3;
}

export async function exportDB(): Promise<Uint8Array> {
  return sqlite3!.capi.sqlite3_js_db_export(getDB());
}

export function query<T = Record<string, unknown>>(sql: string, params?: unknown[]): T[] {
  const results: T[] = [];
  getDB().exec({ sql, bind: params, resultRows: results as Record<string, unknown>[], rowMode: 'object' });
  return results;
}

export function queryOne<T = Record<string, unknown>>(sql: string, params?: unknown[]): T | null {
  const rows = query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export function run(sql: string, params?: unknown[]): number {
  const database = getDB();
  database.exec({ sql, bind: params, resultRows: [], rowMode: 'object' });
  return sqlite3!.capi.sqlite3_last_insert_rowid(database);
}

// --- Schema ---

const SCHEMA = `
CREATE TABLE IF NOT EXISTS content_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    fields TEXT NOT NULL DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS content (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type_id INTEGER NOT NULL REFERENCES content_types(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    body TEXT DEFAULT '',
    data TEXT DEFAULT '{}',
    status TEXT DEFAULT 'draft',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(type_id, slug)
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

CREATE INDEX IF NOT EXISTS idx_content_type ON content(type_id);
`;

function migrate(database: Database): void {
  database.exec(SCHEMA);
  // Seed default content type if empty
  const count = queryOne<{ c: number }>('SELECT COUNT(*) as c FROM content_types');
  if (count && count.c === 0) {
    run(
      "INSERT INTO content_types (name, slug, fields) VALUES (?, ?, ?)",
      ['Post', 'posts', JSON.stringify([
        { name: 'title', type: 'text', required: true },
        { name: 'body', type: 'markdown', required: true },
      ])],
    );
  }
  // Seed default settings
  const siteName = queryOne<{ value: string }>("SELECT value FROM settings WHERE key = 'site_name'");
  if (!siteName) {
    run("INSERT INTO settings (key, value) VALUES ('site_name', 'My Evenflow Site')");
  }
}