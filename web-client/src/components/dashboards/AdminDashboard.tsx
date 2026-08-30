import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Cpu, Database, Edit3, FileClock, RefreshCw, Save, Search, ShieldCheck, Trash2, UserPlus, Users, X } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { apiClient } from '../../services/apiClient';
import { dataService } from '../../services/mockDataService';
import type { SecurityAlert, UserSession } from '../../types/system';
import './adminDashboard.css';
import { useRole } from '../../context/RoleContext';

interface AdminDashboardProps {
  isChatOpen?: boolean;
  onOpenExplainModal: () => void;
  onOpenChatDrawer: () => void;
}

type AdminView = 'Overview' | 'User Management' | 'Security Audit' | 'System Health' | 'AI Usage';
type ApiRecord = Record<string, unknown>;
type UserEditor = { username: string; password: string; role: string; active: boolean; isNew: boolean };

const card: React.CSSProperties = { background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: '1rem' };
const actionButton: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem', minHeight: 36, padding: '0.5rem 0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface-muted)', color: 'var(--text-primary)', fontWeight: 750, fontSize: '0.76rem', cursor: 'pointer' };

function valueOf(record: ApiRecord, keys: string[], fallback: unknown = 0): unknown {
  for (const key of keys) if (record[key] !== undefined && record[key] !== null) return record[key];
  return fallback;
}

