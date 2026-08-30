export type Role = 'Investigator' | 'Analyst' | 'Supervisor' | 'Policymaker' | 'Administrator';

export interface Workspace {
  workspace_id: string;
  title: string;
  purpose: string;
  role: Role;
  capabilities: string[];
  disclosure_mode: string;
  data_classification: string;
  district_scope: string[];
  command_scope: string[];
}

export interface Overview {
  total_firs?: number;
  open_cases?: number;
  under_investigation?: number;
  active_cases?: number;
  closed_cases?: number;
  total_offenders?: number;
  repeat_offenders?: number;
  districts_covered?: number;
  total_districts?: number;
  closure_rate?: number;
}

export interface FIR {
  fir_id: string;
  crime_type?: string;
  district?: string;
  police_station?: string;
  fir_date?: string;
  date?: string;
  status?: string;
  accused_name?: string;
  victim_name?: string;
  priority?: string;
  assigned_to?: string;
  [key: string]: unknown;
}

export interface TrendPoint { month?: string; year?: string | number; count: number; }
export interface CrimeTypePoint { crime_type?: string; name?: string; count: number; }
export interface DistrictPoint { district: string; count?: number; total?: number; total_crimes?: number; open_cases?: number; closed_cases?: number; active?: number; closed?: number; }

export interface RoleIntelligenceItem {
  title?: string;
  label?: string;
  value?: string | number;
  detail?: string;
  severity?: string;
  action?: string;
  href?: string;
  [key: string]: unknown;
}

export interface RoleIntelligence {
  role?: Role;
  generated_at?: string;
  items?: RoleIntelligenceItem[];
  metrics?: Record<string, unknown>;
  [key: string]: unknown;
}
