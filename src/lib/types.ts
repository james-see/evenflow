export interface Provider {
  id: number;
  name: string;
  type: string;
  credentials_encrypted: Uint8Array | null;
  region: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceGroup {
  id: number;
  name: string;
  color: string;
  parent_id: number | null;
}

export interface Service {
  id: number;
  provider_id: number | null;
  service_id: string;
  name: string | null;
  type: string | null;
  region: string | null;
  monthly_cost: number;
  status: string;
  tags: string | null;
  group_id: number | null;
  last_synced: string | null;
  created_at: string;
}

export interface Budget {
  id: number;
  name: string;
  scope: string;
  scope_id: number | null;
  limit_monthly: number;
  alert_thresholds: string;
  auto_action: string;
  created_at: string;
}

export interface Trigger {
  id: number;
  name: string;
  condition: string;
  action: string;
  action_config: string | null;
  enabled: number;
  last_fired: string | null;
}

export interface Alert {
  id: number;
  trigger_id: number | null;
  budget_id: number | null;
  message: string | null;
  severity: string;
  created_at: string;
  acknowledged: number;
}

export interface DashboardStats {
  totalMonthlyCost: number;
  serviceCount: number;
  budgetCount: number;
  budgetLimit: number;
  alertCount: number;
}