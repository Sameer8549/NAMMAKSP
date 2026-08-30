import React, { useMemo, useState } from 'react';
import { ArrowRight, BarChart3, Database, X } from 'lucide-react';
import type { CaseRecord } from '../../types/crime';
import { EvidenceDrilldown } from './EvidenceDrilldown';

export interface DrilldownMetric { label: string; value: string | number; note?: string; }
export interface DrilldownBreakdown { label: string; value: number; color?: string; }

export const AnalyticsDrilldown: React.FC<{
  title: string;
  subtitle: string;
  metrics: DrilldownMetric[];
  breakdown: DrilldownBreakdown[];
  records: CaseRecord[];
  onClose: () => void;
  onOpenCase: (record: CaseRecord) => void;
}> = ({ title, subtitle, metrics, breakdown, records, onClose, onOpenCase }) => {
  const [showEvidence, setShowEvidence] = useState(false);
  const maximum = useMemo(() => Math.max(1, ...breakdown.map(item => item.value)), [breakdown]);

  if (showEvidence) return <EvidenceDrilldown title={`${title} supporting records`} records={records} onClose={() => setShowEvidence(false)} onOpenCase={onOpenCase}/>;

  return <div className="analytics-drilldown-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="analytics-drilldown" role="dialog" aria-modal="true" aria-label={title} onMouseDown={event => event.stopPropagation()}>
      <header><div><span className="analytics-drilldown-eyebrow"><BarChart3 size={14}/> Analytical drilldown</span><h2>{title}</h2><p>{subtitle}</p></div><button className="btn btn-icon" onClick={onClose} aria-label="Close analysis"><X size={18}/></button></header>
      <div className="analytics-drilldown-metrics">{metrics.map(metric => <article key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong>{metric.note && <small>{metric.note}</small>}</article>)}</div>
      <section className="analytics-breakdown"><div><h3>Composition</h3><span>Selected scope, ranked by verified volume</span></div>{breakdown.length ? <div className="analytics-breakdown-list">{breakdown.slice(0, 10).map((item, index) => <button key={`${item.label}-${index}`} onClick={() => setShowEvidence(true)}><span>{item.label}</span><i><b style={{ width: `${Math.max(4, item.value / maximum * 100)}%`, background: item.color || 'var(--info)' }}/></i><strong>{item.value}</strong></button>)}</div> : <p className="analytics-empty">No secondary dimension is available for this selection.</p>}</section>
      <footer><div><Database size={15}/><span>{records.length.toLocaleString()} verified records support this analysis</span></div><button className="btn btn-primary" onClick={() => setShowEvidence(true)} disabled={!records.length}>Inspect supporting records <ArrowRight size={15}/></button></footer>
    </section>
  </div>;
};
