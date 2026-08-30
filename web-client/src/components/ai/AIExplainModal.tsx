import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { dataService } from '../../services/mockDataService';
import { toAppRole } from '../../services/apiClient';
import { Modal } from '../common/Modal';

interface AIExplainModalProps { isOpen: boolean; onClose: () => void; title?: string; contextType?: string; }

export const AIExplainModal: React.FC<AIExplainModalProps> = ({ isOpen, onClose, title, contextType }) => {
  const { language } = useLanguage();
  const isKn = language === 'kn';
  const role = toAppRole(dataService.getWorkspace()?.identity.role || 'ANALYST');
  const insight = dataService.getAIInsightForRole(role);
  const warning = ((dataService.getForecast().early_warnings || []) as Array<Record<string, unknown>>)[0];
  const evidence = insight.evidence || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose}
      title={title || (isKn ? 'ವಿಶ್ಲೇಷಣಾತ್ಮಕ ತರ್ಕ ಹಾಗೂ ಸಾಕ್ಷ್ಯ ಪರಿಶೀಲನೆ' : 'Analytical Reasoning & Evidence Verification')}
      subtitle={isKn ? 'ಪರಿಶೀಲಿಸಿದ ಮೂಲಗಳ ಆಧಾರದ ಮೇಲೆ' : 'Built from the authenticated evidence workspace'} width="720px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <section style={{ padding: '1rem', backgroundColor: 'var(--surface-muted)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <strong style={{ color: 'var(--accent)' }}>{contextType || insight.headline}</strong>
            <span className="badge badge-success">{insight.confidenceScore}% evidence confidence</span>
          </div>
          <p style={{ marginTop: '0.55rem', color: 'var(--text-primary)', lineHeight: 1.55 }}>{insight.body}</p>
        </section>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
          <section style={{ padding: '0.85rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>LEADING VERIFIED SIGNAL</span>
            <strong style={{ display: 'block', marginTop: '0.25rem' }}>{String(warning?.district || 'No active warning')}</strong>
            <span style={{ color: 'var(--text-secondary)' }}>{Number(warning?.increase_percent || 0).toFixed(1)}% measured increase</span>
          </section>
          <section style={{ padding: '0.85rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>DISCLOSURE BOUNDARY</span>
            <strong style={{ display: 'block', marginTop: '0.25rem' }}>{dataService.getWorkspace()?.identity.disclosure_mode || 'Role scoped'}</strong>
            <span style={{ color: 'var(--text-secondary)' }}>Only records available to the authenticated role are included.</span>
          </section>
        </div>
        <section>
          <h4 style={{ marginBottom: '0.55rem' }}>{isKn ? 'ಶಿಫಾರಸು ಮಾಡಿದ ಕ್ರಮಗಳು' : 'Recommended review actions'}</h4>
          <div style={{ display: 'grid', gap: '0.45rem' }}>
            {(insight.actionItems.length ? insight.actionItems : ['No automated action is currently recommended.']).map((action) => (
              <div key={action} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', color: 'var(--text-secondary)' }}>
                <CheckCircle2 size={16} color="var(--accent)" style={{ flexShrink: 0, marginTop: 2 }} /><span>{action}</span>
              </div>
            ))}
          </div>
        </section>
        <section>
          <h4 style={{ marginBottom: '0.55rem' }}>{isKn ? 'ಸಾಕ್ಷ್ಯ ಮೂಲಗಳು' : 'Evidence sources'}</h4>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {evidence.length ? evidence.map((item) => (
              <div key={item.id} style={{ padding: '0.75rem', backgroundColor: 'var(--surface-muted)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                <strong style={{ color: 'var(--accent)' }}>{item.referenceCode}</strong>
                <div style={{ marginTop: '0.2rem', color: 'var(--text-secondary)' }}>{item.title}: {item.snippet}</div>
              </div>
            )) : <p style={{ color: 'var(--text-muted)' }}>No source record was returned for this context.</p>}
          </div>
        </section>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{insight.disclaimer}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}><button className="btn btn-primary" onClick={onClose}>{isKn ? 'ಮುಚ್ಚಿ' : 'Acknowledge briefing'}</button></div>
      </div>
    </Modal>
  );
};
