/// <reference types="@sqlite.org/sqlite-wasm" />
/**
 * Evenflow CMS — SQLite WASM Worker
 *
 * Runs SQLite in a Worker thread so OPFS persistence is available.
 * The main thread communicates via postMessage.
 */
// Web Crypto API ambient declarations (needed because Astro's strict config excludes DOM)
declare const crypto: {
  getRandomValues: <T extends ArrayBufferView>(buffer: T) => T;
  subtle: {
    importKey(format: 'raw', keyData: BufferSource, algorithm: any, extractable: boolean, keyUsages: string[]): Promise<any>;
    deriveBits(params: { name: string; salt: Uint8Array; iterations: number; hash: string }, baseKey: any, length: number): Promise<ArrayBuffer>;
  };
};

import sqlite3InitMod from '@sqlite.org/sqlite-wasm';
const sqlite3Init = sqlite3InitMod as () => Promise<any>;
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
let sqlite3: any = null;
let db: any = null;
let opfs = false;
let initError: string | null = null;

// ── PBKDF2 helpers (Web Crypto, available in workers) ──

function buf2hex(buf: Uint8Array): string {
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hashPassword(password: string): Promise<{ saltHex: string; hashHex: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(32));
  const enc = new TextEncoder().encode(password);
  const keyMaterial = await crypto.subtle.importKey('raw', enc, { name: 'PBKDF2' }, false, ['deriveBits']);
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    256,
  );
  return { saltHex: buf2hex(salt), hashHex: buf2hex(new Uint8Array(derived)) };
}

async function verifyPassword(password: string, saltHex: string, hashHex: string): Promise<boolean> {
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map((b: string) => parseInt(b, 16)));
  const enc = new TextEncoder().encode(password);
  const keyMaterial = await crypto.subtle.importKey('raw', enc, { name: 'PBKDF2' }, false, ['deriveBits']);
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    256,
  );
  return buf2hex(new Uint8Array(derived)) === hashHex;
}

