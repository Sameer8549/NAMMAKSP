export type CasePriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type CaseStatus = 'OPEN' | 'UNDER_INVESTIGATION' | 'PENDING_REVIEW' | 'CHARGE_SHEETED' | 'CLOSED';
export type CrimeCategory = 'Cybercrime' | 'Property Theft' | 'Organized Syndicate' | 'Violent Crime' | 'Financial Fraud' | 'Narcotics' | 'Public Order';

export interface Location {
  district: string;
  subdivision: string;
  station: string;
  latitude: number;
  longitude: number;
  addressSnippet?: string;
}

export interface AccusedProfile {
  id: string;
  name: string;
  alias?: string;
  age: number;
  gender: string;
  priorOffensesCount: number;
  knownSyndicateAffiliation?: string;
  status: 'UNDER_ARREST' | 'ABSCONDING' | 'INTERROGATED' | 'SUSPECT';
  riskScore: number; // 1-100
  photoUrl?: string;
}

export interface VictimProfile {
  id: string;
  category: 'Individual' | 'Commercial Institution' | 'Government Body' | 'Public Group';
  description: string;
  injurySeverity?: 'None' | 'Minor' | 'Severe' | 'Fatal';
}

export interface ModusOperandi {
  primaryMethod: string;
  entryPoint?: string;
  toolsUsed: string[];
  targetProfile: string;
  timeWindow: string;
  uniqueSignature: string;
}

export interface CaseTimelineEvent {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  actor: string;
  type: 'FIR_FILED' | 'EVIDENCE_ADDED' | 'ACCUSED_SPOTTED' | 'INTERROGATION' | 'FORENSIC_REPORT' | 'STATUS_CHANGE';
}

export interface CaseRecord {
  id: string;
  firNumber: string;
  title: string;
  category: CrimeCategory;
  ipcSections: string[];
  priority: CasePriority;
  status: CaseStatus;
  incidentDate: string;
  filedDate: string;
  daysAging: number;
  assignedOfficer: {
    id: string;
    name: string;
    badgeNumber: string;
    station: string;
  };
  location: Location;
  accused: AccusedProfile[];
  victim: VictimProfile;
  modusOperandi: ModusOperandi;
  timeline: CaseTimelineEvent[];
  summary: string;
  leadsCount: number;
  similarCasesCount: number;
}

export interface Hotspot {
  id: string;
  district: string;
  areaName: string;
  latitude: number;
  longitude: number;
  intensity: 'HIGH' | 'MEDIUM' | 'ELEVATED';
  incidentCount: number;
  primaryCrimeType: CrimeCategory;
  trendDirection: 'RISING' | 'STABLE' | 'DECLINING';
  lastUpdated: string;
}

export interface InvestigationLead {
  id: string;
  caseFir: string;
  title: string;
  confidenceScore: number;
  evidenceBasis: string;
  suggestedNextStep: string;
  leadType: 'MO_PATTERN' | 'FINANCIAL_TRACE' | 'CDR_LINK' | 'FORENSIC_MATCH' | 'SUSPECT_LOCATION';
  status: 'VERIFIED' | 'UNDER_REVIEW' | 'ACTION_REQUIRED';
}

export interface SimilarCaseMatch {
  id: string;
  activeFir: string;
  matchedFir: string;
  matchedTitle: string;
  district: string;
  similarityScore: number;
  matchedSignature: string;
  overlappingMO: string[];
}

