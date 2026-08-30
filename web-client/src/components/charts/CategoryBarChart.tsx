import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { MOCK_CATEGORY_BREAKDOWN } from '../../mock/mockAnalytics';
import { BarChart3 } from 'lucide-react';

export const CategoryBarChart: React.FC = () => {
  return (
    <div style={{
      backgroundColor: 'var(--surface-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '1.25rem',
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
        <BarChart3 size={18} color="var(--accent)" />
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Crime Breakdown by Primary Category
          </h3>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Volume & percentage of reported cases across Karnataka
          </p>
        </div>
      </div>

      <div style={{ width: '100%', height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={MOCK_CATEGORY_BREAKDOWN} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" opacity={0.5} />
            <XAxis type="number" stroke="var(--text-muted)" fontSize={11} />
            <YAxis type="category" dataKey="category" stroke="var(--text-muted)" fontSize={11} width={100} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--chart-tooltip-bg)',
                borderColor: 'var(--border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '0.8rem'
              }}
            />
            <Bar dataKey="count" name="Reported Incidents" radius={[0, 4, 4, 0]}>
              {MOCK_CATEGORY_BREAKDOWN.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
