export type NetworkNodeType = 'ACCUSED' | 'VICTIM' | 'CASE' | 'LOCATION' | 'PHONE' | 'BANK_ACCOUNT' | 'VEHICLE' | 'SYNDICATE';

export interface NetworkNode {
  id: string;
  label: string;
  type: NetworkNodeType;
  subText?: string;
  riskLevel?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'NORMAL';
  networkId?: string;
  x?: number;
  y?: number;
  details?: {
    firNumber?: string;
    phone?: string;
    district?: string;
    crimeType?: string;
    location?: string;
    station?: string;
    filedDate?: string;
    provenance?: string;
    alias?: string;
    priorOffenses?: number;
    status?: 'SUSPECT' | 'ABSCONDING' | 'UNDER_ARREST' | 'INTERROGATED';
    crimesList?: string[];
  };
}

export interface NetworkRelationship {
  id: string;
  source: string; // node id
  target: string; // node id
  relationType: 'CO_ACCUSED' | 'FINANCIAL_TRANSFER' | 'CALL_LOG' | 'SAME_LOCATION' | 'MO_MATCH' | 'LEADER_OF';
  weight: number; // 1 - 10 strength
  description: string;
  networkId?: string;
  firNumber?: string;
  amount?: number;
  provenance?: string;
}

export interface CriminalNetworkInfo {
  id: string;
  name: string;
  district: string;
  category: string;
  threatLevel: 'CRITICAL' | 'HIGH' | 'ELEVATED';
  briefSummary: string;
  modusOperandi: string;
  totalFinancialImpact: string;
  primaryAccusedId: string;
  memberIds: string[];
}

export interface SuspectGraph {
  networks: CriminalNetworkInfo[];
  nodes: NetworkNode[];
  edges: NetworkRelationship[];
}
