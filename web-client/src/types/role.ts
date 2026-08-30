export type AppRole = 'ADMIN' | 'INVESTIGATOR' | 'ANALYST' | 'SUPERVISOR' | 'POLICYMAKER';

export interface RoleConfig {
  id: AppRole;
  title: string;
  subtitle: string;
  identity: string;
  purpose: string;
  mission: string;
  primaryQuestion: string;
  iconName: string;
  badgeColor: string;
  aiPersona: string;
  visibleViews: string[];
  backSideSummary: {
    visibleInformation: string[];
    aiCapabilities: string[];
    primaryFocus: string;
  };
}

export const ROLE_CONFIGS: Record<AppRole, RoleConfig> = {
  ADMIN: {
    id: 'ADMIN',
    title: 'ADMIN',
    subtitle: 'System Administration & Security Audits',
    identity: 'THE COMMAND CENTER',
    purpose: 'System governance, role permissions, infrastructure health, and security compliance.',
    mission: 'Ensure platform availability, role enforcement, audit integrity, and AI model usage controls across Karnataka State Police.',
    primaryQuestion: 'Are there any security anomalies, permission violations, or system degradation risks?',
    iconName: 'ShieldAlert',
    badgeColor: 'var(--critical)',
    aiPersona: 'SYSTEM INTELLIGENCE',
    visibleViews: ['Overview', 'User Management', 'Security Audit', 'System Health', 'AI Usage'],
    backSideSummary: {
      visibleInformation: ['Active user sessions', 'Security audit stream', 'Database health', 'API latency', 'Role permissions'],
      aiCapabilities: ['Detects access anomalies', 'Flag unapproved permission edits', 'Monitor AI usage spikes'],
      primaryFocus: 'Platform Governance & Infrastructure Integrity'
    }
  },
  INVESTIGATOR: {
    id: 'INVESTIGATOR',
    title: 'INVESTIGATOR',
    subtitle: 'View active cases, suspects, and crime reports',
    identity: 'CASE DESK',
    purpose: 'Investigate cases, search FIR records, view suspect networks, and track leads.',
    mission: 'Solve active cases quickly using crime pattern matching and suspect tracking.',
    primaryQuestion: 'What cases or suspects match this report?',
    iconName: 'Search',
    badgeColor: 'var(--info)',
    aiPersona: 'CASE ASSISTANT',
    visibleViews: ['My Cases', 'FIR Search', 'Suspect Networks', 'Similar Crime Methods', 'Case Leads', 'Financial Leads', 'Case Timeline'],
    backSideSummary: {
      visibleInformation: ['Assigned FIRs', 'Suspect history', 'Crime method matches', 'Case updates'],
      aiCapabilities: ['Matches crime methods across districts', 'Highlights suspect connections', 'Suggests priority leads'],
      primaryFocus: 'Case Solving & Suspect Tracking'
    }
  },
  ANALYST: {
    id: 'ANALYST',
    title: 'ANALYST',
    subtitle: 'Discover patterns behind numbers across districts and time',
    identity: 'OBSERVATORY',
    purpose: 'Analyze crime trends, district hotspots, time patterns, and suspect networks.',
    mission: 'Turn raw crime numbers into clear insights, hotspot maps, and pattern explanations.',
    primaryQuestion: 'What patterns exist behind these crime numbers?',
    iconName: 'MapPin',
    badgeColor: 'var(--accent)',
    aiPersona: 'ANALYTICAL ASSISTANT',
    visibleViews: ['Crime Trends', 'Hotspots', 'Evidence Registry', 'Demographics', 'Network Analysis', 'Modus Operandi', 'Seasonal Patterns', 'Socio-Economic Risk', 'Financial Links', 'Forecast Validation', 'Explainability'],
    backSideSummary: {
      visibleInformation: ['Interactive crime map', 'District density heatmaps', 'Peak crime hours', 'Suspect networks'],
      aiCapabilities: ['Visualizes demographic distribution', 'Maps 2D suspect networks'],
      primaryFocus: 'Pattern Discovery & Crime Analytics'
    }
  },
  SUPERVISOR: {
    id: 'SUPERVISOR',
    title: 'SUPERVISOR',
    subtitle: 'Investigation Progress, Workload & Team Bottlenecks',
    identity: 'THE OPERATIONS BOARD',
    purpose: 'Station workload balancing, case bottleneck resolution, and aging FIR oversight.',
    mission: 'Maintain operational momentum, prevent investigation delays, and optimize officer workload distribution.',
    primaryQuestion: 'Which cases are exceeding expected timelines and where are team workload bottlenecks?',
    iconName: 'Users',
    badgeColor: 'var(--warning)',
    aiPersona: 'OPERATIONS ADVISOR',
    visibleViews: ['Workload Matrix', 'Station Performance', 'Aging Cases', 'Case Delay Tracker', 'Officer Review', 'Alert Inbox', 'Forecast Review', 'Command Audit'],
    backSideSummary: {
      visibleInformation: ['Investigator workload load balance', 'FIR aging metrics', 'Overdue case alerts', 'Station resolution rates'],
      aiCapabilities: ['Flags cases exceeding standard window', 'Suggests workload redistribution', 'Highlights intervention points'],
      primaryFocus: 'Team Management & Operational Bottlenecks'
    }
  },
  POLICYMAKER: {
    id: 'POLICYMAKER',
    title: 'POLICYMAKER',
    subtitle: 'Strategic Macro Trends, District Benchmarks & Prevention',
    identity: 'THE STATE INTELLIGENCE VIEW',
    purpose: 'High-level strategic crime intelligence, policy formulation, and state resource allocation.',
    mission: 'Provide executive leadership with state-level crime trends, district safety indices, and long-term prevention metrics.',
    primaryQuestion: 'What long-term strategic shifts and resource deployments will reduce statewide crime rates?',
    iconName: 'Building2',
    badgeColor: 'var(--success)',
    aiPersona: 'STRATEGIC INTELLIGENCE ADVISOR',
    visibleViews: ['State Overview', 'District Comparison', 'Crime Trends', 'Hotspots', 'Demographic Insights', 'Seasonal Patterns', 'Socio-Economic Risk', 'Forecast & Early Warning', 'Resource Priorities', 'Prevention Intelligence'],
    backSideSummary: {
      visibleInformation: ['Statewide macro trends', 'District comparison index', 'Seasonal crime projections', 'Resource priority maps'],
      aiCapabilities: ['Identifies multi-year trend shifts', 'Recommends police force allocation', 'Assesses policy impact'],
      primaryFocus: 'Strategic Policy & Resource Deployment'
    }
  }
};
