import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';
import { BarChart3, Activity } from 'lucide-react';
import { dataService } from '../../services/mockDataService';

interface HistogramBin {
  binRange: string;
  binLabel: string;
  officerCount: number;
  officers: string[];
  capacityAvg: number;
  riskStatus: 'LOW' | 'NORMAL' | 'HIGH' | 'HEAVY';
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
}

const CustomHistogramTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const bin: HistogramBin = payload[0].payload;

  return (
    <div style={{
      backgroundColor: 'var(--surface-elevated)',
      border: `1.5px solid ${bin.color}`,
      borderRadius: 'var(--radius-md)',
      padding: '0.85rem 1rem',
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.45rem',
      minWidth: '250px',
      color: 'var(--text-primary)',
      zIndex: 1000
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>{bin.binRange}</strong>
        <span className="badge" style={{ backgroundColor: `${bin.color}22`, color: bin.color, border: `1px solid ${bin.color}`, fontSize: '0.65rem' }}>
          {bin.riskStatus} STATUS
        </span>
      </div>

      <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
        Status: <strong style={{ color: 'var(--text-primary)' }}>{bin.binLabel}</strong>
      </div>

      <div style={{
        padding: '0.4rem 0.6rem',
        backgroundColor: 'var(--surface-muted)',
        borderRadius: 'var(--radius-sm)',
        fontSize: '0.74rem',
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <span>Officers in Range:</span>
        <strong style={{ color: bin.color, fontSize: '0.88rem' }}>{Math.round(bin.officerCount)} Officer(s)</strong>
      </div>

      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
        Officers:
        <ul style={{ margin: '0.2rem 0 0 1rem', padding: 0, color: 'var(--text-primary)' }}>
          {bin.officers.map((off, idx) => (
            <li key={idx}>{off}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export const WorkloadHistogramChart: React.FC = () => {
  const data = useMemo<HistogramBin[]>(() => {
    const bins = [
      { min: 0, max: 5, binRange: '1 – 5 Cases', binLabel: 'Low Load (Available)', riskStatus: 'LOW' as const, color: 'var(--info)' },
      { min: 6, max: 10, binRange: '6 – 10 Cases', binLabel: 'Normal Workload', riskStatus: 'NORMAL' as const, color: 'var(--success)' },
      { min: 11, max: 15, binRange: '11 – 15 Cases', binLabel: 'High Case Load', riskStatus: 'HIGH' as const, color: 'var(--warning)' },
      { min: 16, max: Number.POSITIVE_INFINITY, binRange: '16+ Cases', binLabel: 'Overloaded', riskStatus: 'HEAVY' as const, color: 'var(--critical)' },
    ];
    const workloads = dataService.getOfficerWorkloads();
    return bins.map((bin) => {
      const officers = workloads.filter((officer) => officer.activeCasesCount >= bin.min && officer.activeCasesCount <= bin.max);
      return {
        ...bin,
        officerCount: officers.length,
        officers: officers.map((officer) => `${officer.officerName} (${officer.activeCasesCount} cases / ${officer.capacityUtilization}% capacity)`),
        capacityAvg: officers.length ? officers.reduce((sum, officer) => sum + officer.capacityUtilization, 0) / officers.length : 0,
      };
    });
  }, []);

  return (
    <div style={{
      backgroundColor: 'var(--surface-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '1.25rem',
      boxShadow: 'var(--shadow-sm)',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.85rem',
      position: 'relative'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(217, 119, 6, 0.15)',
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <BarChart3 size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Officer Workload Distribution
            </h3>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
              Number of officers assigned by case load range
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{
            fontSize: '0.72rem',
            fontWeight: 800,
            color: 'var(--success)',
            backgroundColor: 'rgba(16, 185, 129, 0.14)',
            padding: '0.3rem 0.65rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}>
            <Activity size={13} className="pulse-icon" />
            LIVE WORKLOAD UPDATES
          </span>
        </div>
      </div>

      {/* Histogram Chart Container */}
      <div style={{ width: '100%', height: 230, position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 15, left: -15, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
            <XAxis dataKey="binRange" stroke="var(--text-muted)" fontSize={11} fontWeight={700} />
            <YAxis allowDecimals={true} stroke="var(--text-muted)" fontSize={11} fontWeight={700} domain={[0, 4]} />
            <Tooltip
              content={<CustomHistogramTooltip />}
              cursor={{ fill: 'rgba(234, 179, 8, 0.08)' }}
            />
            <Bar
              dataKey="officerCount"
              name="Officers"
              radius={[6, 6, 0, 0]}
              animationDuration={400}
              animationEasing="ease-out"
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  style={{
                    cursor: 'pointer',
                    filter: `drop-shadow(0 4px 10px ${entry.color}44)`,
                    transition: 'all 350ms cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Histogram Bins Legend Strip */}
      <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '0.5rem', paddingTop: '0.4rem', borderTop: '1px solid var(--border-subtle)' }}>
        {data.map(bin => (
          <div key={bin.binRange} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.74rem' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: bin.color, boxShadow: `0 0 8px ${bin.color}66` }} />
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
              {bin.binRange}: <strong style={{ color: 'var(--text-primary)', transition: 'all 200ms ease' }}>{Math.round(bin.officerCount)} Officer(s)</strong>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
