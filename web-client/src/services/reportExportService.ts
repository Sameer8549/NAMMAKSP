import type { Language } from '../context/LanguageContext';
import { dataService } from './mockDataService';

export interface ReportDataSet {
  title: string;
  subtitle: string;
  refNo: string;
  generatedDate: string;
  officerName: string;
  stationName: string;
  summaryMetrics: Array<{ label: string; value: string | number; change?: string }>;
  tableHeaders: string[];
  tableRows: Array<Array<string | number>>;
  aiInsights: string[];
}

export function generateReportData(role: string, activeTab: string, language: Language): ReportDataSet {
  const isKn = language === 'kn';
  const workspace = dataService.getWorkspace();
  const cases = dataService.getAllCases();
  const districts = dataService.getDistricts();
  const workloads = dataService.getOfficerWorkloads();
  const audit = dataService.getAuditEvents();
  const insight = dataService.getAIInsightForRole(role as Parameters<typeof dataService.getAIInsightForRole>[0]);
  const generatedDate = new Date(workspace?.generatedAt || Date.now()).toLocaleString(isKn ? 'kn-IN' : 'en-IN');
  const refNo = `NAMMA-KSP-${role}-${String(workspace?.generatedAt || Date.now()).replace(/\D/g, '').slice(0, 14)}`;

  const base = {
    refNo,
    generatedDate,
    officerName: String(workspace?.identity.username || 'Authenticated officer'),
    stationName: 'NAMMA KSP verified synthetic registry',
    aiInsights: [insight.body, ...insight.actionItems].filter(Boolean),
  };

  if (role === 'ADMIN') {
    return {
      ...base,
      title: 'Platform Governance and Audit Report',
      subtitle: activeTab,
      summaryMetrics: [
        { label: 'Registered users', value: dataService.getUserSessions().length },
        { label: 'Audit records loaded', value: audit.length },
        { label: 'Security alerts', value: dataService.getSecurityAlerts().length },
        { label: 'Database status', value: dataService.getSystemHealth().catalystConnectionStatus },
      ],
      tableHeaders: ['Timestamp', 'Actor', 'Action', 'Resource', 'Severity'],
      tableRows: audit.slice(0, 20).map(item => [item.timestamp, item.actor, item.action, item.targetResource, item.severity]),
    };
  }

  if (role === 'SUPERVISOR') {
    return {
      ...base,
      title: 'Supervisor Workload and Case Ageing Report',
      subtitle: activeTab,
      summaryMetrics: [
        { label: 'Officer queues', value: workloads.length },
        { label: 'Active cases', value: workloads.reduce((total, item) => total + item.activeCasesCount, 0) },
        { label: 'Ageing cases', value: workloads.reduce((total, item) => total + item.agingCasesCount, 0) },
        { label: 'Overloaded queues', value: workloads.filter(item => item.status === 'OVERLOADED').length },
      ],
      tableHeaders: ['Officer', 'Badge', 'Active', 'Ageing', 'Utilization'],
      tableRows: workloads.map(item => [item.officerName, item.badgeNumber, item.activeCasesCount, item.agingCasesCount, `${item.capacityUtilization}%`]),
    };
  }

  if (role === 'INVESTIGATOR') {
    return {
      ...base,
      title: 'Assigned FIR Investigation Report',
      subtitle: activeTab,
      summaryMetrics: [
        { label: 'Assigned FIRs', value: cases.length },
        { label: 'Open or investigating', value: cases.filter(item => item.status !== 'CLOSED').length },
        { label: 'High priority', value: cases.filter(item => item.priority === 'HIGH' || item.priority === 'CRITICAL').length },
        { label: 'Linked accused', value: new Set(cases.flatMap(item => item.accused.map(accused => accused.id))).size },
      ],
      tableHeaders: ['FIR', 'Crime', 'District', 'Status', 'Filed'],
      tableRows: cases.slice(0, 30).map(item => [item.firNumber, item.title, item.location.district, item.status, item.filedDate]),
    };
  }

  return {
    ...base,
    title: role === 'POLICYMAKER' ? 'State Crime Prevention Intelligence Report' : 'Crime Analysis Intelligence Report',
    subtitle: activeTab,
    summaryMetrics: [
      { label: 'Districts covered', value: districts.length },
      { label: 'Verified FIRs represented', value: districts.reduce((total, item) => total + item.totalCases, 0) },
      { label: 'High-alert districts', value: districts.filter(item => item.riskStatus === 'HIGH_ALERT').length },
      { label: 'Average clearance', value: `${(districts.reduce((total, item) => total + item.clearanceRate, 0) / Math.max(1, districts.length)).toFixed(1)}%` },
    ],
    tableHeaders: ['District', 'FIRs', 'Closed', 'Clearance', 'Risk'],
    tableRows: districts.map(item => [item.name, item.totalCases, item.resolvedCases, `${item.clearanceRate}%`, item.riskStatus]),
  };
}

export function exportDashboardToCSV(role: string, activeTab: string, language: Language): void {
  const data = generateReportData(role, activeTab, language);
  const rows = [
    [data.title], [data.subtitle], [data.refNo, data.generatedDate], [],
    ...data.summaryMetrics.map(item => [item.label, item.value]), [],
    data.tableHeaders, ...data.tableRows,
  ];
  const csv = '\uFEFF' + rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `namma-ksp-${role.toLowerCase()}-${Date.now()}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
