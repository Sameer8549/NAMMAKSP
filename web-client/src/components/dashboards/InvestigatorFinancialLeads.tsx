import React, { useMemo, useState } from 'react';
import { CircleDollarSign, FileSearch, Network } from 'lucide-react';
import { dataService } from '../../services/mockDataService';
import type { CaseRecord } from '../../types/crime';
import { CaseDetailView } from '../detail/CaseDetailView';
import { EvidenceDrilldown } from '../common/EvidenceDrilldown';

type Row = Record<string, unknown>;
const text = (value: unknown) => String(value ?? '');
const number = (value: unknown) => Number(value || 0);

export const InvestigatorFinancialLeads: React.FC<{ onOpenChat?: () => void }> = ({ onOpenChat }) => {
  const payload = dataService.getFinancial() as Row;
  const summary = (payload.summary || {}) as Row;
  const clusters = (Array.isArray(payload.clusters) ? payload.clusters : []) as Row[];
  const cases = dataService.getAllCases();
  const [selectedCluster, setSelectedCluster] = useState<Row | null>(null);
  const [selectedCase, setSelectedCase] = useState<CaseRecord | null>(null);

  const clusterCases = useMemo(() => {
    if (!selectedCluster) return [];
    const identifiers = Array.isArray(selectedCluster.evidence) ? selectedCluster.evidence.map(text) : [];
    const offenderId = text(selectedCluster.offender_id);
    return cases.filter(record => identifiers.some(identifier => identifier.includes(record.firNumber)) || record.accused.some(accused => accused.id === offenderId));
  }, [cases, selectedCluster]);

  return <section className="investigator-financial">
    <header><div><CircleDollarSign size={24}/><div><h1>Case-scoped financial leads</h1><p>{text(summary.evidence_basis)}</p></div></div><button className="btn btn-secondary" onClick={onOpenChat}><FileSearch size={15}/> Ask about financial evidence</button></header>
    <div className="financial-metrics"><div><b>{number(summary.candidate_cases)}</b><span>candidate case records</span></div><div><b>{number(summary.suspicious_clusters)}</b><span>linked clusters</span></div><div><b>{text(summary.data_source)}</b><span>evidence source</span></div></div>
    <div className="financial-lead-grid">{clusters.map((item, index) => <article key={text(item.account || item.offender_id || index)}><div><Network size={17}/><strong>{text(item.account || item.offender_name || item.offender_id)}</strong><span>{number(item.link_score)}/100</span></div><p>{number(item.case_count)} linked FIRs · {number(item.transaction_count)} transactions · {number(item.counterparty_count)} counterparties</p><small>Evidence: {Array.isArray(item.evidence) ? item.evidence.join(', ') : 'No identifiers returned'}</small><div className="financial-action">{text(item.recommended_action)}</div><button className="btn btn-primary" onClick={() => setSelectedCluster(item)}>Inspect linked FIRs</button></article>)}</div>
    {selectedCluster && <EvidenceDrilldown title={`Financial trail: ${text(selectedCluster.account || selectedCluster.offender_name || selectedCluster.offender_id)}`} records={clusterCases} onClose={() => setSelectedCluster(null)} onOpenCase={setSelectedCase}/>} 
    {selectedCase && <CaseDetailView caseRecord={selectedCase} onClose={() => setSelectedCase(null)}/>} 
    <style>{`.investigator-financial{display:grid;gap:1rem}.investigator-financial>header{display:flex;justify-content:space-between;align-items:center;gap:1rem;padding:1rem;border:1px solid var(--border);background:var(--surface-card);border-radius:var(--radius-lg)}.investigator-financial>header>div{display:flex;gap:.7rem;align-items:flex-start}.investigator-financial h1{margin:0;font-size:1.05rem}.investigator-financial p{margin:.2rem 0;color:var(--text-muted);line-height:1.4}.financial-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.75rem}.financial-metrics>div{display:grid;gap:.25rem;padding:1rem;background:var(--surface-card);border:1px solid var(--border);border-radius:var(--radius-lg)}.financial-metrics b{font-size:1.25rem;overflow-wrap:anywhere}.financial-metrics span,.financial-lead-grid small{color:var(--text-muted);font-size:.72rem}.financial-lead-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:.75rem}.financial-lead-grid article{display:grid;gap:.6rem;padding:1rem;background:var(--surface-card);border:1px solid var(--border);border-radius:var(--radius-lg)}.financial-lead-grid article>div:first-child{display:grid;grid-template-columns:auto 1fr auto;gap:.5rem;align-items:center}.financial-action{font-size:.75rem;color:var(--info);font-weight:700}.financial-lead-grid p{margin:0;font-size:.8rem}@media(max-width:700px){.investigator-financial>header{align-items:flex-start;flex-direction:column}.financial-metrics{grid-template-columns:1fr}}`}</style>
  </section>;
};
