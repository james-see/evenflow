import { query, queryOne, run } from './client';
import type { Service, Budget, ServiceGroup, DashboardStats, Alert } from '../types';

// --- Services ---

export function getServices(): Service[] {
  return query<Service>(`
    SELECT s.*, g.name as group_name, p.name as provider_name
    FROM services s
    LEFT JOIN service_groups g ON s.group_id = g.id
    LEFT JOIN providers p ON s.provider_id = p.id
    ORDER BY s.name
  `);
}

export function getService(id: number): Service | null {
  return queryOne<Service>('SELECT * FROM services WHERE id = ?', [id]);
}

export function createService(data: Partial<Service>): number {
  return run(
    `INSERT INTO services (service_id, name, type, region, monthly_cost, status, tags, group_id, provider_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.service_id ?? crypto.randomUUID(),
      data.name ?? null,
      data.type ?? null,
      data.region ?? null,
      data.monthly_cost ?? 0,
      data.status ?? 'running',
      data.tags ?? null,
      data.group_id ?? null,
      data.provider_id ?? null,
    ],
  );
}

export function updateService(id: number, data: Partial<Service>): void {
  const fields: string[] = [];
  const values: unknown[] = [];
  for (const [key, val] of Object.entries(data)) {
    if (['name', 'type', 'region', 'monthly_cost', 'status', 'tags', 'group_id'].includes(key)) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
  }
  if (fields.length === 0) return;
  values.push(id);
  query(`UPDATE services SET ${fields.join(', ')} WHERE id = ?`, values);
}

export function deleteService(id: number): void {
  query('DELETE FROM services WHERE id = ?', [id]);
}

// --- Groups ---

export function getGroups(): ServiceGroup[] {
  return query<ServiceGroup>('SELECT * FROM service_groups ORDER BY name');
}

export function createGroup(name: string, color: string = '#3377ff', parentId: number | null = null): number {
  return run(
    'INSERT INTO service_groups (name, color, parent_id) VALUES (?, ?, ?)',
    [name, color, parentId],
  );
}

export function deleteGroup(id: number): void {
  query('UPDATE services SET group_id = NULL WHERE group_id = ?', [id]);
  query('DELETE FROM service_groups WHERE id = ?', [id]);
}

// --- Budgets ---

export function getBudgets(): Budget[] {
  return query<Budget>('SELECT * FROM budgets ORDER BY name');
}

export function createBudget(data: Partial<Budget>): number {
  return run(
    `INSERT INTO budgets (name, scope, scope_id, limit_monthly, alert_thresholds, auto_action)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.name ?? 'New Budget',
      data.scope ?? 'all',
      data.scope_id ?? null,
      data.limit_monthly ?? 0,
      data.alert_thresholds ?? '[50,75,90,100]',
      data.auto_action ?? 'notify',
    ],
  );
}

export function deleteBudget(id: number): void {
  query('DELETE FROM budgets WHERE id = ?', [id]);
}

// --- Alerts ---

export function getAlerts(limit: number = 50): Alert[] {
  return query<Alert>(
    'SELECT * FROM alerts ORDER BY created_at DESC LIMIT ?',
    [limit],
  );
}

export function acknowledgeAlert(id: number): void {
  query('UPDATE alerts SET acknowledged = 1 WHERE id = ?', [id]);
}

export function createAlert(message: string, severity: string = 'info', triggerId?: number, budgetId?: number): void {
  run(
    'INSERT INTO alerts (message, severity, trigger_id, budget_id) VALUES (?, ?, ?, ?)',
    [message, severity, triggerId ?? null, budgetId ?? null],
  );
}

// --- Dashboard stats ---

export function getDashboardStats(): DashboardStats {
  const costRow = queryOne<{ total: number | null }>('SELECT COALESCE(SUM(monthly_cost), 0) as total FROM services');
  const countRow = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM services');
  const budgetRow = queryOne<{ count: number; limit: number | null }>(
    'SELECT COUNT(*) as count, COALESCE(SUM(limit_monthly), 0) as limit FROM budgets',
  );
  const alertRow = queryOne<{ count: number }>("SELECT COUNT(*) as count FROM alerts WHERE acknowledged = 0");

  return {
    totalMonthlyCost: costRow?.total ?? 0,
    serviceCount: countRow?.count ?? 0,
    budgetCount: budgetRow?.count ?? 0,
    budgetLimit: budgetRow?.limit ?? 0,
    alertCount: alertRow?.count ?? 0,
  };
}