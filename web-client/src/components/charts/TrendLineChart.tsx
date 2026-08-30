import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine
} from 'recharts';
import { MOCK_CRIME_TRENDS } from '../../mock/mockAnalytics';
import { Sparkles, LineChart as ChartIcon, Info } from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';

interface TrendLineChartProps {
  onExplainChart?: () => void;
}

export const TrendLineChart: React.FC<TrendLineChartProps> = ({ onExplainChart }) => {
  const { isLive } = useSimulation();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  return (
    <div style={{
      backgroundColor: 'var(--surface-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '1.25rem',
      boxShadow: 'var(--shadow-sm)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <ChartIcon size={18} color="var(--accent)" />
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Statewide Crime Trend Observatory (2026 Multi-Series Time-Series)
            </h3>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Advanced composed time-series telemetry across primary crime vectors in Karnataka
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {isLive && (
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              color: 'var(--success)',
              backgroundColor: 'var(--success-bg)',
              padding: '0.2rem 0.55rem',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--success)' }} />
              Live Telemetry Active
            </span>
          )}

          {onExplainChart && (
            <button
              onClick={onExplainChart}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.75rem',
                backgroundColor: 'var(--surface-muted)',
                color: 'var(--accent)',
                border: '1px solid var(--border-accent)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <Sparkles size={13} />
              <span>Explain Analytical Change</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
        {(['ALL', 'Cybercrime', 'Property Theft', 'Financial Fraud', 'Violent Crime'] as const).map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={{
              padding: '0.3rem 0.65rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              backgroundColor: selectedCategory === cat ? 'var(--accent)' : 'var(--surface-muted)',
              color: selectedCategory === cat ? '#ffffff' : 'var(--text-muted)',
              fontSize: '0.72rem',
              fontWeight: 750,
              cursor: 'pointer',
              transition: 'all 150ms ease'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Recharts Composed Multi-Series Container */}
      <div style={{ width: '100%', height: 310 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={MOCK_CRIME_TRENDS} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="gradCyber" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.45} />
                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
            <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
            <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />

            {/* Threshold Line */}
            <ReferenceLine y={450} stroke="var(--critical)" strokeDasharray="4 4" label={{ value: 'CRITICAL SPIKE THRESHOLD', fill: 'var(--critical)', fontSize: 10 }} />

            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="admin-tooltip-advanced">
                      <div className="admin-tooltip-header">
                        <span>PERIOD: {data.date}</span>
                        <span>SPATIAL OBSERVATORY</span>
                      </div>
                      <div className="admin-tooltip-row">
                        <span><span className="admin-tooltip-dot" style={{ background: 'var(--accent)' }} />Cybercrime:</span>
                        <strong>{data.cybercrime} cases</strong>
                      </div>
                      <div className="admin-tooltip-row">
                        <span><span className="admin-tooltip-dot" style={{ background: '#3b82f6' }} />Property Theft:</span>
                        <strong>{data.propertyTheft} cases</strong>
                      </div>
                      <div className="admin-tooltip-row">
                        <span><span className="admin-tooltip-dot" style={{ background: '#f59e0b' }} />Financial Fraud:</span>
                        <strong>{data.financialFraud} cases</strong>
                      </div>
                      <div className="admin-tooltip-row">
                        <span><span className="admin-tooltip-dot" style={{ background: '#ef4444' }} />Violent Crime:</span>
                        <strong>{data.violentCrime} cases</strong>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend wrapperStyle={{ fontSize: '0.78rem', paddingTop: '8px' }} />

            {(selectedCategory === 'ALL' || selectedCategory === 'Cybercrime') && (
              <Area type="monotone" dataKey="cybercrime" name="Cybercrime Vector" stroke="var(--accent)" strokeWidth={2.5} fillOpacity={1} fill="url(#gradCyber)" />
            )}
            {(selectedCategory === 'ALL' || selectedCategory === 'Property Theft') && (
              <Line type="monotone" dataKey="propertyTheft" name="Property Theft" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
            )}
            {(selectedCategory === 'ALL' || selectedCategory === 'Financial Fraud') && (
              <Bar dataKey="financialFraud" name="Financial Fraud" fill="#f59e0b" opacity={0.5} radius={[4, 4, 0, 0]} />
            )}
            {(selectedCategory === 'ALL' || selectedCategory === 'Violent Crime') && (
              <Line type="monotone" dataKey="violentCrime" name="Violent Crime" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4, fill: '#ef4444' }} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div style={{ marginTop: '0.75rem', fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        <Info size={13} color="var(--accent)" />
        <span>Click "Explain Analytical Change" for AI synthesis of the August 2026 cybercrime time-series anomaly.</span>
      </div>
    </div>
  );
};