function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(48));
  return Array.from(new Uint8Array(bytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

let loginAttempts = 0;
let loginAttemptsResetAt = 0;
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

function isLoginRateLimited(): boolean {
  const now = Date.now();
  if (now > loginAttemptsResetAt) {
    loginAttempts = 0;
    loginAttemptsResetAt = now + LOGIN_LOCKOUT_MS;
  }
  loginAttempts++;
  return loginAttempts > MAX_LOGIN_ATTEMPTS;
}

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_salt TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'editor',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
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
  `CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    ip_address TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL DEFAULT 0,
    data BLOB NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_content_type ON content(type_id)`,
  `CREATE INDEX IF NOT EXISTS idx_media_name ON media(name)`,
];

async function init() {
  sqlite3 = await sqlite3Init();

  // Try opfs-sahpool first
  let localInitError = '';
  try {
    const poolUtil = await sqlite3.installOpfsSAHPoolVfs();
    const DbClass = poolUtil?.OpfsSAHPoolDb || sqlite3.oo1.OpfsSAHPoolDb;
    if (!DbClass) throw new Error('OpfsSAHPoolDb class not found');
    db = new DbClass('/evenflow-cms.sqlite3', 'c');
    opfs = true;
  } catch (sahErr: any) {
    localInitError += `sahpool: ${sahErr?.message || sahErr}` + '\n';
    try {
      if (sqlite3.oo1.OpfsDb) {
        db = new sqlite3.oo1.OpfsDb('/evenflow-cms.sqlite3', 'c');
        opfs = true;
      } else {
        throw new Error('OpfsDb not available');
      }
    } catch (opfsErr: any) {
      localInitError += ` | opfs: ${opfsErr?.message || opfsErr}` + '\n';
      db = new sqlite3.oo1.DB(':memory:', 'c');
      opfs = false;
    }
  }

  initError = localInitError || null;

  db.exec('PRAGMA foreign_keys=ON;');

  // Run schema migrations
  for (const stmt of SCHEMA_STATEMENTS) {
    try { db.exec(stmt); } catch (_) {}
  }

  // Seed default user if empty — WITH PBKDF2 hashing
  const usersCheck: any[] = [];
  db.exec({ sql: "SELECT COUNT(*) as c FROM users", resultRows: usersCheck, rowMode: 'object' });
  if (usersCheck.length > 0 && usersCheck[0].c === 0) {
    const pw = await hashPassword('admin123');
    db.exec({
      sql: "INSERT INTO users (username, password_salt, password_hash, role) VALUES (?, ?, ?, ?)",
      bind: ['admin', pw.saltHex, pw.hashHex, 'admin']
    });
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

  // Cleanup expired sessions on init
  try {
    db.exec("DELETE FROM sessions WHERE expires_at < datetime('now')");
  } catch (_) {}
}

// ── Session expiration helper ──
function sessionExpiry(): string {
  const d = new Date();
  d.setHours(d.getHours() + 168); // 7 days
  return d.toISOString().replace('T', ' ').substring(0, 19);
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
      (self as any).postMessage({ id: req.id, data, result: { rows: [] } }, [data.buffer]);
    }

    // ── Auth endpoints ──

    else if (req.type === 'auth_check') {
      if (isLoginRateLimited()) {
        (self as any).postMessage({ id: req.id, error: 'Too many login attempts. Try again later.', rows: [] });
        return;
      }
      // Verify password hash against user in DB
      const { username, password }: { username: string; password: string } = req;
      const users: any[] = [];
      db.exec({ sql: "SELECT id, username, password_salt, password_hash, role FROM users WHERE username = ?", bind: [username], resultRows: users, rowMode: 'object' });
      if (users.length === 0) {
        (self as any).postMessage({ id: req.id, error: 'Invalid credentials', rows: [] });
        return;
      }
      const user = users[0];
      const valid = await verifyPassword(password, user.password_salt, user.password_hash);
      if (!valid) {
        (self as any).postMessage({ id: req.id, error: 'Invalid credentials', rows: [] });
        return;
      }
      // Reset attempts on success
      loginAttempts = 0;
      // Return only safe fields — no password data leaks
      const safe = { id: user.id, username: user.username, role: user.role };
      (self as any).postMessage({ id: req.id, result: { user: safe } });
    }

    else if (req.type === 'session_create') {
      // Create a new session for the given user_id; returns the token
      const userId: number = req.userId;
      const token = generateToken();
      const expiresAt = sessionExpiry();
      db.exec("DELETE FROM sessions WHERE user_id = ?", [userId]); // invalidate existing sessions for this user
      db.exec({
        sql: "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)",
        bind: [token, userId, expiresAt]
      });
      const insertId = sqlite3.capi.sqlite3_last_insert_rowid(db);
      (self as any).postMessage({ id: req.id, result: { rows: [], token } });
    }

    else if (req.type === 'session_verify') {
      // Check if a session token is valid and non-expired; return user info
      const token: string = req.token;
      const sessions: any[] = [];
      db.exec({
        sql: "SELECT s.id, s.token, s.user_id, u.username, u.role FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.expires_at > datetime('now') ORDER BY s.id DESC LIMIT 1",
        bind: [token],
        resultRows: sessions,
        rowMode: 'object'
      });
      if (sessions.length === 0) {
        (self as any).postMessage({ id: req.id, result: { rows: [] } });
        return;
      }
      const session = sessions[0];
      // Also get the user row for additional fields
      const extUserQuery: any[] = [];
      db.exec({
        sql: "SELECT id, username, role, created_at FROM users WHERE id = ?",
        bind: [session.user_id],
        resultRows: extUserQuery,
        rowMode: 'object'
      });
      (self as any).postMessage({
        id: req.id,
        result: { rows: [{ ...session, created_at: extUserQuery[0]?.created_at }] }
      });
    }

    else if (req.type === 'session_delete') {
      const token: string = req.token;
      db.exec("DELETE FROM sessions WHERE token = ?", [token]);
      (self as any).postMessage({ id: req.id, result: { rows: [] } });
    }

    else if (req.type === 'password_change') {
      const userId: number = req.userId;
      const currentPassword: string = req.currentPassword;
      const newPassword: string = req.newPassword;
      // Verify current password first
      const userRows: any[] = [];
      db.exec({
        sql: "SELECT id, username, password_salt, password_hash FROM users WHERE id = ?",
        bind: [userId],
        resultRows: userRows,
        rowMode: 'object'
      });
      if (userRows.length === 0 || !await verifyPassword(currentPassword, userRows[0].password_salt, userRows[0].password_hash)) {
        (self as any).postMessage({ id: req.id, error: 'Current password is incorrect' });
        return;
      }
      // Update to new hashed password
      const { saltHex, hashHex } = await hashPassword(newPassword);
      db.exec({
        sql: "UPDATE users SET password_salt = ?, password_hash = ?, updated_at = datetime('now') WHERE id = ?",
        bind: [saltHex, hashHex, userId]
      });
      // Revoke all sessions for this user (force re-login)
      db.exec("DELETE FROM sessions WHERE user_id = ?", [userId]);
      (self as any).postMessage({ id: req.id, result: { rows: [] } });
    }

    else if (req.type === 'media_insert') {
      const { name, mimeType, size, data }: { name: string; mimeType: string; size: number; data: Uint8Array } = req;
      db.exec({
        sql: "INSERT INTO media (name, mime_type, size, data) VALUES (?, ?, ?, ?)",
        bind: [name, mimeType, size, data],
      });
      const insertId = sqlite3.capi.sqlite3_last_insert_rowid(db);
      (self as any).postMessage({ id: req.id, result: { rows: [], insertId } }, [data.buffer]);
    }

    else if (req.type === 'media_list') {
      const rows: any[] = [];
      db.exec({ sql: "SELECT id, name, mime_type, size, created_at FROM media ORDER BY created_at DESC", resultRows: rows, rowMode: 'object' });
      (self as any).postMessage({ id: req.id, result: { rows } });
    }

    else if (req.type === 'media_get') {
      const mediaId: number = req.mediaId;
      const rows: any[] = [];
      db.exec({ sql: "SELECT id, name, mime_type, size, data, created_at FROM media WHERE id = ?", bind: [mediaId], resultRows: rows, rowMode: 'object' });
      if (rows.length === 0) {
        (self as any).postMessage({ id: req.id, error: 'Media not found' });
        return;
      }
      const row = rows[0];
      (self as any).postMessage({ id: req.id, result: { rows: [row] }, data: row.data }, [row.data.buffer]);
    }

    else if (req.type === 'media_delete') {
      const id: number = req.id;
      db.exec("DELETE FROM media WHERE id = ?", [id]);
      (self as any).postMessage({ id: req.id, result: { rows: [] } });
    }

  } catch (err: any) {
    (self as any).postMessage({ id: req.id, error: err.message || String(err) });
  }
};