function Metric({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: React.ReactNode; note: string }) {
  return <div style={card}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}><span style={{ color: 'var(--text-muted)' }}>{icon}</span><span style={{ fontSize: '0.66rem', fontWeight: 800, color: 'var(--success)' }}>LIVE</span></div>
    <div style={{ marginTop: '0.55rem', color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: 750, textTransform: 'uppercase' }}>{label}</div>
    <div style={{ marginTop: '0.2rem', color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 850 }}>{value}</div>
    <div style={{ marginTop: '0.25rem', color: 'var(--text-muted)', fontSize: '0.7rem' }}>{note}</div>
  </div>;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onOpenChatDrawer }) => {
  const { activeView } = useRole();
  const [view, setView] = useState<AdminView>('Overview');
  const [system, setSystem] = useState<ApiRecord>({});
  const [services, setServices] = useState<ApiRecord>({});
  const [users, setUsers] = useState<ApiRecord[]>([]);
  const [audit, setAudit] = useState<ApiRecord[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [userEditor, setUserEditor] = useState<UserEditor | null>(null);
  const [auditDetail, setAuditDetail] = useState<ApiRecord | null>(null);
  const [pendingDelete, setPendingDelete] = useState('');

  const sessions = dataService.getUserSessions();
  const alerts = dataService.getSecurityAlerts();

  const refresh = async () => {
    setLoading(true);
    setError('');
    const results = await Promise.allSettled([apiClient.systemStatus(), apiClient.catalystServices(), apiClient.listUsers(), apiClient.listAudit()]);
    if (results[0].status === 'fulfilled') setSystem(results[0].value);
    if (results[1].status === 'fulfilled') setServices(results[1].value);
    if (results[2].status === 'fulfilled') setUsers(results[2].value);
    if (results[3].status === 'fulfilled') setAudit(results[3].value);
    const failures = results.filter(result => result.status === 'rejected') as PromiseRejectedResult[];
    if (failures.length) setError(`${failures.length} administrative data source${failures.length === 1 ? '' : 's'} failed: ${failures.map(item => item.reason instanceof Error ? item.reason.message : String(item.reason)).join('; ')}`);
    setLoading(false);
  };

  useEffect(() => { void refresh(); }, []);
  useEffect(() => {
    const match = ['Overview', 'User Management', 'Security Audit', 'System Health', 'AI Usage'].find(item => item.toLowerCase() === activeView.toLowerCase());
    if (match) setView(match as AdminView);
  }, [activeView]);

  const serviceRows = useMemo(() => {
    const rows = valueOf(services, ['services', 'items'], []);
    return Array.isArray(rows) ? rows as ApiRecord[] : [];
  }, [services]);
  const activeServices = serviceRows.filter(item => String(valueOf(item, ['status', 'state'], '')).match(/active|live|ready|configured|enabled/i)).length;
  const filteredUsers = users.filter(user => JSON.stringify(user).toLowerCase().includes(query.toLowerCase()));
  const filteredAudit = audit.filter(event => JSON.stringify(event).toLowerCase().includes(query.toLowerCase()));
  const roleChart = Object.entries(users.reduce<Record<string, number>>((counts, user) => { const role = String(valueOf(user, ['role', 'user_role'], 'Unassigned')); counts[role] = (counts[role] || 0) + 1; return counts; }, {})).map(([role, count]) => ({ role, count }));
  const auditActionChart = Object.entries(audit.reduce<Record<string, number>>((counts, event) => { const action = String(valueOf(event, ['action', 'event_type'], 'OTHER')).split('_')[0]; counts[action] = (counts[action] || 0) + 1; return counts; }, {})).map(([action, count]) => ({ action, count })).sort((a, b) => b.count - a.count).slice(0, 8);
  const aiEvents = audit.filter(event => /AI|CHAT|LLM|TRANSLAT|TTS/i.test(String(valueOf(event, ['action', 'event_type'], ''))));

  const saveUser = async () => {
    if (!userEditor?.username.trim()) return;
    setLoading(true); setError(''); setMessage('');
    try {
      if (userEditor.isNew) await apiClient.createUser(userEditor.username.trim(), userEditor.password, userEditor.role);
      else await apiClient.updateUser(userEditor.username, { role: userEditor.role, active: userEditor.active });
      setMessage(userEditor.isNew ? 'User created and written to the audit trail.' : 'User access updated and written to the audit trail.');
      setUserEditor(null); await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'User operation failed.'); }
    finally { setLoading(false); }
  };

  const removeUser = async (username: string) => {
    if (pendingDelete !== username) { setPendingDelete(username); return; }
    setLoading(true); setError('');
    try { await apiClient.deleteUser(username); setPendingDelete(''); setMessage(`${username} was removed and the action was audited.`); await refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'User deletion failed.'); }
    finally { setLoading(false); }
  };


  const overview = <>
    <div className="admin-health-grid">
      <Metric icon={<Users size={19} />} label="Registered users" value={users.length} note={`${sessions.filter((s: UserSession) => s.activeStatus === 'ACTIVE').length} active sessions`} />
      <Metric icon={<Database size={19} />} label="Verified FIR rows" value={Number(valueOf((system.database || {}) as ApiRecord, ['firs'], 0)).toLocaleString()} note="Current database health snapshot" />
      <Metric icon={<ShieldCheck size={19} />} label="Catalyst services" value={`${activeServices || valueOf(services, ['active_count'], 0)} / ${serviceRows.length || valueOf(services, ['total_count'], 0)}`} note="Reported by the Catalyst service registry" />
      <Metric icon={<FileClock size={19} />} label="Audit events" value={audit.length} note={`${alerts.length} security signals in current scope`} />
    </div>
    <div className="admin-overview-grid">
      <section style={card}>
        <h2 className="admin-section-title">Role distribution</h2><p className="admin-section-copy">Current accounts returned by the user registry</p>
        <div style={{ height: 250 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={roleChart} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="role" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} /><Tooltip contentStyle={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} /><Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
      </section>
      <section style={card}>
        <h2 className="admin-section-title">Priority security signals</h2>
        <div style={{ display: 'grid', gap: '0.55rem', marginTop: '0.8rem' }}>{alerts.slice(0, 5).map((alert: SecurityAlert) => <div key={alert.id} style={{ padding: '0.7rem', border: `1px solid ${alert.severity === 'CRITICAL' ? 'var(--critical)' : 'var(--warning)'}`, borderRadius: 'var(--radius-md)' }}><div style={{ fontWeight: 800, fontSize: '0.75rem', color: 'var(--text-primary)' }}>{alert.alertType.replaceAll('_', ' ')}</div><div style={{ marginTop: '0.18rem', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{alert.description}</div></div>)}{!alerts.length && <div className="admin-empty">No security alert is active in the authenticated scope.</div>}</div>
      </section>
    </div>
  </>;

  const userTable = <section style={card}>
    <div className="admin-section-heading"><div><h2 className="admin-section-title">Identity and role registry</h2><p className="admin-section-copy">Create accounts, change roles, and suspend access through the authenticated administration API.</p></div><div className="admin-inline-actions"><button className="btn btn-secondary" onClick={onOpenChatDrawer}><ShieldCheck size={15} /> Review with assistant</button><button className="btn btn-primary" onClick={() => setUserEditor({ username: '', password: '', role: 'Investigator', active: true, isNew: true })}><UserPlus size={15} /> Add user</button></div></div>
    <div className="admin-table-wrap"><table className="admin-data-table"><thead><tr>{['Username', 'Role', 'Status', 'Last activity', 'Actions'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{filteredUsers.map((user, index) => { const username=String(valueOf(user, ['username', 'user_id', 'id'], index)); const role=String(valueOf(user, ['role', 'user_role'], 'Investigator')); const active=Boolean(valueOf(user, ['active', 'is_active'], true)); return <tr key={username}><td><strong>{username}</strong></td><td>{role}</td><td><span className={`admin-state-chip ${active ? 'is-active' : 'is-disabled'}`}>{active ? 'Active' : 'Disabled'}</span></td><td>{String(valueOf(user, ['last_login', 'updated_at'], 'No session activity'))}</td><td><div className="admin-inline-actions"><button className="btn btn-secondary" onClick={() => setUserEditor({ username, password: '', role, active, isNew: false })}><Edit3 size={14}/> Edit</button><button className="btn btn-secondary" onClick={() => void apiClient.updateUser(username,{active:!active}).then(refresh).catch(reason=>setError(reason.message))}>{active ? 'Disable' : 'Enable'}</button><button className="btn btn-danger" onClick={() => void removeUser(username)}><Trash2 size={14}/>{pendingDelete===username?'Confirm':'Delete'}</button></div></td></tr>; })}</tbody></table></div>
  </section>;

  const auditList = <section style={card}>
    <h2 className="admin-section-title">Immutable activity trail</h2><p className="admin-section-copy">Authentication, report, configuration and case actions from the audit API.</p>
    <div className="admin-overview-grid"><div className="admin-audit-list">{filteredAudit.slice(0, 100).map((event, index) => <button className="admin-audit-row" onClick={() => setAuditDetail(event)} key={String(valueOf(event, ['id', 'audit_id'], index))}><span>{String(valueOf(event, ['timestamp', 'created_at'], 'Timestamp unavailable'))}</span><strong>{String(valueOf(event, ['actor', 'username'], 'System'))}</strong><span>{String(valueOf(event, ['action', 'event_type'], 'AUDIT_EVENT'))}</span><span>{String(valueOf(event, ['target_resource', 'resource', 'detail'], 'Governance record'))}</span></button>)}</div><div style={{...card,height:320}}><ResponsiveContainer width="100%" height="100%"><BarChart data={auditActionChart}><CartesianGrid stroke="var(--border)" vertical={false}/><XAxis dataKey="action"/><YAxis allowDecimals={false}/><Tooltip/><Bar dataKey="count" fill="var(--info)" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div></div>
  </section>;

  const serviceGrid = <div className="admin-service-grid">{serviceRows.map((service, index) => { const status = String(valueOf(service, ['status', 'state'], 'reported')); return <section key={String(valueOf(service, ['name', 'service'], index))} style={card}><div className="admin-service-title"><strong>{String(valueOf(service, ['name', 'service'], `Catalyst service ${index + 1}`))}</strong>{status.match(/active|live|ready|enabled|configured/i) ? <CheckCircle2 size={17} color="var(--success)" /> : <AlertTriangle size={17} color="var(--warning)" />}</div><div className="admin-service-state">{status}</div><div className="admin-section-copy">{String(valueOf(service, ['detail', 'description', 'mode'], 'State reported by the backend service registry.'))}</div></section>; })}{!serviceRows.length && <section style={card}>Catalyst service detail is unavailable. The backend returned no service records.</section>}</div>;

  const aiUsage = (() => { const usageByAction=Object.entries(aiEvents.reduce<Record<string,number>>((acc,event)=>{const key=String(valueOf(event,['action','event_type'],'AI_REQUEST'));acc[key]=(acc[key]||0)+1;return acc;},{})).map(([action,count])=>({action,count})); return <><div className="admin-health-grid"><Metric icon={<Cpu size={19} />} label="AI audit events" value={aiEvents.length} note="Observed AI, chat, translation and voice actions" /><Metric icon={<Activity size={19} />} label="Last AI activity" value={String(valueOf(aiEvents[0] || {}, ['timestamp','created_at'], 'No audited call'))} note="Most recent role-authenticated model action" /><Metric icon={<ShieldCheck size={19} />} label="Guardrail mode" value="Verified data only" note="Entity checks precede model context" /></div><section style={{...card,minHeight:320}}>{usageByAction.length ? <ResponsiveContainer width="100%" height={300}><BarChart data={usageByAction}><CartesianGrid stroke="var(--border)" vertical={false}/><XAxis dataKey="action"/><YAxis allowDecimals={false}/><Tooltip/><Bar dataKey="count" fill="var(--accent)" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer> : <div className="admin-empty">No AI activity is present in the current audit window. Use the role assistants, then refresh this view to inspect usage.</div>}</section></>; })();

  return <div className="admin-command-center">
    <header className="admin-header-banner"><div className="admin-header-title"><div className="admin-header-badge"><ShieldCheck size={22} /></div><div className="admin-header-text"><h1>Platform Governance</h1><p>Authenticated users, audit integrity and Catalyst runtime health</p></div></div><div className="admin-header-status-group"><span className={`admin-status-pill ${error ? '' : 'admin-status-pill--success'}`}><span className="admin-live-dot" /> {loading ? 'Checking backend' : error ? 'Partial data' : 'Backend connected'}</span><button style={actionButton} onClick={() => void refresh()} disabled={loading}><RefreshCw size={14} /> {loading ? 'Refreshing' : 'Refresh'}</button></div></header>
    {error && <div role="alert" style={{ ...card, borderColor: 'var(--critical)', color: 'var(--critical)' }}>{error}</div>}{message && <div role="status" style={{ ...card, borderColor: 'var(--success)', color: 'var(--success)' }}>{message}</div>}
    {(view === 'User Management' || view === 'Security Audit') && <label className="admin-search"><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={`Search ${view.toLowerCase()}`} /></label>}
    {view === 'Overview' && overview}{view === 'User Management' && userTable}{view === 'Security Audit' && auditList}{view === 'System Health' && serviceGrid}{view === 'AI Usage' && aiUsage}
    {userEditor && <div className="admin-dialog-backdrop" onMouseDown={() => setUserEditor(null)}><section className="admin-dialog" role="dialog" aria-modal="true" aria-label={userEditor.isNew?'Add user':'Edit user'} onMouseDown={event=>event.stopPropagation()}><header><div><h2>{userEditor.isNew?'Add system user':'Edit system user'}</h2><p>{userEditor.isNew?'Create a role-bound account.':'Update role or access status.'}</p></div><button className="btn btn-icon" onClick={()=>setUserEditor(null)} aria-label="Close user editor"><X size={17}/></button></header><label>Username<input disabled={!userEditor.isNew} value={userEditor.username} onChange={event=>setUserEditor({...userEditor,username:event.target.value})}/></label>{userEditor.isNew&&<label>Temporary password<input type="password" value={userEditor.password} onChange={event=>setUserEditor({...userEditor,password:event.target.value})}/></label>}<label>Role<select value={userEditor.role} onChange={event=>setUserEditor({...userEditor,role:event.target.value})}>{['Administrator','Investigator','Analyst','Supervisor','Policymaker'].map(role=><option key={role}>{role}</option>)}</select></label>{!userEditor.isNew&&<label className="admin-check"><input type="checkbox" checked={userEditor.active} onChange={event=>setUserEditor({...userEditor,active:event.target.checked})}/>Account active</label>}<footer><button className="btn btn-secondary" onClick={()=>setUserEditor(null)}>Cancel</button><button className="btn btn-primary" disabled={loading||!userEditor.username||userEditor.isNew&&!userEditor.password} onClick={()=>void saveUser()}><Save size={15}/> Save user</button></footer></section></div>}
    {auditDetail && <div className="admin-dialog-backdrop" onMouseDown={()=>setAuditDetail(null)}><section className="admin-dialog" role="dialog" aria-modal="true" aria-label="Audit event detail" onMouseDown={event=>event.stopPropagation()}><header><div><h2>{String(valueOf(auditDetail,['action','event_type'],'Audit event'))}</h2><p>{String(valueOf(auditDetail,['timestamp','created_at'],'Timestamp unavailable'))}</p></div><button className="btn btn-icon" onClick={()=>setAuditDetail(null)} aria-label="Close audit detail"><X size={17}/></button></header><dl className="admin-detail-list">{Object.entries(auditDetail).map(([key,value])=><div key={key}><dt>{key.replaceAll('_',' ')}</dt><dd>{typeof value==='object'?JSON.stringify(value):String(value)}</dd></div>)}</dl></section></div>}
    <style>{`.admin-inline-actions{display:flex;align-items:center;gap:.4rem;flex-wrap:wrap}.admin-state-chip{display:inline-flex;padding:.25rem .45rem;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:.68rem;font-weight:800}.admin-state-chip.is-active{color:var(--success);background:var(--success-bg)}.admin-state-chip.is-disabled{color:var(--critical);background:var(--critical-bg)}.admin-audit-row{width:100%;text-align:left;color:var(--text-secondary);background:var(--surface-muted)}.admin-dialog-backdrop{position:fixed;inset:0;z-index:700;background:rgba(4,14,29,.72);display:grid;place-items:center;padding:1rem}.admin-dialog{width:min(560px,100%);max-height:90vh;overflow:auto;display:grid;gap:1rem;padding:1rem;background:var(--surface-elevated);border:1px solid var(--border);border-radius:var(--radius-lg);box-shadow:var(--shadow-lg)}.admin-dialog header,.admin-dialog footer{display:flex;align-items:center;justify-content:space-between;gap:1rem}.admin-dialog h2{margin:0;font-size:1.05rem}.admin-dialog p{margin:.2rem 0 0;color:var(--text-muted)}.admin-dialog label{display:grid;gap:.35rem;color:var(--text-secondary);font-size:.75rem;font-weight:750}.admin-dialog input,.admin-dialog select{width:100%;padding:.65rem;border:1px solid var(--border);border-radius:var(--radius-md);background:var(--surface-muted);color:var(--text-primary)}.admin-check{display:flex!important;grid-template-columns:auto 1fr;align-items:center}.admin-check input{width:auto}.admin-detail-list{display:grid;gap:.55rem}.admin-detail-list>div{padding:.7rem;border:1px solid var(--border);background:var(--surface-muted);border-radius:var(--radius-md)}.admin-detail-list dt{font-size:.66rem;text-transform:uppercase;color:var(--text-muted)}.admin-detail-list dd{margin:.2rem 0 0;overflow-wrap:anywhere;color:var(--text-primary)}`}</style>
  </div>;
};
