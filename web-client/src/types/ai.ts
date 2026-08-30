import type { AppRole } from './role';

export interface EvidenceReference {
  id: string;
  type: 'FIR_RECORD' | 'MO_PATTERN' | 'SYSTEM_LOG' | 'HOTSPOT_DATA' | 'WORKLOAD_ENTRY';
  title: string;
  referenceCode: string;
  snippet: string;
  timestamp?: string;
}

export interface AIInsight {
  id: string;
  role: AppRole;
  timestamp: string;
  headline: string;
  body: string;
  confidenceScore: number; // 0 - 100
  evidence: EvidenceReference[];
  actionItems: string[];
  severity: 'CRITICAL' | 'HIGH' | 'WARNING' | 'INFO';
  disclaimer: string;
}

export interface AIChatMessage {
  id: string;
  sender: 'USER' | 'AI';
  timestamp: string;
  text: string;
  role: AppRole;
  insightRef?: AIInsight;
  suggestedFollowups?: string[];
  evidence?: EvidenceReference[];
}

export interface AIExplanationModalData {
  title: string;
  contextType: string;
  timePeriod: string;
  affectedLocation: string;
  keyDrivers: string[];
  supportingRecords: EvidenceReference[];
  confidence: number;
  analyticalSummary: string;
}
