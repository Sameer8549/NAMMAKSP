import type { CrimeCategory } from './crime';

export interface CrimeTrendDataPoint {
  date: string;
  totalIncidents: number;
  cybercrime: number;
  propertyTheft: number;
  violentCrime: number;
  financialFraud: number;
  narcotics: number;
  projected?: number;
}

export interface DistrictStats {
  id: string;
  name: string;
  karnatakaCode: string;
  totalCases: number;
  resolvedCases: number;
  pendingCases: number;
  clearanceRate: number; // Percentage
  crimeRatePerLakh: number;
  dominantCategory: CrimeCategory;
  riskStatus: 'HIGH_ALERT' | 'MODERATE' | 'NORMAL';
  trendPercentage: number;
  coordinates: {
    lat: number;
    lng: number;
  };
  svgPath?: string;
}

export interface OfficerWorkload {
  officerId: string;
  officerName: string;
  rank: string;
  badgeNumber: string;
  station: string;
  activeCasesCount: number;
  agingCasesCount: number;
  resolvedThisMonth: number;
  capacityUtilization: number;
  status: 'OVERLOADED' | 'OPTIMAL' | 'UNDER_UTILIZED';
}

export interface DemographicPattern {
  ageGroup: string;
  victimPercentage: number;
  accusedPercentage: number;
}

export interface MetricCardData {
  id: string;
  label: string;
  value: string | number;
  changeText?: string;
  trend: 'UP' | 'DOWN' | 'NEUTRAL';
  isCritical?: boolean;
  subValue?: string;
  badge?: string;
}
