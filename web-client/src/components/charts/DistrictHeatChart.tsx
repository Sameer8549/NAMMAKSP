import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { MOCK_KARNATAKA_DISTRICTS } from '../../mock/mockDistricts';
import { Building2, ShieldCheck } from 'lucide-react';

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomDistrictTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  const districtData = MOCK_KARNATAKA_DISTRICTS.find(d => d.name === label) || {
    name: label,
    totalCases: 2100,
    resolvedCases: payload[0]?.value || 1500,
    pendingCases: payload[1]?.value || 500,
    clearanceRate: 75.0,
    dominantCategory: 'Cyber & Burglary',
    riskStatus: 'HIGH_ALERT',
    trendPercentage: 8.5
  };

  const clearanceRate = districtData.clearanceRate || ((districtData.resolvedCases / (districtData.totalCases || 1)) * 100).toFixed(1);

  return (
    <div style={{
      backgroundColor: 'var(--surface-elevated)',
      border: '1.5px solid var(--border-accent)',
      borderRadius: 'var(--radius-md)',
      padding: '0.85rem 1rem',
      boxShadow: 'var(--shadow-md)',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      minWidth: '240px',
      color: 'var(--text-primary)',
      zIndex: 100
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>{label}</strong>
        <span className={`badge ${districtData.riskStatus === 'HIGH_ALERT' ? 'badge-critical' : 'badge-success'}`} style={{ fontSize: '0.65rem' }}>
          {districtData.riskStatus === 'HIGH_ALERT' ? 'HIGH ALERT' : 'NORMAL'}
        </span>
      </div>

      <div style={{
        padding: '0.4rem 0.6rem',
        backgroundColor: 'var(--surface-muted)',
        borderRadius: 'var(--radius-sm)',
        fontSize: '0.74rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>Case Clearance Rate:</span>
        <strong style={{ color: 'var(--success)', fontSize: '0.85rem' }}>{clearanceRate}% Disposed</strong>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.74rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}>
          <span>Resolved / Chargesheeted FIRs:</span>
          <strong>{districtData.resolvedCases} cases</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--critical)' }}>
          <span>Pending Investigation FIRs:</span>
          <strong>{districtData.pendingCases} cases</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
          <span>Primary Modus Operandi:</span>
          <strong style={{ color: 'var(--accent)' }}>{districtData.dominantCategory}</strong>
        </div>
      </div>
    </div>
  );
};

export const DistrictHeatChart: React.FC = () => {
  const [selectedDistrictName, setSelectedDistrictName] = useState<string>('Dakshina Kannada (Mangaluru)');

  const activeDistrict = MOCK_KARNATAKA_DISTRICTS.find(d => d.name === selectedDistrictName) || MOCK_KARNATAKA_DISTRICTS[0];

  return (
    <div style={{
      backgroundColor: 'var(--surface-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '1.25rem',
      boxShadow: 'var(--shadow-md)',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(217, 119, 6, 0.15)',
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Building2 size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Statewide District Case Clearance vs. Pending Comparison
            </h3>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
              Hover over or click any district bar column to inspect clearance rate breakdown & police action dossier.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{
            fontSize: '0.72rem',
            fontWeight: 800,
            color: 'var(--success)',
            backgroundColor: 'rgba(16, 185, 129, 0.14)',
            padding: '0.3rem 0.65rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(16, 185, 129, 0.3)'
          }}>
            ⚡ LIVE INGESTION STREAM ACTIVE
          </span>
        </div>
      </div>

      {/* SVG Bar Chart Container with Soft Amber Hover Mask */}
      <div style={{ width: '100%', height: 280, position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={MOCK_KARNATAKA_DISTRICTS.slice(0, 6)}
            margin={{ top: 15, right: 20, left: 0, bottom: 5 }}
            onClick={(state) => {
              if (state && state.activeLabel) {
                setSelectedDistrictName(String(state.activeLabel));
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
            <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} fontWeight={700} />
            <YAxis stroke="var(--text-muted)" fontSize={11} fontWeight={700} />
            <Tooltip
              content={<CustomDistrictTooltip />}
              cursor={{ fill: 'rgba(234, 179, 8, 0.08)' }}
            />
            <Legend wrapperStyle={{ fontSize: '0.78rem', paddingTop: '10px' }} />
            
            {/* Resolved Cases Bar (Green) */}
            <Bar
              dataKey="resolvedCases"
              name="Resolved / Chargesheeted FIRs"
              fill="var(--success)"
              radius={[4, 4, 0, 0]}
              style={{ cursor: 'pointer', filter: 'drop-shadow(0 2px 6px rgba(16, 185, 129, 0.25))' }}
            />
            
            {/* Pending Cases Bar (Red) */}
            <Bar
              dataKey="pendingCases"
              name="Pending Investigation FIRs"
              fill="var(--critical)"
              radius={[4, 4, 0, 0]}
              style={{ cursor: 'pointer', filter: 'drop-shadow(0 2px 6px rgba(239, 68, 68, 0.25))' }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom Selected District Clearance Inspection Card */}
      <div style={{
        padding: '1rem 1.25rem',
        backgroundColor: 'var(--surface-elevated)',
        border: '1px solid var(--border-accent)',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--surface-muted)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent)'
          }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              SELECTED DISTRICT DOSSIER
            </span>
            <h4 style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text-primary)', margin: '0.1rem 0 0 0' }}>
              {activeDistrict.name} — Clearance Rate: <span style={{ color: 'var(--success)' }}>{activeDistrict.clearanceRate}%</span>
            </h4>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Resolved: <strong style={{ color: 'var(--success)' }}>{activeDistrict.resolvedCases} FIRs</strong> | Pending: <strong style={{ color: 'var(--critical)' }}>{activeDistrict.pendingCases} FIRs</strong>
          </div>
          <div className="badge badge-accent" style={{ fontSize: '0.7rem' }}>
            {activeDistrict.dominantCategory}
          </div>
        </div>
      </div>

    </div>
  );
};
