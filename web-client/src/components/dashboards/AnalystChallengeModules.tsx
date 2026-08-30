import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleDollarSign, Database, Fingerprint, Scale, ShieldCheck } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { apiClient } from '../../services/apiClient';
import { dataService } from '../../services/mockDataService';
import type { CaseRecord } from '../../types/crime';
import './analystChallengeModules.css';
import { EvidenceDrilldown } from '../common/EvidenceDrilldown';

export type ChallengeView = 'MO' | 'SEASONAL' | 'SOCIO' | 'FINANCIAL' | 'FORECAST' | 'EXPLAIN';
interface Props { view: ChallengeView; cases: CaseRecord[]; onOpenChat: () => void; onOpenCase: (record: CaseRecord) => void; }
type Row = Record<string, unknown>;

const panel: React.CSSProperties = { background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: '1rem' };
const asRows = (value: unknown): Row[] => Array.isArray(value) ? value as Row[] : [];
const n = (value: unknown) => Number(value || 0);
const s = (value: unknown) => String(value ?? '');

export const AnalystChallengeModules: React.FC<Props> = ({ view, cases, onOpenChat, onOpenCase }) => {
  const forecast = dataService.getForecast() as Row;
  const social = dataService.getSociological() as Row;
  const financial = dataService.getFinancial() as Row;
  const explainable = dataService.getExplainable() as Row;
  const [alerts, setAlerts] = useState<Row[]>([]);
  const [reviewing, setReviewing] = useState<string>('');
  const [message, setMessage] = useState('');
  const [evidenceTitle, setEvidenceTitle] = useState('');
  const [evidenceCases, setEvidenceCases] = useState<CaseRecord[]>([]);

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
    const months = Array.from({ length: 12 }, (_, index) => ({ month: new Date(2025, index, 1).toLocaleString('en', { month: 'short' }), incidents: 0, open: 0 }));
    cases.forEach(record => { const date = new Date(record.incidentDate || record.filedDate); if (!Number.isNaN(date.getTime())) { months[date.getMonth()].incidents += 1; if (record.status !== 'CLOSED') months[date.getMonth()].open += 1; } });
    return months;
  }, [cases]);

  const socialRows = asRows(social.district_social_risk);
  const clusters = asRows(financial.clusters);
  const forecastSummary = (forecast.summary || {}) as Row;
  const warnings = asRows(forecast.early_warnings);
  const trails = asRows(explainable.evidence_trails);
  const openEvidence = (title: string, records: CaseRecord[]) => { setEvidenceTitle(title); setEvidenceCases(records.slice(0, 100)); };
  const evidenceDrawer = evidenceTitle && <EvidenceDrilldown title={evidenceTitle} records={evidenceCases} onClose={() => setEvidenceTitle('')} onOpenCase={onOpenCase}/>;

  const validate = async (alert: Row, decision: 'validated' | 'disputed' | 'needs_more_data') => {
    const id = s(alert.id); if (!id) return;
    setReviewing(id); setMessage('');
    try { await apiClient.reviewForecast(id, decision, 'Analyst validation from forecast workbench'); setMessage(`Signal ${id} marked ${decision.replaceAll('_', ' ')}.`); setAlerts(await apiClient.alerts()); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Review failed'); }
    finally { setReviewing(''); }
  };

  if (view === 'MO') return <section style={panel}>
    <div className="challenge-heading"><div><h2>Modus-operandi pattern laboratory</h2><p>Methods, cross-district spread, open workload and distinct signatures derived from FIR records</p></div><Fingerprint size={22}/></div>
    <div className="challenge-grid"><div className="challenge-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={methods} layout="vertical" margin={{ left: 22 }} onClick={state => { const method=String(state?.activeLabel||''); if(method) openEvidence(method,cases.filter(record=>record.modusOperandi?.primaryMethod===method)); }}><CartesianGrid stroke="var(--border)" horizontal={false}/><XAxis type="number"/><YAxis type="category" dataKey="method" width={150} tick={{fontSize:10}}/><Tooltip contentStyle={{background:'var(--surface-elevated)',border:'1px solid var(--border)',borderRadius:8}}/><Bar dataKey="cases" name="FIRs" fill="#2563eb" radius={[0,5,5,0]}/><Bar dataKey="open" name="Open" fill="#d97706" radius={[0,5,5,0]}/></BarChart></ResponsiveContainer></div><div className="challenge-list">{methods.slice(0,6).map(item => <article key={item.method}><strong>{item.method}</strong><span>{item.cases} FIRs · {item.districtCount} districts · {item.signatureCount} signatures</span><button className="btn btn-secondary" onClick={() => openEvidence(item.method,cases.filter(record=>record.modusOperandi?.primaryMethod===item.method))}>Open FIR evidence</button></article>)}</div></div>{evidenceDrawer}
  </section>;

  if (view === 'SEASONAL') return <section style={panel}><div className="challenge-heading"><div><h2>Seasonal pattern analysis</h2><p>Select a month to inspect the FIRs behind its concentration and open workload.</p></div><Database size={22}/></div><div className="challenge-chart wide"><ResponsiveContainer width="100%" height="100%"><LineChart data={seasonal} onClick={state => { const month=String(state?.activeLabel||''); if(month) openEvidence(`${month} incident evidence`,cases.filter(record=>{const date=new Date(record.incidentDate||record.filedDate);return !Number.isNaN(date.getTime())&&date.toLocaleString('en',{month:'short'})===month;})); }}><CartesianGrid stroke="var(--border)" vertical={false}/><XAxis dataKey="month"/><YAxis/><Tooltip contentStyle={{background:'var(--surface-elevated)',border:'1px solid var(--border)',borderRadius:8}}/><Line type="monotone" dataKey="incidents" name="Incidents" stroke="#2563eb" strokeWidth={3} dot={{r:4}} activeDot={{r:7}}/><Line type="monotone" dataKey="open" name="Open workload" stroke="#d97706" strokeWidth={2} dot={{r:3}}/></LineChart></ResponsiveContainer></div><div className="challenge-footnote">Event attribution is not inferred without a verified event calendar.</div>{evidenceDrawer}</section>;

  if (view === 'SOCIO') return <section style={panel}><div className="challenge-heading"><div><h2>Socio-economic risk correlation</h2><p>{s((social.summary as Row)?.evidence_basis)}</p></div><Scale size={22}/></div><div className="challenge-chart wide"><ResponsiveContainer width="100%" height="100%"><BarChart data={socialRows} onClick={state=>{const district=String(state?.activeLabel||'');if(district)openEvidence(`${district} social-risk evidence`,cases.filter(record=>record.location.district===district));}}><CartesianGrid stroke="var(--border)" vertical={false}/><XAxis dataKey="district" tick={{fontSize:10}}/><YAxis/><Tooltip contentStyle={{background:'var(--surface-elevated)',border:'1px solid var(--border)',borderRadius:8}}/><Bar dataKey="social_risk_index" name="Social risk index" radius={[5,5,0,0]}>{socialRows.map((_, index) => <Cell key={index} fill={index < 3 ? '#be123c' : '#0f766e'}/>)}</Bar></BarChart></ResponsiveContainer></div><div className="challenge-ledger">{socialRows.slice(0,5).map(row => <article key={s(row.district)}><strong>{s(row.district)}</strong><span>{n(row.incidents)} FIRs · {n(row.high_risk_count)} high-risk links</span><p>{s(row.interpretation)}</p><button className="btn btn-secondary" onClick={()=>openEvidence(`${s(row.district)} evidence`,cases.filter(record=>record.location.district===s(row.district)))}>Inspect district FIRs</button></article>)}</div>{evidenceDrawer}</section>;

  if (view === 'FINANCIAL') return <section style={panel}><div className="challenge-heading"><div><h2>Financial-link intelligence</h2><p>{s((financial.summary as Row)?.evidence_basis)}</p></div><CircleDollarSign size={22}/></div><div className="challenge-kpis"><div><b>{n((financial.summary as Row)?.candidate_cases)}</b><span>candidate records</span></div><div><b>{n((financial.summary as Row)?.suspicious_clusters)}</b><span>suspicious clusters</span></div><div><b>{s((financial.summary as Row)?.data_source)}</b><span>verified source</span></div></div><div className="challenge-ledger">{clusters.map((row,index) => <article key={s(row.account || row.offender_id || index)}><strong>{s(row.account || row.offender_name || row.offender_id)}</strong><span>Link score {n(row.link_score)}/100 · {n(row.case_count)} cases · {n(row.transaction_count)} transactions</span><p>{s(row.recommended_action)}</p><small>Evidence: {Array.isArray(row.evidence) ? row.evidence.join(', ') : 'No linked identifiers'}</small><button className="btn btn-secondary" onClick={()=>{const ids=new Set((Array.isArray(row.evidence)?row.evidence:[]).map(String));openEvidence('Financial cluster FIR evidence',cases.filter(record=>ids.has(record.firNumber)||ids.has(record.id)));}}>Trace linked FIRs</button></article>)}</div>{evidenceDrawer}</section>;

  if (view === 'FORECAST') return <section style={panel}><div className="challenge-heading"><div><h2>Forecast validation and early-warning ledger</h2><p>{s(forecastSummary.method)}</p></div><AlertTriangle size={22}/></div><div className="challenge-kpis"><div><b>{n(forecastSummary.next_month_forecast)}</b><span>next-month FIR forecast</span></div><div><b>{s(forecastSummary.trend_direction)}</b><span>current direction</span></div><div><b>{n(((forecastSummary.validation || {}) as Row).mape_percent)}%</b><span>rolling backtest MAPE</span></div></div>{message && <div className="challenge-message">{message}</div>}<div className="challenge-ledger">{alerts.length ? alerts.map(row => <article key={s(row.id)}><strong>{s(row.district || row.signal_type || `Signal ${row.id}`)}</strong><span>{s(row.severity || row.alert_level)} · {s(row.status || 'OPEN')}</span><p>{s(row.summary || row.message || row.recommended_action)}</p><button className="btn btn-secondary" onClick={()=>openEvidence(`${s(row.district)} warning evidence`,cases.filter(record=>record.location.district===s(row.district)))}>Inspect FIR evidence</button><div className="challenge-actions"><button className="btn btn-primary" disabled={reviewing === s(row.id)} onClick={() => validate(row,'validated')}>Validate</button><button className="btn btn-secondary" disabled={reviewing === s(row.id)} onClick={() => validate(row,'needs_more_data')}>Request data</button><button className="btn btn-secondary" disabled={reviewing === s(row.id)} onClick={() => validate(row,'disputed')}>Dispute</button></div></article>) : warnings.map((row,index) => <article key={`${s(row.district)}-${index}`}><strong>{s(row.district)}</strong><span>{s(row.alert_level)} · {n(row.increase_percent)}% lift</span><p>{s(row.recommended_action)}</p><button className="btn btn-secondary" onClick={()=>openEvidence(`${s(row.district)} warning evidence`,cases.filter(record=>record.location.district===s(row.district)))}>Inspect FIR evidence</button></article>)}</div>{evidenceDrawer}</section>;

  return <section style={panel}><div className="challenge-heading"><div><h2>Explainability and evidence trails</h2><p>Inspect the data path behind each analytical claim before operational use</p></div><ShieldCheck size={22}/></div><div className="challenge-ledger">{trails.map((trail,index) => <article key={`${s(trail.claim)}-${index}`}><strong>{s(trail.claim)}</strong><span>{s(trail.source)}</span><p>{Array.isArray(trail.data) ? `${trail.data.length} source rows support this claim.` : 'Structured source evidence is attached.'}</p><button onClick={onOpenChat}>Question this claim</button></article>)}</div><div className="challenge-principles">{(Array.isArray(explainable.principles) ? explainable.principles : []).map((item,index) => <span key={index}><CheckCircle2 size={15}/>{s(item)}</span>)}</div></section>;
};
