import React from 'react';
import { useSimulation } from '../../context/SimulationContext';
import { useLanguage } from '../../context/LanguageContext';
import { Activity, AlertCircle } from 'lucide-react';

export const SimulationBanner: React.FC = () => {
  const { liveQueryRate, totalActiveIncidents, tickCount } = useSimulation();
  const { translations } = useLanguage();

  return (
    <div style={{
      backgroundColor: 'var(--surface-muted)',
      borderBottom: '1px solid var(--border)',
      padding: '0.4rem 1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontSize: '0.78rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.15rem 0.5rem',
          backgroundColor: 'var(--warning-bg)',
          color: 'var(--warning)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: 'var(--radius-sm)',
          fontWeight: 700,
          letterSpacing: '0.04em'
        }}>
          <AlertCircle size={12} />
          {translations.simulatedDemoMode}
        </span>
        <span style={{ color: 'var(--text-secondary)' }}>
          {translations.simulatedDemoSub}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}>
          <Activity size={14} color="var(--accent)" />
          <span>{translations.streamTicks} <strong style={{ color: 'var(--text-primary)' }}>{tickCount}</strong></span>
        </div>
        <div style={{ color: 'var(--text-muted)' }}>
          {translations.queriesPerSec} <strong style={{ color: 'var(--text-primary)' }}>{liveQueryRate}</strong>
        </div>
        <div style={{ color: 'var(--text-muted)' }}>
          {translations.incidentsStreamed} <strong style={{ color: 'var(--text-primary)' }}>{totalActiveIncidents}</strong>
        </div>
      </div>
    </div>
  );
};
