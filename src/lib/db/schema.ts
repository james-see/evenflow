import type { Database } from '@sqlite.org/sqlite-wasm';

/**
 * Database schema for Evenflow.
 * All tables created idempotently — safe to run on every init.
 */

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS providers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    credentials_encrypted BLOB,
    region TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS service_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#3377ff',
    parent_id INTEGER REFERENCES service_groups(id)
);

CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider_id INTEGER REFERENCES providers(id),
    service_id TEXT NOT NULL,
    name TEXT,
    type TEXT,
    region TEXT,
    monthly_cost REAL DEFAULT 0,
    status TEXT DEFAULT 'running',
    tags TEXT,
    group_id INTEGER REFERENCES service_groups(id),
    last_synced TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(provider_id, service_id)
);

CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    scope TEXT NOT NULL DEFAULT 'all',
    scope_id INTEGER,
    limit_monthly REAL NOT NULL,
    alert_thresholds TEXT DEFAULT '[50,75,90,100]',
    auto_action TEXT DEFAULT 'notify',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS usage_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id INTEGER NOT NULL REFERENCES services(id),
    timestamp TEXT NOT NULL,
    cost REAL,
    cpu_util REAL,
    memory_util REAL,
    network_in REAL,
    network_out REAL,
    UNIQUE(service_id, timestamp)
);

CREATE TABLE IF NOT EXISTS triggers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    condition TEXT NOT NULL,
    action TEXT NOT NULL DEFAULT 'notify',
    action_config TEXT,
    enabled INTEGER DEFAULT 1,
    last_fired TEXT
);

CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trigger_id INTEGER REFERENCES triggers(id),
    budget_id INTEGER REFERENCES budgets(id),
    message TEXT,
    severity TEXT DEFAULT 'info',
    created_at TEXT DEFAULT (datetime('now')),
    acknowledged INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_services_group ON services(group_id);
CREATE INDEX IF NOT EXISTS idx_services_provider ON services(provider_id);
CREATE INDEX IF NOT EXISTS idx_usage_snapshots_service ON usage_snapshots(service_id);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at);
`;

export async function migrate(db: Database): Promise<void> {
  db.exec(SCHEMA_SQL);
}