import type { AIInsight } from '../types/ai';
import type { CrimeTrendDataPoint, DemographicPattern, DistrictStats, OfficerWorkload } from '../types/analytics';
import type { CaseRecord, Hotspot } from '../types/crime';
import type { SuspectGraph } from '../types/network';
import type { AppRole } from '../types/role';
import type { AuditEvent, SecurityAlert, SystemHealthMetrics, UserSession } from '../types/system';

export const LIVE_CASES: CaseRecord[] = [];
export const LIVE_HOTSPOTS: Hotspot[] = [];
export const LIVE_DISTRICTS: DistrictStats[] = [];
export const LIVE_CRIME_TRENDS: CrimeTrendDataPoint[] = [];
export const LIVE_DEMOGRAPHICS: DemographicPattern[] = [];
export const LIVE_CATEGORY_BREAKDOWN: Array<{ name: string; value: number; count?: number; color: string }> = [];
export const LIVE_NETWORK: SuspectGraph = { networks: [], nodes: [], edges: [] };
export const LIVE_OFFICER_WORKLOADS: OfficerWorkload[] = [];
export const LIVE_SUPERVISOR_BOTTLENECKS: Array<Record<string, unknown>> = [];
export const LIVE_USER_SESSIONS: UserSession[] = [];
export const LIVE_AUDIT_EVENTS: AuditEvent[] = [];
export const LIVE_SECURITY_ALERTS: SecurityAlert[] = [];
export const LIVE_SYSTEM_HEALTH: SystemHealthMetrics = {
  databaseLatencyMs: 0,
  activeUserCount: 0,
  systemUptimePercentage: 0,
  aiQueriesLastHour: 0,
  catalystConnectionStatus: 'DEGRADED',
  cpuUtilizationPercent: 0,
  memoryUsagePercent: 0,
  storageUsedTB: 0,
  totalStorageTB: 0,
};
export const LIVE_AI_INSIGHTS: Partial<Record<AppRole, AIInsight>> = {};
export const LIVE_REPORTS: Array<Record<string, unknown>> = [];
export const LIVE_FORECAST: Record<string, unknown> = {};
export const LIVE_SOCIOLOGICAL: Record<string, unknown> = {};
export const LIVE_FINANCIAL: Record<string, unknown> = {};
export const LIVE_EXPLAINABLE: Record<string, unknown> = {};
export const LIVE_OVERVIEW: Record<string, number> = {};
