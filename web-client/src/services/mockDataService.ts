import type { AIInsight } from '../types/ai';
import type { CrimeTrendDataPoint, DemographicPattern, DistrictStats, OfficerWorkload } from '../types/analytics';
import type { CaseRecord, CrimeCategory, Hotspot } from '../types/crime';
import type { SuspectGraph } from '../types/network';
import type { AppRole, RoleConfig } from '../types/role';
import { ROLE_CONFIGS } from '../types/role';
import type { AuditEvent, SecurityAlert, SystemHealthMetrics, UserSession } from '../types/system';
import { apiClient, toAppRole, type FrontendWorkspace } from './apiClient';
import {
  LIVE_AI_INSIGHTS,
  LIVE_AUDIT_EVENTS,
  LIVE_CASES,
  LIVE_CATEGORY_BREAKDOWN,
  LIVE_CRIME_TRENDS,
  LIVE_DEMOGRAPHICS,
  LIVE_DISTRICTS,
  LIVE_FORECAST,
  LIVE_FINANCIAL,
  LIVE_EXPLAINABLE,
  LIVE_HOTSPOTS,
  LIVE_NETWORK,
  LIVE_OFFICER_WORKLOADS,
  LIVE_OVERVIEW,
  LIVE_REPORTS,
  LIVE_SECURITY_ALERTS,
  LIVE_SOCIOLOGICAL,
  LIVE_SUPERVISOR_BOTTLENECKS,
  LIVE_SYSTEM_HEALTH,
  LIVE_USER_SESSIONS,
} from './liveDataStore';

function replaceArray<T>(target: T[], incoming: unknown): void {
  const values = (Array.isArray(incoming) ? incoming : []) as T[];
  try {
    target.splice(0, target.length, ...values);
  } catch {
    // Some chart libraries seal their input arrays after first render. Preserve
    // the verified snapshot instead of breaking authentication transitions.
    if (!target.length) throw new Error('Live workspace store is not writable');
  }
}

function crimeCategory(value: string): CrimeCategory {
  if (['Cybercrime', 'Property Theft', 'Organized Syndicate', 'Violent Crime', 'Financial Fraud', 'Narcotics', 'Public Order'].includes(value)) {
    return value as CrimeCategory;
  }
  return 'Public Order';
}

function normalizeHotspots(rows: unknown[]): Hotspot[] {
  const counts = rows.map(row => Number((row as Record<string, unknown>).crime_count || 0));
  const high = [...counts].sort((a, b) => b - a)[Math.max(0, Math.floor(counts.length * 0.2) - 1)] || 0;
  return rows.map((item, index) => {
    const row = item as Record<string, unknown>;
    const count = Number(row.crime_count || 0);
    return {
      id: `hotspot-${index + 1}`,
      district: String(row.district || 'Not recorded'),
      areaName: String(row.police_station || row.district || 'Not recorded'),
      latitude: Number(row.latitude || 0),
      longitude: Number(row.longitude || 0),
      intensity: count >= high ? 'HIGH' : count >= high * 0.7 ? 'ELEVATED' : 'MEDIUM',
      incidentCount: count,
      primaryCrimeType: crimeCategory(String(row.primary_crime_type || 'Public Order')),
      trendDirection: 'STABLE',
      lastUpdated: new Date().toISOString(),
    };
  });
}

const ROLE_PROMPTS: Record<AppRole, string[]> = {
  ADMIN: ['Show current platform risks', 'Summarize failed access attempts', 'Which services need attention?'],
  INVESTIGATOR: ['Summarize my active FIRs', 'Find similar cases by modus operandi', 'Show high-risk accused links'],
  ANALYST: ['Explain the strongest district trend', 'Compare crime categories over time', 'Show emerging hotspot evidence'],
  SUPERVISOR: ['Which queues are ageing?', 'Where should workload be rebalanced?', 'Summarize unresolved early warnings'],
  POLICYMAKER: ['Compare district safety trends', 'Explain statewide prevention priorities', 'Summarize socio-economic risk evidence'],
};

const CHART_COLORS = ['#2563eb', '#0f766e', '#d97706', '#be123c', '#7c3aed', '#0891b2'];

export class NammaKspDataService {
  private workspace: FrontendWorkspace | null = null;

