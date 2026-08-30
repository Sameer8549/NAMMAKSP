import React, { useEffect, useMemo, useState } from 'react';
import { Activity, FileText, MapPin, Network, Search, ShieldCheck } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useRole } from '../../context/RoleContext';
import { dataService } from '../../services/mockDataService';
import { exportDashboardToCSV } from '../../services/reportExportService';
import type { CaseRecord } from '../../types/crime';
import { CaseDetailView } from '../detail/CaseDetailView';
import { AccusedNetworkGraph } from '../network/AccusedNetworkGraph';
import { WhiteSheetModal } from '../common/WhiteSheetModal';
import { ExportMenu } from '../common/ExportMenu';
import { AnalyticsDrilldown, type DrilldownBreakdown, type DrilldownMetric } from '../common/AnalyticsDrilldown';
import { AnalystChallengeModules, type ChallengeView } from './AnalystChallengeModules';

interface AnalystDashboardProps { onOpenExplainModal: () => void; onOpenChatDrawer: () => void; }
type AnalystTab = 'TRENDS' | 'HOTSPOTS' | 'DEMOGRAPHICS' | 'NETWORK' | 'CASES' | ChallengeView;
const panel: React.CSSProperties = { background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: '1rem' };
const KarnatakaCrimeMap = React.lazy(() => import('../map/KarnatakaCrimeMap').then(module => ({ default: module.KarnatakaCrimeMap })));

