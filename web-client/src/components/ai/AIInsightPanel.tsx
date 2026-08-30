import React, { useState } from 'react';
import { useRole } from '../../context/RoleContext';
import { dataService } from '../../services/mockDataService';
import { FileText, ChevronRight, Info } from 'lucide-react';

interface AIInsightPanelProps {
  onOpenExplainModal?: () => void;
  onOpenChatDrawer?: () => void;
}

export const AIInsightPanel: React.FC<AIInsightPanelProps> = ({
  onOpenExplainModal,
  onOpenChatDrawer
}) => {
  const { activeRole } = useRole();
  const insight = dataService.getAIInsightForRole(activeRole);
  const [showEvidence, setShowEvidence] = useState(false);

  return (
    <div style={{
      backgroundColor: 'var(--surface-card)',
      border: '1px solid var(--border-accent)',
      borderRadius: 'var(--radius-lg)',
      padding: '1.25rem 1.5rem',
      marginBottom: '1.5rem',
      position: 'relative',
      boxShadow: 'var(--shadow-md)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--accent)' }}>•</span>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              NAMMA KSP — KEY SYSTEM SUMMARY
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
              ({insight.timestamp})
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--success)',
            backgroundColor: 'var(--success-bg)',
            padding: '0.2rem 0.6rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid rgba(16, 185, 129, 0.3)'
          }}>
            Confidence: {insight.confidenceScore}%
          </span>
        </div>
      </div>

      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem', lineHeight: 1.3 }}>
        {insight.headline}
      </h3>
      <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1rem' }}>
        {insight.body}
      </p>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        paddingTop: '0.75rem',
        borderTop: '1px solid var(--border-subtle)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => setShowEvidence(!showEvidence)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.78rem',
              fontWeight: 600,
              color: 'var(--accent)',
              backgroundColor: 'var(--surface-muted)',
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)'
            }}
          >
            <FileText size={14} />
            <span>{showEvidence ? 'Hide Supporting Evidence' : `View Supporting Evidence (${insight.evidence.length})`}</span>
          </button>

          {onOpenExplainModal && (
            <button
              onClick={onOpenExplainModal}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.78rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                backgroundColor: 'var(--surface-hover)',
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)'
              }}
            >
              <Info size={14} />
              <span>Explain Analytical Basis</span>
            </button>
          )}
        </div>

        {onOpenChatDrawer && (
          <button
            onClick={onOpenChatDrawer}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: 'var(--text-inverse)',
              backgroundColor: 'var(--accent)',
              padding: '0.45rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              border: 'none'
            }}
          >
            <span>Open Assistant</span>
            <ChevronRight size={14} />
          </button>
        )}
      </div>

      {showEvidence && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          backgroundColor: 'var(--surface-muted)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)'
        }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Supporting Records & Signatures
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {insight.evidence.map(ev => (
              <div key={ev.id} style={{
                padding: '0.6rem 0.75rem',
                backgroundColor: 'var(--surface-card)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.78rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                  <strong style={{ color: 'var(--accent)' }}>{ev.title} ({ev.referenceCode})</strong>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{ev.timestamp}</span>
                </div>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                  "{ev.snippet}"
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{
        marginTop: '0.85rem',
        fontSize: '0.7rem',
        color: 'var(--text-muted)',
        fontStyle: 'italic',
        lineHeight: 1.3,
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem'
      }}>
        <Info size={12} color="var(--text-muted)" style={{ flexShrink: 0 }} />
        <span>{insight.disclaimer}</span>
      </div>
    </div>
  );
};
