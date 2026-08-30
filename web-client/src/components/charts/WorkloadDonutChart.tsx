import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { MOCK_OFFICER_WORKLOADS } from '../../mock/mockSupervisor';
import { Users } from 'lucide-react';

export const WorkloadDonutChart: React.FC = () => {
  const statusData = [
    { name: 'Overloaded (>90%)', value: MOCK_OFFICER_WORKLOADS.filter(o => o.status === 'OVERLOADED').length, color: 'var(--critical)' },
    { name: 'Optimal Capacity', value: MOCK_OFFICER_WORKLOADS.filter(o => o.status === 'OPTIMAL').length, color: 'var(--success)' },
    { name: 'Under Utilized', value: MOCK_OFFICER_WORKLOADS.filter(o => o.status === 'UNDER_UTILIZED').length, color: 'var(--info)' }
  ];

  return (
    <div style={{
      backgroundColor: 'var(--surface-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '1.25rem',
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
        <Users size={18} color="var(--accent)" />
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Investigator Capacity Utilization
          </h3>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Station workload distribution status
          </p>
        </div>
      </div>

      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={statusData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={4}
              dataKey="value"
            >
              {statusData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--chart-tooltip-bg)',
                borderColor: 'var(--border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '0.8rem'
              }}
            />
            <Legend wrapperStyle={{ fontSize: '0.78rem', paddingTop: '10px' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
