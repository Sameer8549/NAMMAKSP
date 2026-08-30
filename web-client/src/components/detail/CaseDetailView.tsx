import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import type { CaseRecord } from '../../types/crime';
import { StatusBadge } from '../common/StatusBadge';
import { WhiteSheetModal } from '../common/WhiteSheetModal';
import { Sparkles, FileText } from 'lucide-react';

interface CaseDetailViewProps {
  caseRecord: CaseRecord | null;
  onClose: () => void;
  onOpenExplain?: () => void;
}

export const CaseDetailView: React.FC<CaseDetailViewProps> = ({
  caseRecord,
  onClose,
  onOpenExplain
}) => {
  const [isWhiteSheetOpen, setIsWhiteSheetOpen] = useState(false);

  if (!caseRecord) return null;

  return (
    <Modal
      isOpen={!!caseRecord}
      onClose={onClose}
      title={caseRecord.title}
      subtitle={`${caseRecord.firNumber} • Filed: ${caseRecord.filedDate} (${caseRecord.daysAging} days aging)`}
      width="820px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          flexWrap: 'wrap',
          padding: '0.85rem',
          backgroundColor: 'var(--surface-muted)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)'
        }}>
          <StatusBadge type="priority" value={caseRecord.priority} />
          <StatusBadge type="status" value={caseRecord.status} />

          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            Category: <strong style={{ color: 'var(--accent)' }}>{caseRecord.category}</strong>
          </span>

          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            IPC Sections: {caseRecord.ipcSections.join(', ')}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
          <div>
            <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              Case Synopsis
            </h4>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {caseRecord.summary}
            </p>
          </div>

          <div style={{
            padding: '0.85rem',
            backgroundColor: 'var(--surface-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.78rem'
          }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
              Assigned Investigating Officer
            </p>
            <strong style={{ color: 'var(--text-primary)', fontSize: '0.88rem', display: 'block' }}>
              {caseRecord.assignedOfficer.name}
            </strong>
            <span style={{ color: 'var(--text-secondary)' }}>Badge: {caseRecord.assignedOfficer.badgeNumber}</span>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.2rem' }}>{caseRecord.assignedOfficer.station}</p>
          </div>
        </div>

        <div style={{
          padding: '1rem',
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--border-accent)',
          borderRadius: 'var(--radius-md)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
            <Sparkles size={16} color="var(--accent)" />
            <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--accent)' }}>
              Modus Operandi Signature Analysis
            </h4>
          </div>

          <p style={{ fontSize: '0.82rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            <strong>Primary Technique:</strong> {caseRecord.modusOperandi.primaryMethod}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
            <div><strong>Tools Identified:</strong> {caseRecord.modusOperandi.toolsUsed.join(', ')}</div>
            <div><strong>Time Window:</strong> {caseRecord.modusOperandi.timeWindow}</div>
            <div><strong>Target Profile:</strong> {caseRecord.modusOperandi.targetProfile}</div>
            <div><strong>Unique Signature:</strong> {caseRecord.modusOperandi.uniqueSignature}</div>
          </div>
        </div>

        <div>
          <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Accused & Suspect Profiles ({caseRecord.accused.length})
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
            {caseRecord.accused.map(acc => (
              <div key={acc.id} style={{
                padding: '0.75rem',
                backgroundColor: 'var(--surface-muted)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.78rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                  <strong style={{ color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                    {acc.name} {acc.alias ? `("${acc.alias}")` : ''}
                  </strong>
                  <span className="badge badge-critical">Risk Score: {acc.riskScore}</span>
                </div>
                <p style={{ color: 'var(--text-muted)' }}>Status: {acc.status} • Prior Offenses: {acc.priorOffensesCount}</p>
                {acc.knownSyndicateAffiliation && (
                  <p style={{ color: 'var(--accent)', fontWeight: 600, marginTop: '0.2rem' }}>
                    Syndicate: {acc.knownSyndicateAffiliation}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Investigation Activity Timeline
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {caseRecord.timeline.map(tl => (
              <div key={tl.id} style={{
                padding: '0.65rem 0.85rem',
                backgroundColor: 'var(--surface-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem'
              }}>
                <div style={{
                  padding: '0.2rem 0.5rem',
                  backgroundColor: 'var(--surface-muted)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-muted)',
                  fontSize: '0.7rem',
                  whiteSpace: 'nowrap'
                }}>
                  {tl.timestamp}
                </div>
                <div>
                  <strong style={{ color: 'var(--text-primary)', display: 'block' }}>
                    {tl.title}
                  </strong>
                  <p style={{ color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{tl.description}</p>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Actor: {tl.actor}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem' }}>
          <button
            onClick={() => setIsWhiteSheetOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1rem',
              backgroundColor: 'var(--accent-light)',
              color: 'var(--accent-muted)',
              border: '1px solid var(--border-accent)',
              borderRadius: 'var(--radius-md)',
              fontWeight: 800,
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            <FileText size={15} />
            <span>Download Case White Sheet</span>
          </button>

          {onOpenExplain && (
            <button
              onClick={onOpenExplain}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.55rem 1rem',
                backgroundColor: 'var(--surface-hover)',
                color: 'var(--accent)',
                border: '1px solid var(--border-accent)',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                fontSize: '0.8rem'
              }}
            >
              <Sparkles size={14} />
              <span>Search MO Pattern Matches</span>
            </button>
          )}

          <button
            onClick={onClose}
            style={{
              padding: '0.55rem 1.1rem',
              backgroundColor: 'var(--accent)',
              color: 'var(--text-inverse)',
              borderRadius: 'var(--radius-md)',
              fontWeight: 700,
              fontSize: '0.82rem',
              border: 'none'
            }}
          >
            Close Record
          </button>
        </div>

      </div>

      <WhiteSheetModal
        isOpen={isWhiteSheetOpen}
        onClose={() => setIsWhiteSheetOpen(false)}
        caseRecord={caseRecord}
      />
    </Modal>
  );
};
