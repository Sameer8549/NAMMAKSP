import { useChartMotion } from '../../context/MotionContext';
import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleDollarSign, Database, Fingerprint, Scale, ShieldCheck } from '../common/icons';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from '../charts/motion';
import { apiClient } from '../../services/apiClient';
import { dataService } from '../../services/mockDataService';
import type { CaseRecord } from '../../types/crime';
import './analystChallengeModules.css';
import { EvidenceDrilldown } from '../common/EvidenceDrilldown';
import { AnalystRiskFinancial } from '../analytics/AnalystRiskFinancial';

export type ChallengeView = 'MO' | 'SEASONAL' | 'RISK_FINANCIAL' | 'SOCIO' | 'FINANCIAL' | 'FORECAST' | 'EXPLAIN';
interface Props { view: ChallengeView; cases: CaseRecord[]; onOpenChat: (prompt?: string) => void; onOpenCase: (record: CaseRecord) => void; }
type Row = Record<string, unknown>;

const panel: React.CSSProperties = { background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: '1rem' };
const asRows = (value: unknown): Row[] => Array.isArray(value) ? value as Row[] : [];
const n = (value: unknown) => Number(value || 0);
const s = (value: unknown) => String(value ?? '');

export const AnalystChallengeModules: React.FC<Props> = ({ view, cases, onOpenChat, onOpenCase }) => {
  const chartMotion = useChartMotion();
  const forecast = dataService.getForecast() as Row;
  const social = dataService.getSociological() as Row;
  const financial = dataService.getFinancial() as Row;
  const explainable = dataService.getExplainable() as Row;
  const [alerts, setAlerts] = useState<Row[]>([]);
  const [reviewing, setReviewing] = useState<string>('');
  const [message, setMessage] = useState('');
  const [evidenceTitle, setEvidenceTitle] = useState('');
  const [evidenceCases, setEvidenceCases] = useState<CaseRecord[]>([]);
  const [selectedMethod, setSelectedMethod] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');

  useEffect(() => {
    if (view === 'FORECAST') apiClient.alerts().then(setAlerts).catch(error => setMessage(error instanceof Error ? error.message : 'Unable to load warning ledger'));
  }, [view]);

  const methods = useMemo(() => {
    const grouped = new Map<string, { method: string; cases: number; districts: Set<string>; signatures: Set<string>; open: number }>();
    cases.forEach(record => {
      const method = record.modusOperandi?.primaryMethod || 'Unclassified method';
      const item = grouped.get(method) || { method, cases: 0, districts: new Set(), signatures: new Set(), open: 0 };
      item.cases += 1; item.districts.add(record.location.district);
      if (record.modusOperandi?.uniqueSignature) item.signatures.add(record.modusOperandi.uniqueSignature);
      if (record.status !== 'CLOSED') item.open += 1;
      grouped.set(method, item);
    });
    return [...grouped.values()].map(item => ({ ...item, districtCount: item.districts.size, signatureCount: item.signatures.size })).sort((a, b) => b.cases - a.cases).slice(0, 12);
  }, [cases]);

  const seasonal = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, index) => ({ month: new Date(2025, index, 1).toLocaleString('en', { month: 'short' }), monthIndex: index, incidents: 0, open: 0, districts: new Set<string>(), categories: new Map<string, number>() }));
    cases.forEach(record => { const date = new Date(record.incidentDate || record.filedDate); if (!Number.isNaN(date.getTime())) { const item=months[date.getMonth()];item.incidents += 1;item.districts.add(record.location.district);item.categories.set(record.category,(item.categories.get(record.category)||0)+1);if (record.status !== 'CLOSED') item.open += 1; } });
    return months.map(item=>({...item,districtCount:item.districts.size,dominantCategory:[...item.categories.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]||'No recorded cases',openShare:item.incidents?Math.round(item.open/item.incidents*100):0}));
  }, [cases]);

  const activeMethod = methods.find(item=>item.method===selectedMethod) || methods[0];
  const activeMethodCases = activeMethod ? cases.filter(record=>record.modusOperandi?.primaryMethod===activeMethod.method) : [];
  const activeMonth = seasonal.find(item=>item.month===selectedMonth) || [...seasonal].sort((a,b)=>b.incidents-a.incidents)[0];
  const activeMonthCases = activeMonth ? cases.filter(record=>{const date=new Date(record.incidentDate||record.filedDate);return !Number.isNaN(date.getTime())&&date.getMonth()===activeMonth.monthIndex;}) : [];

  const socialRows = asRows(social.district_social_risk);
  const clusters = asRows(financial.clusters);
  const forecastSummary = (forecast.summary || {}) as Row;
  const warnings = asRows(forecast.early_warnings);
  const trails = asRows(explainable.evidence_trails);
  const openEvidence = (title: string, records: CaseRecord[]) => { setEvidenceTitle(title); setEvidenceCases(records.slice(0, 100)); };
  const evidenceDrawer = evidenceTitle && <EvidenceDrilldown title={evidenceTitle} records={evidenceCases} onClose={() => setEvidenceTitle('')} onOpenCase={onOpenCase}/>;

  if (view === 'RISK_FINANCIAL') return <AnalystRiskFinancial cases={cases} onOpenCase={onOpenCase}/>;

  const validate = async (alert: Row, decision: 'validated' | 'disputed' | 'needs_more_data') => {
    const id = s(alert.id); if (!id) return;
    setReviewing(id); setMessage('');
    try { await apiClient.reviewForecast(id, decision, 'Analyst validation from forecast workbench'); setMessage(`Signal ${id} marked ${decision.replaceAll('_', ' ')}.`); setAlerts(await apiClient.alerts()); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Review failed'); }
    finally { setReviewing(''); }
  };

  if (view === 'MO') return <section style={panel}>
    <div className="challenge-heading"><div><h2>Crime-method comparison</h2><p>Select a method to understand where it occurs, how often it remains unresolved, and which recorded signatures connect the FIRs.</p></div><Fingerprint size={22}/></div>
    <div className="challenge-kpis"><div><b>{activeMethod?.cases||0}</b><span>FIRs using selected method</span></div><div><b>{activeMethod?.districtCount||0}</b><span>districts affected</span></div><div><b>{activeMethod?.cases?Math.round(activeMethod.open/activeMethod.cases*100):0}%</b><span>unresolved share</span></div></div>
    <div className="challenge-grid"><div className="challenge-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={methods} layout="vertical" margin={{ left: 22 }} onClick={state => { const method=String(state?.activeLabel||''); if(method)setSelectedMethod(method); }}><CartesianGrid stroke="var(--border)" horizontal={false}/><XAxis type="number"/><YAxis type="category" dataKey="method" width={150} tick={{fontSize:10}}/><Tooltip contentStyle={{background:'var(--surface-elevated)',border:'1px solid var(--border)',borderRadius:8}}/><Bar {...chartMotion} dataKey="cases" name="Verified FIRs" fill="var(--info)" radius={[0,5,5,0]}/><Bar {...chartMotion} dataKey="open" name="Open workload" fill="var(--warning)" radius={[0,5,5,0]}/></BarChart></ResponsiveContainer></div><aside className="challenge-inspector"><span>Selected method</span><h3>{activeMethod?.method||'No method recorded'}</h3><p>{activeMethodCases.length} verified FIRs across {activeMethod?.districtCount||0} districts.</p><div className="challenge-signatures"><strong>Recorded signatures</strong>{[...new Set(activeMethodCases.map(record=>record.modusOperandi?.uniqueSignature).filter(Boolean))].slice(0,5).map(signature=><button key={signature} onClick={()=>openEvidence(`${signature} signature`,activeMethodCases.filter(record=>record.modusOperandi?.uniqueSignature===signature))}>{signature}</button>)}</div><button className="btn btn-primary" disabled={!activeMethodCases.length} onClick={()=>openEvidence(`${activeMethod?.method} FIR evidence`,activeMethodCases)}>Open {activeMethodCases.length} supporting FIRs</button></aside></div>{evidenceDrawer}
  </section>;

  if (view === 'SEASONAL') return <section style={panel}><div className="challenge-heading"><div><h2>Seasonal workload calendar</h2><p>Compare monthly volume and unresolved pressure. Select a month to reveal its dominant crime family, district coverage, and FIR evidence.</p></div><Database size={22}/></div><div className="challenge-kpis"><div><b>{activeMonth?.month||'—'}</b><span>selected period</span></div><div><b>{activeMonth?.incidents||0}</b><span>verified FIRs</span></div><div><b>{activeMonth?.openShare||0}%</b><span>unresolved share</span></div></div><div className="challenge-chart seasonal-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={seasonal} onClick={state => { const month=String(state?.activeLabel||''); if(month)setSelectedMonth(month); }}><CartesianGrid stroke="var(--border)" vertical={false}/><XAxis dataKey="month"/><YAxis/><Tooltip contentStyle={{background:'var(--surface-elevated)',border:'1px solid var(--border)',borderRadius:8}}/><Line {...chartMotion} type="monotone" dataKey="incidents" name="Verified FIRs" stroke="var(--info)" strokeWidth={3} dot={{r:5}} activeDot={{r:8}}/><Line {...chartMotion} type="monotone" dataKey="open" name="Open workload" stroke="var(--warning)" strokeWidth={2} dot={{r:4}}/></LineChart></ResponsiveContainer></div><div className="seasonal-month-grid">{seasonal.map(item=><button className={item.month===activeMonth?.month?'active':''} key={item.month} onClick={()=>setSelectedMonth(item.month)}><span>{item.month}</span><strong>{item.incidents}</strong><small>{item.openShare}% open · {item.districtCount} districts</small></button>)}</div><div className="challenge-inspector inline"><div><span>Selected month evidence</span><h3>{activeMonth?.month}: {activeMonth?.dominantCategory}</h3><p>{activeMonth?.districtCount||0} districts represented. Calendar-event causation is not inferred without an official event dataset.</p></div><button className="btn btn-primary" disabled={!activeMonthCases.length} onClick={()=>openEvidence(`${activeMonth?.month} seasonal FIR evidence`,activeMonthCases)}>Open supporting FIRs</button></div>{evidenceDrawer}</section>;

  if (view === 'SOCIO') return <section style={panel}><div className="challenge-heading"><div><h2>Socio-economic risk correlation</h2><p>{s((social.summary as Row)?.evidence_basis)}</p></div><Scale size={22}/></div><div className="challenge-chart wide"><ResponsiveContainer width="100%" height="100%"><BarChart data={socialRows} onClick={state=>{const district=String(state?.activeLabel||'');if(district)openEvidence(`${district} social-risk evidence`,cases.filter(record=>record.location.district===district));}}><CartesianGrid stroke="var(--border)" vertical={false}/><XAxis dataKey="district" tick={{fontSize:10}}/><YAxis/><Tooltip contentStyle={{background:'var(--surface-elevated)',border:'1px solid var(--border)',borderRadius:8}}/><Bar {...chartMotion} dataKey="social_risk_index" name="Social risk index" radius={[5,5,0,0]}>{socialRows.map((_, index) => <Cell key={index} fill={index < 3 ? '#be123c' : '#0f766e'}/>)}</Bar></BarChart></ResponsiveContainer></div><div className="challenge-ledger">{socialRows.slice(0,5).map(row => <article key={s(row.district)}><strong>{s(row.district)}</strong><span>{n(row.incidents)} FIRs · {n(row.high_risk_count)} high-risk links</span><p>{s(row.interpretation)}</p><button className="btn btn-secondary" onClick={()=>openEvidence(`${s(row.district)} evidence`,cases.filter(record=>record.location.district===s(row.district)))}>Inspect district FIRs</button></article>)}</div>{evidenceDrawer}</section>;

  if (view === 'FINANCIAL') return <section style={panel}><div className="challenge-heading"><div><h2>Financial-link intelligence</h2><p>{s((financial.summary as Row)?.evidence_basis)}</p></div><CircleDollarSign size={22}/></div><div className="challenge-kpis"><div><b>{n((financial.summary as Row)?.candidate_cases)}</b><span>candidate records</span></div><div><b>{n((financial.summary as Row)?.suspicious_clusters)}</b><span>suspicious clusters</span></div><div><b>{s((financial.summary as Row)?.data_source)}</b><span>verified source</span></div></div><div className="challenge-ledger">{clusters.map((row,index) => <article key={s(row.account || row.offender_id || index)}><strong>{s(row.account || row.offender_name || row.offender_id)}</strong><span>Link score {n(row.link_score)}/100 · {n(row.case_count)} cases · {n(row.transaction_count)} transactions</span><p>{s(row.recommended_action)}</p><small>Evidence: {Array.isArray(row.evidence) ? row.evidence.join(', ') : 'No linked identifiers'}</small><button className="btn btn-secondary" onClick={()=>{const ids=new Set((Array.isArray(row.evidence)?row.evidence:[]).map(String));openEvidence('Financial cluster FIR evidence',cases.filter(record=>ids.has(record.firNumber)||ids.has(record.id)));}}>Trace linked FIRs</button></article>)}</div>{evidenceDrawer}</section>;

  if (view === 'FORECAST') return <section style={panel}><div className="challenge-heading"><div><h2>Forecast validation and early-warning ledger</h2><p>{s(forecastSummary.method)}</p></div><AlertTriangle size={22}/></div><div className="challenge-kpis"><div><b>{n(forecastSummary.next_month_forecast)}</b><span>next-month FIR forecast</span></div><div><b>{s(forecastSummary.trend_direction)}</b><span>current direction</span></div><div><b>{n(((forecastSummary.validation || {}) as Row).mape_percent)}%</b><span>rolling backtest MAPE</span></div></div>{message && <div className="challenge-message">{message}</div>}<div className="challenge-ledger">{alerts.length ? alerts.map(row => <article key={s(row.id)}><strong>{s(row.district || row.signal_type || `Signal ${row.id}`)}</strong><span>{s(row.severity || row.alert_level)} · {s(row.status || 'OPEN')}</span><p>{s(row.summary || row.message || row.recommended_action)}</p><button className="btn btn-secondary" onClick={()=>openEvidence(`${s(row.district)} warning evidence`,cases.filter(record=>record.location.district===s(row.district)))}>Inspect FIR evidence</button><div className="challenge-actions"><button className="btn btn-primary" disabled={reviewing === s(row.id)} onClick={() => validate(row,'validated')}>Validate</button><button className="btn btn-secondary" disabled={reviewing === s(row.id)} onClick={() => validate(row,'needs_more_data')}>Request data</button><button className="btn btn-secondary" disabled={reviewing === s(row.id)} onClick={() => validate(row,'disputed')}>Dispute</button></div></article>) : warnings.map((row,index) => <article key={`${s(row.district)}-${index}`}><strong>{s(row.district)}</strong><span>{s(row.alert_level)} · {n(row.increase_percent)}% lift</span><p>{s(row.recommended_action)}</p><button className="btn btn-secondary" onClick={()=>openEvidence(`${s(row.district)} warning evidence`,cases.filter(record=>record.location.district===s(row.district)))}>Inspect FIR evidence</button></article>)}</div>{evidenceDrawer}</section>;

  return <section style={panel}><div className="challenge-heading"><div><h2>Explainability and evidence trails</h2><p>Inspect the data path behind each analytical claim before operational use</p></div><ShieldCheck size={22}/></div><div className="challenge-ledger">{trails.map((trail,index) => <article key={`${s(trail.claim)}-${index}`}><strong>{s(trail.claim)}</strong><span>{s(trail.source)}</span><p>{Array.isArray(trail.data) ? `${trail.data.length} source rows support this claim.` : 'Structured source evidence is attached.'}</p><button onClick={() => onOpenChat(`Question this analyst evidence claim: ${s(trail.claim)}. Use the ${s(trail.source)} evidence trail and explain what supports it, what is uncertain, and what should be verified next.`)}>Question this claim</button></article>)}</div><div className="challenge-principles">{(Array.isArray(explainable.principles) ? explainable.principles : []).map((item,index) => <span key={index}><CheckCircle2 size={15}/>{s(item)}</span>)}</div></section>;
};
