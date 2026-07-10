/// <reference types="@sqlite.org/sqlite-wasm" />
/**
 * Evenflow CMS — SQLite WASM Worker
 *
 * Runs SQLite in a Worker thread so OPFS persistence is available.
 * The main thread communicates via postMessage.
 */
import { default as sqlite3Init } from '@sqlite.org/sqlite-wasm';

// @ts-ignore — no type defs for the SAH pool API
let sqlite3: any = null;
let db: any = null;
let opfs = false;
let initError: string | null = null;

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS content_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    fields TEXT NOT NULL DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS content (
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
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_content_type ON content(type_id)`,
];

async function init() {
  sqlite3 = await sqlite3Init();

  // Try opfs-sahpool first (best option: no COOP/COEP needed, works cross-browser)
  initError = null;
  try {
    const poolUtil = await sqlite3.installOpfsSAHPoolVfs();
    // OpfsSAHPoolDb is on the returned poolUtil, not sqlite3.oo1
    const DbClass = poolUtil?.OpfsSAHPoolDb || sqlite3.oo1.OpfsSAHPoolDb;
    if (!DbClass) throw new Error('OpfsSAHPoolDb class not found after install');
    db = new DbClass('/evenflow-cms.sqlite3', 'c');
    opfs = true;
  } catch (sahErr) {
    initError = `sahpool: ${sahErr?.message || sahErr}`;
    // Try regular opfs VFS (needs COOP/COEP — which we set)
    try {
      if (sqlite3.oo1.OpfsDb) {
        db = new sqlite3.oo1.OpfsDb('/evenflow-cms.sqlite3', 'c');
        opfs = true;
      } else {
        throw new Error('OpfsDb not available');
      }
    } catch (opfsErr) {
      initError += ` | opfs: ${opfsErr?.message || opfsErr}`;
      // Fall back to in-memory
      db = new sqlite3.oo1.DB(':memory:', 'c');
      opfs = false;
    }
  }

  db.exec('PRAGMA foreign_keys=ON;');

  // Run schema migrations
  for (const stmt of SCHEMA_STATEMENTS) {
    db.exec(stmt);
  }

  // Seed default content type if empty
  const count: any[] = [];
  db.exec({ sql: 'SELECT COUNT(*) as c FROM content_types', resultRows: count, rowMode: 'object' });
  if (count.length > 0 && count[0].c === 0) {
    db.exec({
      sql: 'INSERT INTO content_types (name, slug, fields) VALUES (?, ?, ?)',
      bind: ['Post', 'posts', JSON.stringify([
        { name: 'title', type: 'text', required: true },
        { name: 'body', type: 'markdown', required: true },
      ])],
    });
  }

  // Seed default settings
  const settingsCheck: any[] = [];
  db.exec({ sql: "SELECT value FROM settings WHERE key = 'site_name'", resultRows: settingsCheck, rowMode: 'object' });
  if (settingsCheck.length === 0) {
    db.exec({ sql: "INSERT INTO settings (key, value) VALUES ('site_name', 'My Evenflow Site')" });
  }
}

self.onmessage = async (e: MessageEvent) => {
  const req = e.data;
  try {
    if (req.type === 'init') {
      await init();
      (self as any).postMessage({ id: req.id, ready: true, opfs, initError });
    } else if (req.type === 'query') {
      const rows: any[] = [];
      db.exec({ sql: req.sql, bind: req.params, resultRows: rows, rowMode: 'object' });
      (self as any).postMessage({ id: req.id, result: { rows } });
    } else if (req.type === 'queryOne') {
      const rows: any[] = [];
      db.exec({ sql: req.sql, bind: req.params, resultRows: rows, rowMode: 'object' });
      (self as any).postMessage({ id: req.id, result: { rows: rows.length > 0 ? [rows[0]] : [] } });
    } else if (req.type === 'run') {
      db.exec({ sql: req.sql, bind: req.params, resultRows: [], rowMode: 'object' });
      const insertId = sqlite3.capi.sqlite3_last_insert_rowid(db);
      (self as any).postMessage({ id: req.id, result: { rows: [], insertId } });
    } else if (req.type === 'exec') {
      db.exec(req.sql);
      (self as any).postMessage({ id: req.id, result: { rows: [] } });
    } else if (req.type === 'export') {
      const data = sqlite3.capi.sqlite3_js_db_export(db);
      // Transfer the buffer to avoid copy
      (self as any).postMessage({ id: req.id, data, result: { rows: [] } }, [data.buffer]);
    }
  } catch (err: any) {
    (self as any).postMessage({ id: req.id, error: err.message || String(err) });
  }
};