export const AnalystDashboard: React.FC<AnalystDashboardProps> = ({ onOpenChatDrawer }) => {
  const { activeView } = useRole();
  const [tab, setTab] = useState<AnalystTab>('TRENDS');
  const [query, setQuery] = useState('');
  const [districtFilter, setDistrictFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [drilldown, setDrilldown] = useState<{ title: string; subtitle: string; metrics: DrilldownMetric[]; breakdown: DrilldownBreakdown[]; records: CaseRecord[] } | null>(null);
  const [caseDetail, setCaseDetail] = useState<CaseRecord | null>(null);
  const [reportCase, setReportCase] = useState<CaseRecord | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const cases = dataService.getAllCases();
  const districts = dataService.getDistricts();
  const trends = dataService.getCrimeTrends();
  const demographics = dataService.getDemographics();
  const network = dataService.getSuspectGraph();

  useEffect(() => {
    const view = activeView.toLowerCase();
    if (view.includes('hotspot')) setTab('HOTSPOTS'); else if (view.includes('evidence') || view.includes('registry')) setTab('CASES'); else if (view.includes('demographic')) setTab('DEMOGRAPHICS'); else if (view.includes('network')) setTab('NETWORK');
    else if (view.includes('modus')) setTab('MO'); else if (view.includes('seasonal')) setTab('SEASONAL'); else if (view.includes('socio')) setTab('SOCIO');
    else if (view.includes('financial')) setTab('FINANCIAL'); else if (view.includes('forecast')) setTab('FORECAST'); else if (view.includes('explain')) setTab('EXPLAIN'); else setTab('TRENDS');
  }, [activeView]);

  const total = districts.reduce((sum, district) => sum + district.totalCases, 0);
  const resolved = districts.reduce((sum, district) => sum + district.resolvedCases, 0);
  const categories = useMemo(() => Array.from(new Set(cases.map(record => record.category))).sort(), [cases]);
  const months = useMemo(() => Array.from(new Set(cases.map(record => (record.incidentDate || record.filedDate || '').slice(0, 7)).filter(Boolean))).sort().reverse(), [cases]);
  const scopedCases = useMemo(() => cases.filter(record => {
    const matchesDistrict = districtFilter === 'ALL' || record.location?.district === districtFilter;
    const matchesCategory = categoryFilter === 'ALL' || record.category === categoryFilter;
    const recordMonth = (record.incidentDate || record.filedDate || '').slice(0, 7);
    const matchesMonth = monthFilter === 'ALL' || recordMonth === monthFilter;
    return matchesDistrict && matchesCategory && matchesMonth;
  }), [cases, districtFilter, categoryFilter, monthFilter]);
  const filteredCases = useMemo(() => scopedCases.filter(record => {
    const searchable = `${record.firNumber} ${record.title} ${record.category} ${record.location?.district || ''} ${record.accused.map(item => item.name).join(' ')}`.toLowerCase();
    return searchable.includes(query.toLowerCase());
  }).slice(0, 100), [scopedCases, query]);
  const topDistricts = [...districts].sort((a, b) => b.totalCases - a.totalCases);

  const openAnalysis = (title: string, records: CaseRecord[], dimension: 'category' | 'district' | 'status') => {
    if (!records.length) return;
    const open = records.filter(record => record.status !== 'CLOSED').length;
    const groups = records.reduce<Record<string, number>>((result, record) => {
      const key = dimension === 'category' ? record.category : dimension === 'district' ? record.location?.district : record.status.replaceAll('_', ' ');
      result[key || 'Unspecified'] = (result[key || 'Unspecified'] || 0) + 1;
      return result;
    }, {});
    setDrilldown({
      title,
      subtitle: 'Interactive analysis calculated from the current verified scope. Open the evidence ledger only when record-level review is required.',
      metrics: [
        { label: 'Verified records', value: records.length.toLocaleString(), note: 'Current selection' },
        { label: 'Open workload', value: open.toLocaleString(), note: `${Math.round(open / records.length * 100)}% of selection` },
        { label: 'Clearance', value: `${Math.round((records.length - open) / records.length * 100)}%`, note: 'Closed FIR share' },
        { label: 'District coverage', value: new Set(records.map(record => record.location?.district).filter(Boolean)).size, note: 'Distinct districts' },
      ],
      breakdown: Object.entries(groups).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value),
      records,
    });
  };

  const metric = (icon: React.ReactNode, label: string, value: string | number, note: string) => <div style={panel}><div style={{ color: 'var(--text-muted)' }}>{icon}</div><div className="analyst-label">{label}</div><div className="analyst-value">{value}</div><div className="analyst-note">{note}</div></div>;

  return <div className="analyst-workspace">
    <header className="analyst-header" style={panel}><div><h1>Crime Analysis Observatory</h1><p>Verified FIR patterns, spatial concentration, demographics and relationships</p></div><ExportMenu reportLabel="Generate analytical PDF" onReport={() => { setReportCase(null); setReportOpen(true); }} onCsv={() => exportDashboardToCSV('ANALYST', activeView, 'en')}/></header>
    <section className="analyst-scope" aria-label="Analytical scope">
      <div><strong>Analysis scope</strong><span>{scopedCases.length.toLocaleString()} verified FIRs</span></div>
      <label>District<select value={districtFilter} onChange={event => setDistrictFilter(event.target.value)}><option value="ALL">All districts</option>{districts.map(item => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label>
      <label>Crime category<select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)}><option value="ALL">All categories</option>{categories.map(item => <option key={item}>{item}</option>)}</select></label>
      <label>Month<select value={monthFilter} onChange={event => setMonthFilter(event.target.value)}><option value="ALL">All months</option>{months.map(item => <option key={item}>{item}</option>)}</select></label>
      <button className="btn btn-secondary" onClick={() => { setDistrictFilter('ALL'); setCategoryFilter('ALL'); setMonthFilter('ALL'); }}>Reset scope</button>
    </section>
    <div className="analyst-metrics">{metric(<FileText size={19}/>, 'Verified FIRs', total.toLocaleString(), `${districts.length} districts in source data`)}{metric(<ShieldCheck size={19}/>, 'Clearance', `${total ? ((resolved / total) * 100).toFixed(1) : 0}%`, `${resolved.toLocaleString()} closed FIRs`)}{metric(<MapPin size={19}/>, 'High-pressure districts', districts.filter(item => item.riskStatus === 'HIGH_ALERT').length, 'Relative ranking from FIR volume')}{metric(<Network size={19}/>, 'Network edges', network.edges.length.toLocaleString(), `${network.nodes.length.toLocaleString()} linked entities`)}</div>

    {tab === 'TRENDS' && <div className="analyst-two-column"><section style={panel}><h2>Monthly crime volume</h2><p>Select a month for trend composition, workload and district coverage</p><div className="analyst-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trends} onClick={state=>{const month=String(state?.activeLabel||'');openAnalysis(`${month} crime movement`,cases.filter(record=>(record.incidentDate||record.filedDate||'').startsWith(month)),'category');}}><CartesianGrid stroke="var(--border)" vertical={false}/><XAxis dataKey="date" tick={{fill:'var(--text-muted)',fontSize:10}}/><YAxis tick={{fill:'var(--text-muted)',fontSize:10}}/><Tooltip contentStyle={{background:'var(--surface-elevated)',border:'1px solid var(--border)'}}/><Area isAnimationActive animationDuration={520} type="monotone" dataKey="totalIncidents" stroke="var(--info)" strokeWidth={2} fill="var(--info)" fillOpacity={0.18}/></AreaChart></ResponsiveContainer></div></section><section style={panel}><h2>Current scoped crime mix</h2><p>Select a category for district distribution and clearance analysis</p><div className="analyst-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={categories.map(category=>({category,count:scopedCases.filter(record=>record.category===category).length})).filter(item=>item.count).sort((a,b)=>b.count-a.count).slice(0,10)} onClick={state=>{const category=String(state?.activeLabel||'');openAnalysis(`${category} pattern`,scopedCases.filter(record=>record.category===category),'district');}}><CartesianGrid stroke="var(--border)" vertical={false}/><XAxis dataKey="category" tick={{fill:'var(--text-muted)',fontSize:9}} interval={0} angle={-20} textAnchor="end" height={72}/><YAxis/><Tooltip contentStyle={{background:'var(--surface-elevated)',border:'1px solid var(--border)'}}/><Bar isAnimationActive animationDuration={480} dataKey="count" name="Verified cases" fill="var(--info)" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div></section></div>}

    {tab === 'HOTSPOTS' && <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}><section style={panel}><h2>Interactive Karnataka hotspot map</h2><p>Select a district marker to inspect its verified workload, dominant category and clearance evidence.</p><React.Suspense fallback={<div className="map-loading-state" aria-live="polite">Loading spatial intelligence...</div>}><KarnatakaCrimeMap selectedDistrictName={districtFilter === 'ALL' ? undefined : districtFilter} selectedCrimeCategory={categoryFilter === 'ALL' ? undefined : categoryFilter} onSelectDistrict={district => setDistrictFilter(district.name)}/></React.Suspense></section><section style={panel}><h2>District pressure comparison</h2><p>FIR volume and unresolved workload. Select a bar to open its evidence registry.</p><div className="analyst-chart analyst-chart-tall"><ResponsiveContainer width="100%" height="100%"><BarChart data={topDistricts} layout="vertical" margin={{ left: 30, right: 12 }} onClick={state => { const district = String(state?.activeLabel || ''); if (district) { setDistrictFilter(district); setTab('CASES'); } }}><CartesianGrid stroke="var(--border)" horizontal={false}/><XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10 }}/><YAxis type="category" dataKey="name" width={110} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}/><Tooltip contentStyle={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}/><Legend/><Bar isAnimationActive animationDuration={480} dataKey="resolvedCases" name="Resolved" stackId="1" fill="var(--success)"/><Bar isAnimationActive animationDuration={520} dataKey="pendingCases" name="Open / investigating" stackId="1" fill="var(--warning)"/></BarChart></ResponsiveContainer></div></section></div>}

    {tab === 'DEMOGRAPHICS' && <section style={panel}><h2>Pseudonymized age distribution</h2><p>Aggregated victim and accused shares; individual identities are excluded.</p><div className="analyst-chart analyst-chart-tall"><ResponsiveContainer width="100%" height="100%"><BarChart data={demographics}><CartesianGrid stroke="var(--border)" vertical={false}/><XAxis dataKey="ageGroup" tick={{ fill: 'var(--text-muted)', fontSize: 11 }}/><YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }}/><Tooltip contentStyle={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}/><Legend/><Bar dataKey="victimPercentage" name="Victim share %" fill="var(--info)" radius={[4,4,0,0]}/><Bar dataKey="accusedPercentage" name="Accused share %" fill="var(--accent)" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div></section>}

    {tab === 'NETWORK' && <section style={{ ...panel, minHeight: 620 }}><div className="analyst-section-heading"><span/><button className="btn btn-secondary" onClick={onOpenChatDrawer}><Activity size={15}/> Explain selected pattern</button></div><AccusedNetworkGraph /></section>}

    {tab === 'CASES' && <section style={panel}><div className="analyst-section-heading"><div><h2>FIR evidence registry</h2><p>{filteredCases.length} records displayed from the current analytical scope</p></div><div className="analyst-filters"><label><Search size={15}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search FIR, category, district or entity"/></label><select value={districtFilter} onChange={event => setDistrictFilter(event.target.value)}><option value="ALL">All districts</option>{districts.map(item => <option key={item.id} value={item.name}>{item.name}</option>)}</select></div></div><div className="analyst-table-wrap"><table className="analyst-table"><thead><tr><th>FIR</th><th>Category</th><th>District</th><th>Status</th><th>Filed</th><th></th></tr></thead><tbody>{filteredCases.map(record => <tr key={record.id}><td><strong>{record.firNumber}</strong></td><td>{record.category}</td><td>{record.location?.district}</td><td>{record.status.replaceAll('_',' ')}</td><td>{record.filedDate}</td><td><button className="btn btn-secondary" onClick={() => setCaseDetail(record)}>View</button></td></tr>)}</tbody></table></div></section>}

    {(['MO', 'SEASONAL', 'SOCIO', 'FINANCIAL', 'FORECAST', 'EXPLAIN'] as AnalystTab[]).includes(tab) && <AnalystChallengeModules view={tab as ChallengeView} cases={scopedCases} onOpenChat={onOpenChatDrawer} onOpenCase={setCaseDetail}/>} 

    {caseDetail && <CaseDetailView caseRecord={caseDetail} onClose={() => setCaseDetail(null)} />}
    {drilldown && <AnalyticsDrilldown {...drilldown} onClose={()=>setDrilldown(null)} onOpenCase={setCaseDetail}/>} 
    <WhiteSheetModal isOpen={reportOpen} onClose={() => setReportOpen(false)} caseRecord={reportCase}/>
    <style>{`.analyst-workspace{display:flex;flex-direction:column;gap:1rem;width:100%}.analyst-header,.analyst-section-heading{display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap}.analyst-header h1,.analyst-workspace h2{margin:0;color:var(--text-primary);font-size:1rem}.analyst-header p,.analyst-workspace section>p,.analyst-section-heading p{margin:.2rem 0 0;color:var(--text-muted);font-size:.72rem}.analyst-actions,.analyst-filters{display:flex;gap:.5rem;flex-wrap:wrap}.analyst-metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:1rem}.analyst-label{margin-top:.5rem;color:var(--text-secondary);font-size:.68rem;font-weight:800;text-transform:uppercase}.analyst-value{margin-top:.15rem;color:var(--text-primary);font-size:1.45rem;font-weight:850}.analyst-note{margin-top:.2rem;color:var(--text-muted);font-size:.7rem}.analyst-tabs{display:flex;gap:.3rem;padding:.35rem;background:var(--surface-card);border:1px solid var(--border);border-radius:var(--radius-lg);overflow-x:auto}.analyst-tabs button{display:flex;align-items:center;gap:.4rem;white-space:nowrap;padding:.55rem .8rem;border:1px solid transparent;border-radius:var(--radius-md);background:transparent;color:var(--text-secondary);font-weight:750}.analyst-tabs button.active{background:var(--surface-muted);border-color:var(--border-accent);color:var(--accent)}.analyst-two-column{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem}.analyst-chart{height:330px;margin-top:.8rem}.analyst-chart-tall{height:480px}.analyst-filters label{display:flex;align-items:center;gap:.4rem;padding:.45rem .6rem;background:var(--surface-muted);border:1px solid var(--border);border-radius:var(--radius-md)}.analyst-filters input{border:0;outline:0;background:transparent;color:var(--text-primary);min-width:220px}.analyst-filters select{background:var(--surface-muted);color:var(--text-primary);border:1px solid var(--border);border-radius:var(--radius-md);padding:.45rem}.analyst-table-wrap{overflow-x:auto;margin-top:1rem}.analyst-table{width:100%;min-width:720px;border-collapse:collapse}.analyst-table th,.analyst-table td{text-align:left;padding:.65rem;border-bottom:1px solid var(--border);font-size:.74rem;color:var(--text-secondary)}.analyst-table th{font-size:.66rem;text-transform:uppercase;color:var(--text-muted)}.analyst-table strong{color:var(--text-primary)}@media(max-width:900px){.analyst-two-column{grid-template-columns:1fr}.analyst-header{align-items:flex-start}.analyst-chart-tall{height:420px}}`}</style>
  </div>;
};