  async hydrate(): Promise<FrontendWorkspace> {
    const workspace = await apiClient.loadWorkspace();
    this.workspace = workspace;
    replaceArray(LIVE_CASES, workspace.cases);
    replaceArray(LIVE_HOTSPOTS, normalizeHotspots(workspace.hotspots));
    replaceArray(LIVE_DISTRICTS, workspace.districts);
    replaceArray(LIVE_CRIME_TRENDS, workspace.crimeTrends);
    replaceArray(LIVE_DEMOGRAPHICS, workspace.demographics);
    replaceArray(LIVE_CATEGORY_BREAKDOWN, workspace.categoryBreakdown.map((item, index) => ({
      ...(item as Record<string, unknown>),
      color: CHART_COLORS[index % CHART_COLORS.length],
    })));
    replaceArray(LIVE_OFFICER_WORKLOADS, workspace.officerWorkloads);
    replaceArray(LIVE_SUPERVISOR_BOTTLENECKS, workspace.supervisorBottlenecks);
    replaceArray(LIVE_USER_SESSIONS, workspace.userSessions);
    replaceArray(LIVE_AUDIT_EVENTS, workspace.auditEvents);
    replaceArray(LIVE_SECURITY_ALERTS, workspace.securityAlerts);
    replaceArray(LIVE_REPORTS, workspace.reports);
    Object.assign(LIVE_NETWORK, workspace.network || { networks: [], nodes: [], edges: [] });
    Object.assign(LIVE_SYSTEM_HEALTH, workspace.systemHealth || {});
    Object.assign(LIVE_FORECAST, workspace.forecast || {});
    Object.assign(LIVE_SOCIOLOGICAL, workspace.sociological || {});
    Object.assign(LIVE_FINANCIAL, workspace.financial || {});
    Object.assign(LIVE_EXPLAINABLE, workspace.explainable || {});
    Object.assign(LIVE_OVERVIEW, workspace.overview || {});
    const role = toAppRole(workspace.identity.role);
    LIVE_AI_INSIGHTS[role] = workspace.aiInsight as AIInsight;
    return workspace;
  }

  clear(): void {
    this.workspace = null;
    [LIVE_CASES, LIVE_HOTSPOTS, LIVE_DISTRICTS, LIVE_CRIME_TRENDS, LIVE_DEMOGRAPHICS,
      LIVE_CATEGORY_BREAKDOWN, LIVE_OFFICER_WORKLOADS, LIVE_SUPERVISOR_BOTTLENECKS,
      LIVE_USER_SESSIONS, LIVE_AUDIT_EVENTS, LIVE_SECURITY_ALERTS, LIVE_REPORTS]
      .forEach(collection => {
        try { collection.splice(0, collection.length); } catch { /* sealed chart input */ }
      });
    Object.assign(LIVE_NETWORK, { networks: [], nodes: [], edges: [] });
  }

  getWorkspace(): FrontendWorkspace | null { return this.workspace; }
  getRoleConfig(role: AppRole): RoleConfig { return ROLE_CONFIGS[role]; }
  getAllCases(): CaseRecord[] { return LIVE_CASES; }
  getCaseById(id: string): CaseRecord | undefined { return LIVE_CASES.find(item => item.id === id || item.firNumber === id); }
  getHotspots(): Hotspot[] { return LIVE_HOTSPOTS; }
  getDistricts(): DistrictStats[] { return LIVE_DISTRICTS; }
  getCrimeTrends(): CrimeTrendDataPoint[] { return LIVE_CRIME_TRENDS; }
  getDemographics(): DemographicPattern[] { return LIVE_DEMOGRAPHICS; }
  getCategoryBreakdown() { return LIVE_CATEGORY_BREAKDOWN; }
  getSuspectGraph(): SuspectGraph { return LIVE_NETWORK; }
  getOfficerWorkloads(): OfficerWorkload[] { return LIVE_OFFICER_WORKLOADS; }
  getSupervisorBottlenecks() { return LIVE_SUPERVISOR_BOTTLENECKS; }
  getUserSessions(): UserSession[] { return LIVE_USER_SESSIONS; }
  getAuditEvents(): AuditEvent[] { return LIVE_AUDIT_EVENTS; }
  getSecurityAlerts(): SecurityAlert[] { return LIVE_SECURITY_ALERTS; }
  getSystemHealth(): SystemHealthMetrics { return LIVE_SYSTEM_HEALTH; }
  getForecast(): Record<string, unknown> { return LIVE_FORECAST; }
  getSociological(): Record<string, unknown> { return LIVE_SOCIOLOGICAL; }
  getFinancial(): Record<string, unknown> { return LIVE_FINANCIAL; }
  getExplainable(): Record<string, unknown> { return LIVE_EXPLAINABLE; }
  getReports(): Array<Record<string, unknown>> { return LIVE_REPORTS; }
  getOverview(): Record<string, number> { return LIVE_OVERVIEW; }
  getAIInsightForRole(role: AppRole): AIInsight {
    return LIVE_AI_INSIGHTS[role] || {
      id: `${role.toLowerCase()}-pending`, role, timestamp: new Date().toISOString(),
      headline: 'Verified intelligence is loading', body: 'The authenticated workspace is synchronizing with the NAMMA KSP registry.',
      confidenceScore: 0, evidence: [], actionItems: [], severity: 'INFO',
      disclaimer: 'Operational action requires authorized human review.',
    };
  }
  getSuggestedPromptsForRole(role: AppRole, _language?: string): string[] { return ROLE_PROMPTS[role]; }
}

export const dataService = new NammaKspDataService();
