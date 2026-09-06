import React, { useMemo, useState } from 'react';
import { CircleDollarSign, FileSearch, Network } from '../common/icons';
import { dataService } from '../../services/mockDataService';
import type { CaseRecord } from '../../types/crime';
import { CaseDetailView } from '../detail/CaseDetailView';
import { EvidenceDrilldown } from '../common/EvidenceDrilldown';
import {
  caseComplexityLabel,
  classifyLinkedCaseComplexity,
  type CaseComplexity,
  type CaseComplexityFilter,
} from '../../utils/caseComplexity';

type Row = Record<string, unknown>;
type FinancialCluster = {
  row: Row;
  complexity: CaseComplexity;
  key: string;
};
const text = (value: unknown) => String(value ?? '');
const number = (value: unknown) => Number(value || 0);

export const InvestigatorFinancialLeads: React.FC<{ onOpenChat?: (prompt?: string) => void; complexityFilter: CaseComplexityFilter }> = ({ onOpenChat, complexityFilter }) => {
  const payload = dataService.getFinancial() as Row;
  const summary = (payload.summary || {}) as Row;
  const rawClusters = useMemo(() => (Array.isArray(payload.clusters) ? payload.clusters : []) as Row[], [payload.clusters]);
  const cases = dataService.getAllCases();
  const [selectedCluster, setSelectedCluster] = useState<Row | null>(null);
  const [selectedCase, setSelectedCase] = useState<CaseRecord | null>(null);

  const clusters = useMemo<FinancialCluster[]>(() => rawClusters.map((row, index) => ({
    row,
    complexity: classifyLinkedCaseComplexity(number(row.case_count)),
    key: text(row.account || row.offender_id || index),
  })), [rawClusters]);

  const scopedClusters = useMemo(() => clusters
    .filter(cluster => complexityFilter === 'ALL' || cluster.complexity === complexityFilter)
    .sort((left, right) => number(right.row.link_score) - number(left.row.link_score)), [clusters, complexityFilter]);

  const scopedCaseCount = useMemo(
    () => scopedClusters.reduce((total, cluster) => total + number(cluster.row.case_count), 0),
    [scopedClusters],
  );

  const clusterCases = useMemo(() => {
    if (!selectedCluster) return [];
    const identifiers = Array.isArray(selectedCluster.evidence) ? selectedCluster.evidence.map(text) : [];
    const offenderId = text(selectedCluster.offender_id);
    return cases.filter(record =>
      identifiers.some(identifier => identifier.includes(record.firNumber))
      || record.accused.some(accused => accused.id === offenderId));
  }, [cases, selectedCluster]);

  return (
    <section className="investigator-financial">
      <header>
        <div>
          <CircleDollarSign size={24} />
          <div>
            <h1>Case-scoped financial leads</h1>
            <p>{text(summary.evidence_basis)}</p>
          </div>
        </div>
        <button className="btn btn-secondary" onClick={() => onOpenChat?.(`Review the ${caseComplexityLabel(complexityFilter)} financial-leads view. Explain the strongest money-trail clusters, linked FIR evidence, and the next investigator action.`)}>
          <FileSearch size={15} /> Ask about financial evidence
        </button>
      </header>

      <div className="financial-metrics">
        <div><b>{scopedCaseCount}</b><span>linked FIRs in scope</span></div>
        <div><b>{scopedClusters.length}</b><span>financial clusters in scope</span></div>
        <div><b>{text(summary.data_source)}</b><span>authoritative evidence source</span></div>
      </div>

      <div className="financial-scope-reading" role="status">
        <strong>{caseComplexityLabel(complexityFilter)}</strong>
        <span>
          {complexityFilter === 'SHORT' && 'Direct account-to-FIR relationships are prioritized.'}
          {complexityFilter === 'MEDIUM' && 'Supporting transactions and counterparties are shown together.'}
          {complexityFilter === 'LONG' && 'Highest-risk multi-case clusters lead; open a cluster for FIR-level evidence.'}
          {complexityFilter === 'ALL' && 'All verified financial clusters are ranked by link score.'}
        </span>
      </div>

      <div className="financial-lead-grid">
        {scopedClusters.map(({ row, complexity, key }) => {
          const evidence = Array.isArray(row.evidence) ? row.evidence.map(text) : [];
          const evidenceLimit = complexity === 'SHORT' ? 1 : complexity === 'MEDIUM' ? 4 : 3;
          return (
            <article key={key} data-complexity={complexity.toLowerCase()}>
              <div>
                <Network size={17} />
                <strong>{text(row.account || row.offender_name || row.offender_id)}</strong>
                <span>{number(row.link_score)}/100</span>
              </div>
              <span className={`case-complexity-badge case-complexity-badge--${complexity.toLowerCase()}`}>
                {caseComplexityLabel(complexity)}
              </span>
              <p>
                {number(row.case_count)} linked FIRs · {number(row.transaction_count)} transactions · {number(row.counterparty_count)} counterparties
              </p>
              <div className="financial-evidence-list">
                {evidence.slice(0, evidenceLimit).map(identifier => <small key={identifier}>{identifier}</small>)}
                {evidence.length > evidenceLimit && <small>+{evidence.length - evidenceLimit} more verified references</small>}
                {!evidence.length && <small>No linked identifiers were returned.</small>}
              </div>
              <div className="financial-action">{text(row.recommended_action)}</div>
              <button className="btn btn-primary" onClick={() => setSelectedCluster(row)}>Inspect linked FIRs</button>
            </article>
          );
        })}
      </div>

      {!scopedClusters.length && <div className="financial-empty">No verified financial clusters match this complexity.</div>}

      {selectedCluster && (
        <EvidenceDrilldown
          title={`Financial trail: ${text(selectedCluster.account || selectedCluster.offender_name || selectedCluster.offender_id)}`}
          records={clusterCases}
          onClose={() => setSelectedCluster(null)}
          onOpenCase={setSelectedCase}
        />
      )}
      {selectedCase && <CaseDetailView caseRecord={selectedCase} onClose={() => setSelectedCase(null)} />}

      <style>{`
        .investigator-financial{display:grid;gap:1rem}
        .investigator-financial>header{display:flex;justify-content:space-between;align-items:center;gap:1rem;padding:1rem;border:1px solid var(--border);background:var(--surface-card);border-radius:var(--radius-lg)}
        .investigator-financial>header>div{display:flex;gap:.7rem;align-items:flex-start}
        .investigator-financial h1{margin:0;font-size:1.05rem;text-wrap:balance}
        .investigator-financial p{margin:.2rem 0;color:var(--text-muted);line-height:1.4;text-wrap:pretty}
        .financial-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.75rem}
        .financial-metrics>div{display:grid;gap:.25rem;padding:1rem;background:var(--surface-card);border:1px solid var(--border);border-radius:var(--radius-lg)}
        .financial-metrics b{font-size:1.25rem;overflow-wrap:anywhere;font-variant-numeric:tabular-nums}
        .financial-metrics span,.financial-lead-grid small{color:var(--text-muted);font-size:.72rem}
        .financial-scope-reading{display:flex;align-items:center;gap:.65rem;padding:.7rem .85rem;border-left:3px solid var(--info);background:var(--surface-muted);border-radius:var(--radius-sm)}
        .financial-scope-reading strong{color:var(--text-primary);white-space:nowrap}
        .financial-scope-reading span{color:var(--text-secondary);font-size:.78rem}
        .financial-lead-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:.75rem}
        .financial-lead-grid article{display:grid;align-content:start;gap:.6rem;padding:1rem;background:var(--surface-card);border:1px solid var(--border);border-left:3px solid var(--success);border-radius:var(--radius-lg)}
        .financial-lead-grid article[data-complexity="medium"]{border-left-color:var(--warning)}
        .financial-lead-grid article[data-complexity="long"]{border-left-color:var(--critical)}
        .financial-lead-grid article>div:first-child{display:grid;grid-template-columns:auto 1fr auto;gap:.5rem;align-items:center}
        .financial-lead-grid article>div:first-child>span{font-variant-numeric:tabular-nums}
        .financial-evidence-list{display:grid;gap:.25rem;padding:.55rem;border:1px solid var(--border-subtle);border-radius:var(--radius-sm);background:var(--surface-muted)}
        .financial-evidence-list small{overflow-wrap:anywhere}
        .financial-action{font-size:.75rem;color:var(--info);font-weight:700;text-wrap:pretty}
        .financial-lead-grid p{margin:0;font-size:.8rem}
        .financial-empty{padding:2rem;text-align:center;border:1px dashed var(--border);color:var(--text-muted)}
        @media(max-width:700px){.investigator-financial>header{align-items:flex-start;flex-direction:column}.financial-metrics{grid-template-columns:1fr}.financial-scope-reading{align-items:flex-start;flex-direction:column}.financial-lead-grid{grid-template-columns:minmax(0,1fr)}}
      `}</style>
    </section>
  );
};
