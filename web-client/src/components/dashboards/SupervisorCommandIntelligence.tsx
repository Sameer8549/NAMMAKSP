import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCheck, RefreshCw, ShieldCheck } from 'lucide-react';
import { apiClient } from '../../services/apiClient';

type Row = Record<string, unknown>;
interface Props { view: 'alerts' | 'forecast' | 'audit'; }
const s = (value: unknown) => String(value ?? '');

export const SupervisorCommandIntelligence: React.FC<Props> = ({ view }) => {
  const [alerts, setAlerts] = useState<Row[]>([]);
  const [audit, setAudit] = useState<Row[]>([]);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const load = async () => {
    setMessage('');
    try {
      if (view === 'audit') setAudit(await apiClient.listAudit());
      else setAlerts(await apiClient.alerts());
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Command intelligence could not be loaded'); }
  };
  useEffect(() => { void load(); }, [view]);
  const openAlerts = useMemo(() => alerts.filter(item => !['RESOLVED','CLOSED'].includes(s(item.status).toUpperCase())), [alerts]);
  const act = async (item: Row, action: 'assign'|'acknowledge'|'resolve') => {
    const id = s(item.id); setBusy(id); setMessage('');
    try { await apiClient.transitionAlert(id, action, action === 'assign' ? { assignee: 'supervisor' } : {}); setMessage(`Alert ${id} ${action} action recorded.`); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Alert action failed'); } finally { setBusy(''); }
  };
  const review = async (item: Row, decision: 'validated'|'disputed'|'needs_more_data') => {
    const id=s(item.id); setBusy(id); setMessage('');
    try { await apiClient.reviewForecast(id,decision,'Supervisor command review'); setMessage(`Forecast ${id} marked ${decision.replaceAll('_',' ')}.`); await load(); }
    catch(error){setMessage(error instanceof Error?error.message:'Forecast review failed');} finally{setBusy('');}
  };

  return <section className="command-intelligence">
    <header><div>{view==='alerts'?<AlertTriangle/>:view==='forecast'?<ClipboardCheck/>:<ShieldCheck/>}<div><h1>{view==='alerts'?'Early-warning command inbox':view==='forecast'?'Forecast command review':'Command audit trail'}</h1><p>{view==='audit'?'Trace command-scope activity and accountability events':'Review persistent signals, record decisions, and preserve an evidence trail'}</p></div></div><button className="btn btn-secondary" onClick={load}><RefreshCw size={15}/> Refresh</button></header>
    {message&&<div className="command-message">{message}</div>}
    {view==='audit'?<div className="command-table"><table><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Resource</th><th>Result</th></tr></thead><tbody>{audit.slice(0,100).map((item,index)=><tr key={s(item.id||index)}><td>{s(item.timestamp||item.created_at)}</td><td>{s(item.actor||item.username)}</td><td>{s(item.action)}</td><td>{s(item.targetResource||item.resource)}</td><td>{s(item.outcome||item.status)}</td></tr>)}</tbody></table></div>:<div className="command-alerts">{(view==='alerts'?openAlerts:alerts).map(item=><article key={s(item.id)}><div><strong>{s(item.district||item.signal_type||`Alert ${item.id}`)}</strong><span>{s(item.severity||item.alert_level)} · {s(item.status||'OPEN')}</span></div><p>{s(item.summary||item.message||item.recommended_action)}</p><small>{s(item.evidence_reference||item.source||'Forecast and FIR evidence ledger')}</small><div className="command-actions">{view==='alerts'?<><button disabled={busy===s(item.id)} onClick={()=>act(item,'assign')}>Assign</button><button disabled={busy===s(item.id)} onClick={()=>act(item,'acknowledge')}>Acknowledge</button><button disabled={busy===s(item.id)} onClick={()=>act(item,'resolve')}>Resolve</button></>:<><button disabled={busy===s(item.id)} onClick={()=>review(item,'validated')}><CheckCircle2 size={14}/> Validate</button><button disabled={busy===s(item.id)} onClick={()=>review(item,'needs_more_data')}>Need data</button><button disabled={busy===s(item.id)} onClick={()=>review(item,'disputed')}>Dispute</button></>}</div></article>)}</div>}
    <style>{`.command-intelligence{display:grid;gap:1rem}.command-intelligence>header{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:1rem;background:var(--surface-card);border:1px solid var(--border);border-radius:var(--radius-lg)}.command-intelligence>header>div{display:flex;gap:.75rem;align-items:flex-start}.command-intelligence h1{font-size:1.05rem;margin:0;color:var(--text-primary)}.command-intelligence p{color:var(--text-muted);margin:.2rem 0;line-height:1.45}.command-message{padding:.75rem;background:var(--surface-muted);border:1px solid var(--border);border-radius:var(--radius-md)}.command-alerts{display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:.75rem}.command-alerts article{display:grid;gap:.6rem;padding:1rem;background:var(--surface-card);border:1px solid var(--border);border-radius:var(--radius-lg)}.command-alerts article>div:first-child{display:flex;justify-content:space-between;gap:.7rem}.command-alerts span,.command-alerts small{font-size:.72rem;color:var(--text-muted)}.command-alerts p{font-size:.8rem}.command-actions{display:flex;gap:.75rem;flex-wrap:wrap}.command-actions button{display:flex;align-items:center;gap:.3rem;border:0;background:transparent;color:var(--info);font-weight:750;cursor:pointer}.command-table{overflow:auto;background:var(--surface-card);border:1px solid var(--border);border-radius:var(--radius-lg)}.command-table table{width:100%;min-width:760px;border-collapse:collapse}.command-table th,.command-table td{padding:.7rem;text-align:left;border-bottom:1px solid var(--border);font-size:.75rem;color:var(--text-secondary)}.command-table th{color:var(--text-muted);text-transform:uppercase;font-size:.66rem}`}</style>
  </section>;
};
