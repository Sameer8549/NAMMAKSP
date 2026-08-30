import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  changeText?: string;
  trend?: 'UP' | 'DOWN' | 'NEUTRAL';
  isCritical?: boolean;
  subValue?: string;
  badge?: string;
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  changeText,
  trend = 'NEUTRAL',
  isCritical = false,
  subValue,
  badge,
  onClick
}) => {
  const getTrendIcon = () => {
    if (trend === 'UP') return <ArrowUpRight size={14} color="var(--critical)" />;
    if (trend === 'DOWN') return <ArrowDownRight size={14} color="var(--success)" />;
    return <Minus size={14} color="var(--text-muted)" />;
  };

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: 'var(--surface-card)',
        border: isCritical ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.1rem 1.25rem',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: 'var(--shadow-sm)',
        transition: 'var(--transition-fast)',
        position: 'relative'
      }}
    >
      {badge && (
        <span style={{
          position: 'absolute',
          top: '0.85rem',
          right: '0.85rem',
          fontSize: '0.65rem',
          fontWeight: 700,
          padding: '0.15rem 0.45rem',
          backgroundColor: isCritical ? 'var(--critical-bg)' : 'var(--surface-muted)',
          color: isCritical ? 'var(--critical)' : 'var(--text-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)'
        }}>
          {badge}
        </span>
      )}

      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.35rem' }}>
        {label}
      </p>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem' }}>
        <span style={{
          fontSize: '1.65rem',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          color: isCritical ? 'var(--critical)' : 'var(--text-primary)',
          fontFamily: 'var(--font-mono)'
        }}>
          {value}
        </span>

        {changeText && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem', fontWeight: 600 }}>
            {getTrendIcon()}
            <span style={{
              color: trend === 'UP' ? 'var(--critical)' : trend === 'DOWN' ? 'var(--success)' : 'var(--text-muted)'
            }}>
              {changeText}
            </span>
          </div>
        )}
      </div>

      {subValue && (
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
          {subValue}
        </p>
      )}
    </div>
  );
};
