import type { AppRole } from './role';

export interface UserSession {
  id: string;
  name: string;
  badgeNumber: string;
  role: AppRole;
  rank: string;
  department: string;
  lastLogin: string;
  ipAddress: string;
  activeStatus: 'ACTIVE' | 'IDLE' | 'LOGGED_OUT';
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: AppRole;
  action: 'ROLE_CHANGE' | 'DATA_EXPORT' | 'CASE_OVERRIDE' | 'PERMISSION_GRANT' | 'LOGIN_FAILURE' | 'API_CONFIG_EDIT' | 'SUSPECT_SEARCH';
  targetResource: string;
  ipAddress: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  flaggedByAI?: boolean;
  status: 'REVIEWED' | 'UNREVIEWED' | 'ESCALATED';
}

export interface SecurityAlert {
  id: string;
  timestamp: string;
  alertType: 'UNUSUAL_ACCESS' | 'MASS_EXPORT_ATTEMPT' | 'PRIVILEGE_ESCALATION' | 'MULTIPLE_FAILED_LOGINS' | 'OFF_HOURS_QUERY';
  description: string;
  userAffected: string;
  ipAddress: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  recommendedAction: string;
}

export interface SystemHealthMetrics {
  databaseLatencyMs: number;
  activeUserCount: number;
  systemUptimePercentage: number;
  aiQueriesLastHour: number;
  catalystConnectionStatus: 'LIVE' | 'DEGRADED';
  cpuUtilizationPercent: number;
  memoryUsagePercent: number;
  storageUsedTB: number;
  totalStorageTB: number;
}
