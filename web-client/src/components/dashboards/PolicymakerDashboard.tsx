import React, { useMemo, useState } from 'react';
import { BarChart3, Building2, FileText, MapPin, ShieldCheck, Sparkles, TrendingUp, Users, X } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useRole } from '../../context/RoleContext';
import { dataService } from '../../services/mockDataService';
import { exportDashboardToCSV } from '../../services/reportExportService';
import type { DistrictStats } from '../../types/analytics';
import { WhiteSheetModal } from '../common/WhiteSheetModal';
import { ExportMenu } from '../common/ExportMenu';

interface PolicymakerDashboardProps { onOpenExplainModal?: () => void; onOpenChatDrawer?: () => void; }
const panel: React.CSSProperties = { background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: '1rem' };

export const PolicymakerDashboard: React.FC<PolicymakerDashboardProps> = ({ onOpenChatDrawer }) => {
  const { activeView } = useRole();
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictStats | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const trends = dataService.getCrimeTrends();
  const districts = dataService.getDistricts();
  const demographics = dataService.getDemographics();
  const forecast = dataService.getForecast();
  const sociological = dataService.getSociological();
  const forecastSummary = (forecast.summary || {}) as Record<string, unknown>;
  const forecastValidation = (forecastSummary.validation || {}) as Record<string, unknown>;
  const forecastWarnings = (Array.isArray(forecast.early_warnings) ? forecast.early_warnings : []) as Array<Record<string, unknown>>;
  const socialRisk = (Array.isArray(sociological.district_social_risk) ? sociological.district_social_risk : []) as Array<Record<string, unknown>>;

  const statewide = useMemo(() => ({
    total: districts.reduce((sum, item) => sum + item.totalCases, 0),
    resolved: districts.reduce((sum, item) => sum + item.resolvedCases, 0),
    pending: districts.reduce((sum, item) => sum + item.pendingCases, 0),
    highRisk: districts.filter(item => item.riskStatus === 'HIGH_ALERT').length,
  }), [districts]);
  const clearance = statewide.total ? Math.round((statewide.resolved / statewide.total) * 1000) / 10 : 0;
  const topDistricts = [...districts].sort((a, b) => b.totalCases - a.totalCases).slice(0, 10);
  const view = activeView.toLowerCase();
  const showOverview = view.includes('state') || view === 'overview';
  const showDistricts = view.includes('district') || view.includes('hotspot') || view.includes('resource');
  const showTrends = view.includes('trend') || view.includes('seasonal');
  const showDemographics = view.includes('demographic');
  const showSocial = view.includes('social');
  const showForecast = view.includes('forecast');
  const showPrevention = view.includes('prevention') || view.includes('scenario');

  const metric = (icon: React.ReactNode, label: string, value: React.ReactNode, note: string) => <div style={panel}><div style={{ color: 'var(--text-muted)' }}>{icon}</div><div style={{ marginTop: '0.55rem', color: 'var(--text-secondary)', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase' }}>{label}</div><div style={{ marginTop: '0.2rem', fontSize: '1.5rem', fontWeight: 850, color: 'var(--text-primary)' }}>{value}</div><div style={{ marginTop: '0.2rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{note}</div></div>;

  return <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
    <header style={{ ...panel, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', borderColor: 'var(--border-accent)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}><Building2 size={25} color="var(--success)" /><div><h1 style={{ margin: 0, fontSize: '1.18rem', color: 'var(--text-primary)' }}>State Prevention Intelligence</h1><p style={{ margin: '0.15rem 0 0', fontSize: '0.74rem', color: 'var(--text-muted)' }}>Pseudonymized statewide evidence for policy and resource planning</p></div></div>
      <ExportMenu reportLabel="Generate policy PDF" onReport={() => setReportOpen(true)} onCsv={() => exportDashboardToCSV('POLICYMAKER', activeView, 'en')}/>
    </header>

    {(showOverview || (!showDistricts && !showTrends && !showDemographics && !showSocial && !showForecast && !showPrevention)) && <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
        {metric(<ShieldCheck size={20} />, 'Statewide FIRs', statewide.total.toLocaleString(), 'Pseudonymized statewide aggregate; case identities withheld')}
        {metric(<TrendingUp size={20} />, 'Clearance rate', `${clearance}%`, `${statewide.resolved.toLocaleString()} resolved cases`)}
        {metric(<MapPin size={20} />, 'Priority districts', statewide.highRisk, `${districts.length} districts benchmarked`)}
        {metric(<BarChart3 size={20} />, 'Open workload', statewide.pending.toLocaleString(), 'Derived from district case status totals')}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(280px, 0.65fr)', gap: '1rem' }} className="policy-main-grid">
        <section style={panel}><h2 className="policy-title">State crime trajectory</h2><p className="policy-copy">Observed category volume by reporting period</p><div style={{ height: 310 }}><ResponsiveContainer width="100%" height="100%"><AreaChart data={trends}><defs><linearGradient id="policyTrend" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--info)" stopOpacity={0.35}/><stop offset="95%" stopColor="var(--info)" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="var(--border)" vertical={false}/><XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }}/><YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }}/><Tooltip contentStyle={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}/><Area type="monotone" dataKey="totalIncidents" stroke="var(--info)" strokeWidth={2} fill="url(#policyTrend)" /></AreaChart></ResponsiveContainer></div></section>
        <section style={panel}><h2 className="policy-title">Resource attention</h2><p className="policy-copy">Highest verified district case pressure</p><div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.8rem' }}>{topDistricts.slice(0, 6).map((district, index) => <button key={district.id} onClick={() => setSelectedDistrict(district)} style={{ display: 'grid', gridTemplateColumns: '24px 1fr auto', gap: '0.55rem', alignItems: 'center', padding: '0.65rem', textAlign: 'left', background: 'var(--surface-muted)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}><strong>{index + 1}</strong><span>{district.name}</span><strong>{district.totalCases}</strong></button>)}</div></section>
      </div>
    </>}

    {showDistricts && <section style={panel}><h2 className="policy-title">District comparison</h2><p className="policy-copy">Case volume, pending pressure and clearance. Select a district for evidence detail.</p><div style={{ height: 380, marginTop: '1rem' }}><ResponsiveContainer width="100%" height="100%"><BarChart data={topDistricts} layout="vertical" margin={{ left: 25, right: 15 }} onClick={state => { const district = topDistricts.find(item => item.name === String(state?.activeLabel || '')); if (district) setSelectedDistrict(district); }}><CartesianGrid stroke="var(--border)" horizontal={false}/><XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10 }}/><YAxis type="category" dataKey="name" width={110} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}/><Tooltip contentStyle={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}/><Legend/><Bar dataKey="resolvedCases" name="Resolved" stackId="cases" fill="var(--success)"/><Bar dataKey="pendingCases" name="Pending" stackId="cases" fill="var(--warning)"/></BarChart></ResponsiveContainer></div></section>}

    {showTrends && <section style={panel}><h2 className="policy-title">Category trend intelligence</h2><p className="policy-copy">Comparative trend series generated from FIR dates and categories</p><div style={{ height: 430, marginTop: '1rem' }}><ResponsiveContainer width="100%" height="100%"><AreaChart data={trends}><CartesianGrid stroke="var(--border)" vertical={false}/><XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }}/><YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }}/><Tooltip contentStyle={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}/><Legend/><Area type="monotone" dataKey="cybercrime" stackId="1" stroke="#2563eb" fill="#2563eb" fillOpacity={0.45}/><Area type="monotone" dataKey="propertyTheft" stackId="1" stroke="#d97706" fill="#d97706" fillOpacity={0.4}/><Area type="monotone" dataKey="violentCrime" stackId="1" stroke="#be123c" fill="#be123c" fillOpacity={0.38}/><Area type="monotone" dataKey="financialFraud" stackId="1" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.38}/><Area type="monotone" dataKey="narcotics" stackId="1" stroke="#0f766e" fill="#0f766e" fillOpacity={0.38}/></AreaChart></ResponsiveContainer></div></section>}

    {showDemographics && <section style={panel}><h2 className="policy-title">Socio-demographic evidence</h2><p className="policy-copy">Aggregated and pseudonymized age distribution; no individual identity is exposed</p><div style={{ height: 390, marginTop: '1rem' }}><ResponsiveContainer width="100%" height="100%"><BarChart data={demographics}><CartesianGrid stroke="var(--border)" vertical={false}/><XAxis dataKey="ageGroup" tick={{ fill: 'var(--text-muted)', fontSize: 11 }}/><YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }}/><Tooltip contentStyle={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}/><Legend/><Bar dataKey="victimPercentage" name="Victim share %" fill="var(--info)" radius={[4,4,0,0]}/><Bar dataKey="accusedPercentage" name="Accused share %" fill="var(--accent)" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div></section>}

    {showSocial && <section style={panel}><h2 className="policy-title">District social-risk indicators</h2><p className="policy-copy">Aggregate correlation evidence; the index is decision support, not a causal claim</p><div style={{ height: 420, marginTop: '1rem' }}><ResponsiveContainer width="100%" height="100%"><BarChart data={socialRisk}><CartesianGrid stroke="var(--border)" vertical={false}/><XAxis dataKey="district" tick={{ fill: 'var(--text-muted)', fontSize: 10 }}/><YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }}/><Tooltip contentStyle={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}/><Legend/><Bar dataKey="social_risk_index" name="Social risk index" fill="var(--accent)" radius={[4,4,0,0]}/><Bar dataKey="incidents" name="Observed FIRs" fill="var(--info)" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div></section>}

    {showForecast && <div className="policy-main-grid" style={{ display:'grid', gridTemplateColumns:'minmax(0,1.25fr) minmax(300px,.75fr)', gap:'1rem' }}><section style={panel}><h2 className="policy-title">Forecast bands and district signals</h2><p className="policy-copy">Explainable projection with validation error and an empirical uncertainty interval</p><div className="policy-forecast-kpis"><div><b>{Number(forecastSummary.next_month_forecast || 0)}</b><span>projected FIRs</span></div><div><b>{String(forecastSummary.trend_direction || 'Unknown')}</b><span>trend direction</span></div><div><b>{Number(forecastValidation.mape_percent || 0)}%</b><span>backtest MAPE</span></div></div><div style={{height:320}}><ResponsiveContainer width="100%" height="100%"><BarChart data={forecastWarnings}><CartesianGrid stroke="var(--border)" vertical={false}/><XAxis dataKey="district" tick={{fontSize:10,fill:'var(--text-muted)'}}/><YAxis/><Tooltip/><Bar dataKey="increase_percent" name="Recent lift %" fill="var(--warning)" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div></section><section style={panel}><h2 className="policy-title">Prevention queue</h2><p className="policy-copy">District signals ranked from observed change</p><div className="policy-signal-list">{forecastWarnings.map((item,index)=><article key={`${String(item.district)}-${index}`}><strong>{String(item.district)}</strong><span>{String(item.alert_level)} · {Number(item.increase_percent || 0)}% lift</span><p>{String(item.recommended_action || '')}</p></article>)}</div></section></div>}

    {showPrevention && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
      <section style={panel}><Sparkles size={20} color="var(--accent)"/><h2 className="policy-title">Forecast evidence</h2><div className="policy-decision-value">{Number(forecastSummary.next_month_forecast || 0)} projected FIRs</div><p className="policy-copy">{String(forecastSummary.method || '')}</p></section>
      <section style={panel}><Users size={20} color="var(--info)"/><h2 className="policy-title">Sociological evidence</h2><div className="policy-decision-value">{socialRisk.length} districts profiled</div><p className="policy-copy">{String((sociological.summary as Record<string,unknown> | undefined)?.evidence_basis || '')}</p></section>
      <section style={panel}><ShieldCheck size={20} color="var(--success)"/><h2 className="policy-title">Decision support</h2><p className="policy-copy">Use the policy AI to compare evidence, challenge assumptions and produce a traceable briefing. Recommendations require authorized human review.</p><button className="btn btn-primary" onClick={onOpenChatDrawer}><Sparkles size={15}/> Open strategic AI</button></section>
    </div>}

    {selectedDistrict && <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(15,23,42,.72)', display: 'grid', placeItems: 'center', padding: '1rem' }}><section style={{ ...panel, width: 'min(620px, 100%)', maxHeight: '86vh', overflowY: 'auto' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}><div><h2 style={{ margin: 0 }}>{selectedDistrict.name} evidence</h2><p className="policy-copy">Verified district aggregate</p></div><button className="btn btn-icon" onClick={() => setSelectedDistrict(null)} aria-label="Close district detail"><X size={17}/></button></div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginTop: '1rem' }}>{metric(<FileText size={17}/>, 'Total cases', selectedDistrict.totalCases, selectedDistrict.dominantCategory)}{metric(<ShieldCheck size={17}/>, 'Clearance', `${selectedDistrict.clearanceRate}%`, `${selectedDistrict.resolvedCases} resolved`)}{metric(<TrendingUp size={17}/>, 'Recent trend', `${selectedDistrict.trendPercentage}%`, selectedDistrict.riskStatus.replaceAll('_',' '))}{metric(<MapPin size={17}/>, 'Pending', selectedDistrict.pendingCases, `Code ${selectedDistrict.karnatakaCode}`)}</div></section></div>}
    <WhiteSheetModal isOpen={reportOpen} onClose={() => setReportOpen(false)} />
    <style>{`.policy-title{margin:.35rem 0 0;color:var(--text-primary);font-size:.95rem;font-weight:800}.policy-copy{margin:.2rem 0 .75rem;color:var(--text-muted);font-size:.72rem;line-height:1.45}.policy-decision-value{font-size:1.35rem;font-weight:850;color:var(--text-primary);margin:.8rem 0 .3rem}.policy-forecast-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:.6rem;margin:1rem 0}.policy-forecast-kpis>div{display:grid;gap:.2rem;padding:.8rem;border:1px solid var(--border);background:var(--surface-muted);border-radius:var(--radius-md)}.policy-forecast-kpis b{font-size:1.25rem;color:var(--text-primary)}.policy-forecast-kpis span,.policy-signal-list span{font-size:.7rem;color:var(--text-muted)}.policy-signal-list{display:grid;gap:.55rem}.policy-signal-list article{padding:.75rem;border:1px solid var(--border);background:var(--surface-muted);border-radius:var(--radius-md);display:grid;gap:.25rem}.policy-signal-list p{font-size:.7rem;color:var(--text-muted);line-height:1.4;margin:0}@media(max-width:900px){.policy-main-grid{grid-template-columns:1fr!important}.policy-forecast-kpis{grid-template-columns:1fr}}`}</style>
  </div>;
};
