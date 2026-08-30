import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
import { AlertTriangle, ArrowRight, Bell, CheckCircle2, Clock3, FileSearch, RefreshCw, Search, ShieldCheck, Users, X } from 'lucide-react';
import { api, queryKeys } from './api';
import type { CrimeTypePoint, DistrictPoint, FIR, Overview, Role, RoleIntelligence, TrendPoint, Workspace } from './types';
import './operational.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: true } }
});
echarts.use([BarChart, LineChart, GridComponent, TooltipComponent, SVGRenderer]);

const fmt = (value: unknown) => typeof value === 'number' ? value.toLocaleString('en-IN') : String(value ?? '—');
const dateLabel = (value?: string) => value ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : 'Date unavailable';

function useDashboardData(workspace: Workspace) {
  const role = workspace.role;
  const overview = useQuery({ queryKey: queryKeys.overview(role), queryFn: () => api<Overview>('/api/analytics/overview') });
  const trends = useQuery({ queryKey: queryKeys.trends(role), queryFn: () => api<TrendPoint[]>('/api/analytics/monthly-trends') });
  const crimeTypes = useQuery({ queryKey: queryKeys.crimeTypes(role), queryFn: () => api<CrimeTypePoint[]>('/api/analytics/crime-types') });
  const districts = useQuery({ queryKey: queryKeys.districts(role), queryFn: () => api<DistrictPoint[]>('/api/analytics/districts') });
  const intelligence = useQuery({ queryKey: queryKeys.intelligence(role), queryFn: () => api<RoleIntelligence>('/api/workspace/intelligence') });
  const firs = useQuery({
    queryKey: queryKeys.firs(role, 'all'),
    queryFn: async () => {
      const payload = await api<FIR[] | { items?: FIR[]; firs?: FIR[] }>('/api/firs?limit=20');
      return Array.isArray(payload) ? payload : payload.items || payload.firs || [];
    },
    enabled: role === 'Investigator' || role === 'Supervisor'
  });
  const admin = useQuery({
    queryKey: queryKeys.admin,
    queryFn: () => api<Record<string, any>>('/api/admin/intelligence'),
    enabled: role === 'Administrator'
  });
  return { overview, trends, crimeTypes, districts, intelligence, firs, admin };
}

function LiveState({ queries }: { queries: Array<{ isFetching: boolean; dataUpdatedAt: number }> }) {
  const refreshing = queries.some(query => query.isFetching);
  const updated = Math.max(...queries.map(query => query.dataUpdatedAt || 0));
  return <div className="ops-live" role="status"><span className={refreshing ? 'is-refreshing' : ''} />{refreshing ? 'Refreshing evidence' : updated ? `Updated ${new Date(updated).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : 'Connecting'}</div>;
}

function Metric({ label, value, detail, tone = 'blue', onOpen }: { label: string; value: unknown; detail: string; tone?: string; onOpen?: () => void }) {
  const content = <><span className="ops-metric-label">{label}</span><strong>{fmt(value)}</strong><small>{detail}</small></>;
  return onOpen ? <button className={`ops-metric tone-${tone}`} onClick={onOpen}>{content}<ArrowRight size={16} aria-hidden="true" /></button> : <div className={`ops-metric tone-${tone}`}>{content}</div>;
}

function Chart({ data, kind, onSelect }: { data: TrendPoint[] | CrimeTypePoint[]; kind: 'trend' | 'types'; onSelect: (value: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current, undefined, { renderer: 'svg' });
    const isTrend = kind === 'trend';
    const labels = data.map((item: any) => item.month || item.year || item.crime_type || item.name || 'Unknown');
    const values = data.map(item => Number(item.count || 0));
    chart.setOption({
      animationDuration: 350,
      color: isTrend ? ['#2161b5'] : ['#087e78'],
      tooltip: { trigger: 'axis', confine: true, backgroundColor: '#0b1f3a', borderWidth: 0, textStyle: { color: '#fff' } },
      grid: { left: 46, right: 18, top: 22, bottom: 42 },
      xAxis: { type: 'category', data: labels, axisLabel: { color: '#5d6b7c', hideOverlap: true }, axisLine: { lineStyle: { color: '#cbd5e1' } } },
      yAxis: { type: 'value', axisLabel: { color: '#5d6b7c' }, splitLine: { lineStyle: { color: '#e5eaf0' } } },
      series: [{ type: isTrend ? 'line' : 'bar', data: values, smooth: isTrend, symbolSize: 8, lineStyle: { width: 3 }, areaStyle: isTrend ? { color: 'rgba(33,97,181,.08)' } : undefined, itemStyle: { borderRadius: isTrend ? 0 : [3, 3, 0, 0] }, emphasis: { focus: 'series' } }]
    });
    chart.on('click', params => onSelect(String(params.name)));
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(ref.current);
    return () => { observer.disconnect(); chart.dispose(); };
  }, [data, kind, onSelect]);
  return <div ref={ref} className="ops-chart-canvas" role="img" aria-label={kind === 'trend' ? 'Monthly FIR trend. Select a month to inspect evidence.' : 'Crime type distribution. Select a category to inspect evidence.'} />;
}

function EvidenceChart({ title, subtitle, data, kind, onSelect }: { title: string; subtitle: string; data: any[]; kind: 'trend' | 'types'; onSelect: (value: string) => void }) {
  return <section className="ops-panel ops-chart-panel"><header><div><h2>{title}</h2><p>{subtitle}</p></div><span className="ops-source">Verified registry</span></header>{data.length ? <><Chart data={data} kind={kind} onSelect={onSelect} /><div className="ops-chart-table" aria-label={`${title} evidence table`}>{data.slice(0, 6).map((item: any) => <button key={item.month || item.year || item.crime_type || item.name} onClick={() => onSelect(String(item.month || item.year || item.crime_type || item.name))}><span>{item.month || item.year || item.crime_type || item.name}</span><strong>{fmt(item.count)}</strong></button>)}</div></> : <EmptyState title="No chart evidence" detail="No records match the current authorized scope." />}</section>;
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="ops-empty"><FileSearch size={22} /><strong>{title}</strong><span>{detail}</span></div>;
}

function FIRLedger({ rows, onOpen }: { rows: FIR[]; onOpen: (fir: FIR) => void }) {
  const [status, setStatus] = useState('All');
  const [search, setSearch] = useState('');
  const filtered = rows.filter(row => (status === 'All' || row.status === status) && (!search || Object.values(row).some(value => String(value || '').toLowerCase().includes(search.toLowerCase()))));
  return <section className="ops-panel ops-ledger"><header><div><h2>Case evidence ledger</h2><p>{filtered.length} authorized records in the current scope</p></div><span className="ops-source">Server scoped</span></header><div className="ops-toolbar"><label><Search size={16} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search FIR, district or crime" aria-label="Search case evidence" /></label><div className="ops-segments" aria-label="Filter by investigation status">{['All', 'Open', 'Under Investigation', 'Closed'].map(item => <button key={item} className={status === item ? 'active' : ''} onClick={() => setStatus(item)}>{item === 'Under Investigation' ? 'Investigating' : item}</button>)}</div></div><div className="ops-table-wrap"><table><thead><tr><th>FIR</th><th>Crime</th><th>District / station</th><th>Filed</th><th>Status</th><th><span className="sr-only">Action</span></th></tr></thead><tbody>{filtered.map(row => <tr key={row.fir_id}><td><strong className="mono">{row.fir_id}</strong></td><td>{row.crime_type || 'Unclassified'}</td><td>{row.district || '—'}<small>{row.police_station || ''}</small></td><td>{dateLabel(row.fir_date || row.date)}</td><td><span className={`ops-status status-${String(row.status || 'open').toLowerCase().replaceAll(' ', '-')}`}>{row.status || 'Open'}</span></td><td><button className="ops-row-action" onClick={() => onOpen(row)}>Open case <ArrowRight size={14} /></button></td></tr>)}</tbody></table>{!filtered.length && <EmptyState title="No matching FIRs" detail="Change the search or investigation-status filter." />}</div></section>;
}

function IntelligenceQueue({ role, data, onOpen }: { role: Role; data?: RoleIntelligence; onOpen: (item: any) => void }) {
  const items = data?.items || [];
  return <section className="ops-panel ops-queue"><header><div><h2>{role === 'Administrator' ? 'Governance actions' : role === 'Policymaker' ? 'Strategic findings' : role === 'Supervisor' ? 'Command exceptions' : role === 'Analyst' ? 'Signals to validate' : 'Priority actions'}</h2><p>Ranked from verified role-scoped evidence</p></div><Bell size={18} /></header><div className="ops-queue-list">{items.length ? items.slice(0, 7).map((item, index) => <button key={`${item.title || item.label}-${index}`} onClick={() => onOpen(item)}><span className={`ops-rank severity-${String(item.severity || 'normal').toLowerCase()}`}>{String(index + 1).padStart(2, '0')}</span><span><strong>{item.title || item.label || 'Evidence item'}</strong><small>{item.detail || `${item.value ?? ''}` || 'Open supporting evidence'}</small></span><ArrowRight size={16} /></button>) : <EmptyState title="No pending actions" detail="There are no unresolved items in this authorized scope." />}</div></section>;
}

function DistrictMatrix({ rows, onOpen }: { rows: DistrictPoint[]; onOpen: (row: DistrictPoint) => void }) {
  const max = Math.max(...rows.map(row => Number(row.total_crimes ?? row.count ?? row.total ?? 0)), 1);
  return <section className="ops-panel ops-districts"><header><div><h2>District operational comparison</h2><p>Case volume, active pressure and relative concentration</p></div><a href="heatmap.html">Open map <ArrowRight size={14} /></a></header><div className="ops-district-list">{rows.slice(0, 10).map((row, index) => { const value = Number(row.total_crimes ?? row.count ?? row.total ?? 0); return <button key={row.district} onClick={() => onOpen(row)}><span className="ops-district-rank">{index + 1}</span><span className="ops-district-name"><strong>{row.district}</strong><i style={{ width: `${Math.max(4, value / max * 100)}%` }} /></span><strong>{fmt(value)}</strong><ArrowRight size={14} /></button>; })}</div></section>;
}

function Drawer({ selection, onClose }: { selection: any; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { closeRef.current?.focus(); const listener = (event: KeyboardEvent) => event.key === 'Escape' && onClose(); document.addEventListener('keydown', listener); return () => document.removeEventListener('keydown', listener); }, [onClose]);
  if (!selection) return null;
  const entries = Object.entries(selection.value || {}).filter(([, value]) => value !== null && value !== undefined && typeof value !== 'object').slice(0, 12);
  return <div className="ops-drawer-layer"><button className="ops-scrim" onClick={onClose} aria-label="Close evidence drawer" /><aside className="ops-drawer" role="dialog" aria-modal="true" aria-labelledby="ops-drawer-title"><header><div><span>Selected evidence</span><h2 id="ops-drawer-title">{selection.title}</h2><p>{selection.subtitle || 'Verified operational context and linked actions'}</p></div><button ref={closeRef} onClick={onClose} aria-label="Close evidence drawer"><X size={20} /></button></header><div className="ops-drawer-body"><div className="ops-provenance"><ShieldCheck size={18} /><span><strong>Verified synthetic registry</strong><small>Current authorized scope · Updated now</small></span></div><dl>{entries.map(([key, value]) => <div key={key}><dt>{key.replaceAll('_', ' ')}</dt><dd>{fmt(value)}</dd></div>)}</dl></div><footer><a className="ops-button secondary" href={`chat.html?q=${encodeURIComponent(`Analyze ${selection.title} using verified KSP evidence`)}`}>Ask AI</a>{selection.kind === 'district' && <a className="ops-button secondary" href={`heatmap.html?district=${encodeURIComponent(selection.title)}`}>Open heatmap</a>}{selection.kind === 'fir' && <a className="ops-button primary" href={`reports.html?fir=${encodeURIComponent(selection.title)}`}>Generate case report</a>}</footer></aside></div>;
}

function RoleMetrics({ role, overview, admin, open }: { role: Role; overview: Overview; admin?: Record<string, any>; open: (title: string, value: any) => void }) {
  if (role === 'Administrator') return <div className="ops-metrics"><Metric label="Release readiness" value={`${admin?.readiness?.score ?? 0}%`} detail={admin?.readiness?.posture || 'Evaluating controls'} tone="teal" onOpen={() => open('Release readiness', admin?.readiness)} /><Metric label="Failed sign-ins" value={admin?.security?.failed_logins_24h ?? 0} detail="Last 24 hours" tone="red" onOpen={() => open('Authentication evidence', admin?.security)} /><Metric label="Open alerts" value={admin?.operations?.open_alerts ?? 0} detail="Governance queue" tone="saffron" /><Metric label="Failed jobs" value={admin?.operations?.failed_jobs_7d ?? 0} detail="Last seven days" /></div>;
  const configs: Record<Exclude<Role, 'Administrator'>, Array<[string, unknown, string, string]>> = {
    Investigator: [['Assigned FIR evidence', overview.total_firs, 'Authorized registry', 'blue'], ['Active investigations', Number(overview.open_cases || 0) + Number(overview.under_investigation || 0), 'Require case action', 'red'], ['Registered subjects', overview.total_offenders, 'Linked offender registry', 'saffron'], ['District coverage', overview.districts_covered, 'Available operational scope', 'teal']],
    Analyst: [['Analyzed FIRs', overview.total_firs, 'Current analytical corpus', 'blue'], ['Open-case pressure', Number(overview.open_cases || 0) + Number(overview.under_investigation || 0), 'Status-derived signal', 'red'], ['Behavioral profiles', overview.total_offenders, 'Pseudonymized entities', 'saffron'], ['District coverage', overview.districts_covered, 'Comparable regions', 'teal']],
    Supervisor: [['Command FIRs', overview.total_firs, 'Authorized command scope', 'blue'], ['Active workload', Number(overview.open_cases || 0) + Number(overview.under_investigation || 0), 'Cases requiring oversight', 'red'], ['Closed cases', overview.closed_cases, 'Verified dispositions', 'teal'], ['Closure rate', `${overview.total_firs ? Math.round(Number(overview.closed_cases || 0) / overview.total_firs * 100) : 0}%`, 'Command performance', 'saffron']],
    Policymaker: [['State FIR evidence', overview.total_firs, 'Aggregate registry', 'blue'], ['Closure rate', `${overview.total_firs ? Math.round(Number(overview.closed_cases || 0) / overview.total_firs * 100) : 0}%`, 'State outcome indicator', 'teal'], ['Districts compared', overview.districts_covered, 'Aggregate benchmark set', 'saffron'], ['Active pressure', Number(overview.open_cases || 0) + Number(overview.under_investigation || 0), 'Privacy-safe aggregate', 'red']]
  };
  return <div className="ops-metrics">{configs[role].map(([label, value, detail, tone]) => <Metric key={label} label={label} value={value} detail={detail} tone={tone} onOpen={() => open(label, { value, detail })} />)}</div>;
}

function DashboardApp() {
  const workspaceQuery = useQuery({ queryKey: queryKeys.workspace, queryFn: () => api<Workspace>('/api/workspace/me') });
  if (workspaceQuery.isLoading) return <div className="ops-boot" aria-busy="true"><div /><div /><div /></div>;
  if (workspaceQuery.isError || !workspaceQuery.data) return <div className="ops-fatal"><AlertTriangle /><h1>Workspace could not be verified</h1><p>{workspaceQuery.error?.message || 'Authentication or role configuration failed.'}</p><button onClick={() => workspaceQuery.refetch()}>Retry workspace</button></div>;
  return <Dashboard workspace={workspaceQuery.data} />;
}

function Dashboard({ workspace }: { workspace: Workspace }) {
  const data = useDashboardData(workspace);
  const [selection, setSelection] = useState<any>(null);
  const queries = [data.overview, data.trends, data.crimeTypes, data.districts, data.intelligence, ...(workspace.role === 'Administrator' ? [data.admin] : [])];
  const loading = queries.some(query => query.isLoading);
  const failed = queries.filter(query => query.isError);
  const overview = data.overview.data || {};
  const role = workspace.role;
  const open = (title: string, value: any, kind = 'metric', subtitle?: string) => setSelection({ title, value, kind, subtitle });
  const refresh = () => queryClient.invalidateQueries();
  const chartTitles: Record<Role, [string, string]> = {
    Investigator: ['Assigned-case activity', 'Authorized case composition'], Analyst: ['Crime pattern movement', 'Crime pattern composition'], Supervisor: ['Command workload movement', 'Command case composition'], Policymaker: ['Statewide trend evidence', 'Aggregate crime composition'], Administrator: ['Operational history', 'Service composition']
  };
  if (loading) return <main className="ops-boot" aria-busy="true"><div /><div /><div /></main>;
  return <main className="ops-dashboard" data-role={role.toLowerCase()}><header className="ops-command"><div><span>{role} workspace · {workspace.data_classification}</span><h1>{workspace.title}</h1><p>{workspace.purpose}</p></div><div className="ops-command-actions"><LiveState queries={queries} /><button className="ops-icon-button" onClick={refresh} aria-label="Refresh workspace" title="Refresh workspace"><RefreshCw size={18} /></button>{role !== 'Administrator' && <a className="ops-button primary" href={role === 'Investigator' ? 'dashboard.html?view=firs' : role === 'Analyst' ? 'heatmap.html' : role === 'Supervisor' ? 'dashboard.html?view=forecast' : 'reports.html'}>{role === 'Investigator' ? 'Open case queue' : role === 'Analyst' ? 'Explore patterns' : role === 'Supervisor' ? 'Review exceptions' : 'Generate policy brief'} <ArrowRight size={16} /></a>}</div></header>{failed.length > 0 && <div className="ops-inline-error" role="alert"><AlertTriangle size={18} /><span><strong>{failed.length} evidence source{failed.length > 1 ? 's are' : ' is'} unavailable.</strong> Verified sections remain visible.</span><button onClick={refresh}>Retry</button></div>}<RoleMetrics role={role} overview={overview} admin={data.admin.data} open={open} />{role === 'Administrator' ? <AdminBoard data={data.admin.data || {}} open={open} /> : <><div className="ops-primary-grid"><EvidenceChart title={chartTitles[role][0]} subtitle="Select a point to inspect contributing evidence" data={data.trends.data || []} kind="trend" onSelect={value => open(`${value} intelligence`, { period: value, role, scope: workspace.district_scope.join(', ') || 'Authorized statewide scope' }, 'period', 'Crime composition, locations and investigation status')} /><IntelligenceQueue role={role} data={data.intelligence.data} onOpen={item => open(item.title || item.label || 'Operational evidence', item, 'signal')} /></div><div className="ops-secondary-grid"><EvidenceChart title={chartTitles[role][1]} subtitle="Select a category to preserve it as drilldown context" data={data.crimeTypes.data || []} kind="types" onSelect={value => open(`${value} intelligence`, { crime_type: value, role, disclosure: workspace.disclosure_mode }, 'crime', 'District concentration, case status and source records')} /><DistrictMatrix rows={data.districts.data || []} onOpen={row => open(row.district, row, 'district', 'District trend, composition, workload and linked actions')} /></div>{(role === 'Investigator' || role === 'Supervisor') && <FIRLedger rows={data.firs.data || []} onOpen={fir => open(fir.fir_id, fir, 'fir', `${fir.crime_type || 'Case'} · ${fir.district || 'Authorized district'}`)} />}</>}<Drawer selection={selection} onClose={() => setSelection(null)} /></main>;
}

function AdminBoard({ data, open }: { data: Record<string, any>; open: (title: string, value: any) => void }) {
  const gates = data.release_gates || [];
  const recommendations = data.recommendations || [];
  return <><div className="ops-primary-grid"><section className="ops-panel ops-gates"><header><div><h2>Release and control gates</h2><p>Server-evaluated platform readiness</p></div><ShieldCheck size={18} /></header><div>{gates.map((gate: any) => <button key={gate.name} onClick={() => open(gate.name, gate)}><span className={`ops-gate-icon ${gate.status}`}>{gate.status === 'pass' ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}</span><span><strong>{gate.name}</strong><small>{gate.detail}</small></span><span className={`ops-status status-${gate.status}`}>{gate.status}</span></button>)}</div></section><section className="ops-panel ops-queue"><header><div><h2>Governance recommendations</h2><p>Ranked from identity, audit and job evidence</p></div><Bell size={18} /></header><div className="ops-queue-list">{recommendations.map((item: any, index: number) => <button key={item.action} onClick={() => open(item.action, item)}><span className="ops-rank">{String(index + 1).padStart(2, '0')}</span><span><strong>{item.action}</strong><small>{item.evidence}</small></span><ArrowRight size={16} /></button>)}</div></section></div><section className="ops-panel ops-admin-links"><header><div><h2>Administrative workspaces</h2><p>Identity, audit and runtime operations</p></div></header><div><a href="users.html?view=users"><Users /><span><strong>Users and roles</strong><small>Identity lifecycle and role coverage</small></span><ArrowRight /></a><a href="users.html?view=audit"><FileSearch /><span><strong>Audit and traceability</strong><small>Authenticated operational evidence</small></span><ArrowRight /></a><a href="users.html?view=health"><ShieldCheck /><span><strong>System health</strong><small>Catalyst services, jobs and release state</small></span><ArrowRight /></a></div></section></>;
}

const host = document.getElementById('operational-dashboard-root');
if (host) {
  const legacy = document.getElementById('legacy-dashboard-content');
  if (legacy) legacy.hidden = true;
  createRoot(host).render(<React.StrictMode><QueryClientProvider client={queryClient}><DashboardApp /></QueryClientProvider></React.StrictMode>);
}
