import React, { useState, useEffect } from 'react';
import { MOCK_KARNATAKA_DISTRICTS } from '../../mock/mockDistricts';
import type { DistrictStats } from '../../types/analytics';
import {
  Activity,
  Building2,
  Sparkles,
  Zap,
  X
} from 'lucide-react';

interface MovingGeographicBarChartProps {
  onSelectDistrict?: (district: DistrictStats) => void;
}

export const MovingGeographicBarChart: React.FC<MovingGeographicBarChartProps> = ({
  onSelectDistrict
}) => {
  // Live dynamic fluctuating state for moving bars
  const [districtData, setDistrictData] = useState<
    (DistrictStats & { liveVelocity: number; liveCases: number; activePulse: boolean })[]
  >(() =>
    MOCK_KARNATAKA_DISTRICTS.map((d, i) => ({
      ...d,
      liveCases: d.totalCases,
      liveVelocity: Math.floor(12 + (i * 7) % 25),
      activePulse: false
    }))
  );

  const [selectedBar, setSelectedBar] = useState<
    (DistrictStats & { liveVelocity: number; liveCases: number }) | null
  >(districtData[0]);

  const [tick, setTick] = useState(0);

  // Live animation loop: updates bar heights and velocities dynamically (no constant state)
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(prev => prev + 1);
      setDistrictData(prev =>
        prev.map((item, idx) => {
          // Dynamic small shift in live cases and velocity to create moving bars effect
          const shift = Math.floor(Math.sin((tick + idx * 2) * 0.5) * 8);
          const velocityShift = Math.floor(Math.cos((tick + idx) * 0.7) * 4);
          const newCases = Math.max(100, item.totalCases + shift);
          const newVelocity = Math.max(5, item.liveVelocity + velocityShift);

          return {
            ...item,
            liveCases: newCases,
            liveVelocity: newVelocity,
            activePulse: (tick + idx) % 3 === 0
          };
        })
      );
    }, 1200);

    return () => clearInterval(interval);
  }, [tick]);

  const maxCases = Math.max(...districtData.map(d => d.liveCases), 4500);

  const handleBarClick = (item: (DistrictStats & { liveVelocity: number; liveCases: number })) => {
    setSelectedBar(item);
    if (onSelectDistrict) onSelectDistrict(item);
  };

  return (
    <div style={{
      backgroundColor: 'var(--surface-elevated)',
      border: '1.5px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '1.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem',
      boxShadow: 'var(--shadow-sm)'
    }}>
      
      {/* 1. HEADER & DYNAMIC TICKER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Activity size={22} color="var(--accent)" style={{ animation: 'pulse 1.5s infinite' }} />
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Live Geographic Patterns: Moving Vertical District Bar Observatory
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
              Real-time moving vertical bar chart arranged left-to-right across Karnataka districts. Click any bar to inspect full telemetry.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{
            fontSize: '0.72rem',
            fontWeight: 800,
            color: 'var(--success)',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            padding: '0.3rem 0.65rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}>
            <Zap size={14} />
            <span>LIVE 1.2s MOVING STREAM ACTIVE</span>
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. VERTICALLY ALIGNED MOVING BAR GRAPH (LEFT TO RIGHT)                     */}
      {/* ========================================================================= */}
      <div style={{
        backgroundColor: 'var(--surface-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '1.25rem 1rem 0.85rem 1rem',
        position: 'relative',
        overflowX: 'auto'
      }}>
        {/* Background Y-Axis Gridlines */}
        <div style={{
          position: 'absolute',
          top: '1.25rem',
          left: '1rem',
          right: '1rem',
          bottom: '2.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          pointerEvents: 'none',
          opacity: 0.2
        }}>
          {[100, 75, 50, 25, 0].map(pct => (
            <div key={pct} style={{ borderBottom: '1px dashed var(--border)', width: '100%' }} />
          ))}
        </div>

        {/* Vertical Bars Container (Left to Right Alignment) */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-around',
          height: '280px',
          paddingBottom: '2.2rem',
          position: 'relative',
          gap: '0.75rem',
          minWidth: '700px'
        }}>
          {districtData.map((d) => {
            const isSelected = selectedBar?.name === d.name;
            const heightPct = Math.min(100, Math.max(15, (d.liveCases / maxCases) * 100));
            const barColor = d.riskStatus === 'HIGH_ALERT' ? 'var(--critical)' : d.riskStatus === 'MODERATE' ? 'var(--warning)' : 'var(--success)';
            const solvedPct = (d.resolvedCases / d.liveCases) * 100;

            return (
              <div
                key={d.id}
                onClick={() => handleBarClick(d)}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  height: '100%',
                  justifyContent: 'flex-end',
                  cursor: 'pointer',
                  position: 'relative'
                }}
                title={`Click to view complete information for ${d.name}`}
              >
                {/* Value Badge above Bar */}
                <div style={{
                  fontSize: '0.68rem',
                  fontWeight: 900,
                  color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
                  marginBottom: '0.35rem',
                  transition: 'all 300ms ease',
                  transform: d.activePulse ? 'translateY(-2px)' : 'none'
                }}>
                  {d.liveCases}
                </div>

                {/* Vertical Bar Stack */}
                <div style={{
                  width: '100%',
                  maxWidth: '48px',
                  height: `${heightPct}%`,
                  backgroundColor: 'var(--surface-muted)',
                  borderRadius: '6px 6px 0 0',
                  border: isSelected ? '2px solid var(--accent)' : `1px solid ${barColor}`,
                  boxShadow: isSelected ? '0 0 16px rgba(217, 119, 6, 0.4)' : 'none',
                  overflow: 'hidden',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  transition: 'height 400ms cubic-bezier(0.4, 0, 0.2, 1), border 200ms ease'
                }}>
                  {/* Resolved Portion Fill */}
                  <div style={{
                    height: `${solvedPct}%`,
                    backgroundColor: barColor,
                    opacity: isSelected ? 1 : 0.85,
                    transition: 'height 400ms ease',
                    position: 'relative'
                  }}>
                    {/* Animated Moving Wave Overlay */}
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '4px',
                      backgroundColor: '#ffffff',
                      opacity: 0.6,
                      animation: 'pulse 1.2s infinite'
                    }} />
                  </div>

                  {/* Pending Portion Fill */}
                  <div style={{
                    flex: 1,
                    backgroundColor: 'rgba(239, 68, 68, 0.25)',
                    borderTop: '1px solid rgba(255,255,255,0.2)'
                  }} />
                </div>

                {/* District Label along X-Axis */}
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  fontSize: '0.72rem',
                  fontWeight: isSelected ? 900 : 700,
                  color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '70px'
                }}>
                  {d.name.split(' ')[0]}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. INTERACTIVE INFORMATION PANEL (DISPLAYED WHEN BAR IS PRESSED / CLICKED) */}
      {/* ========================================================================= */}
      {selectedBar ? (
        <div style={{
          backgroundColor: 'var(--surface-card)',
          border: '1.5px solid var(--border-accent)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          boxShadow: 'var(--shadow-md)',
          animation: 'fadeIn 300ms ease-out'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Building2 size={20} color="var(--accent)" />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <h4 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
                    {selectedBar.name}
                  </h4>
                  <span className={`badge ${
                    selectedBar.riskStatus === 'HIGH_ALERT' ? 'badge-critical' : selectedBar.riskStatus === 'MODERATE' ? 'badge-warning' : 'badge-success'
                  }`} style={{ fontSize: '0.7rem' }}>
                    {selectedBar.riskStatus.replace('_', ' ')}
                  </span>
                </div>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
                  Selected District Telemetry & Live Incident Pattern Audit
                </p>
              </div>
            </div>

            <button
              onClick={() => setSelectedBar(null)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '0.2rem'
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* 4 Metrics Cards Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '0.85rem'
          }}>
            <div style={{
              padding: '0.8rem',
              backgroundColor: 'var(--surface-muted)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)'
            }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block' }}>
                CURRENT LIVE CASES
              </span>
              <span style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                {selectedBar.liveCases}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--critical)', fontWeight: 700, display: 'block', marginTop: '0.2rem' }}>
                ▲ Live Velocity: +{selectedBar.liveVelocity} cases/hr
              </span>
            </div>

            <div style={{
              padding: '0.8rem',
              backgroundColor: 'var(--surface-muted)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)'
            }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block' }}>
                RESOLUTION EFFICIENCY
              </span>
              <span style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--success)' }}>
                {selectedBar.clearanceRate}%
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.2rem' }}>
                {selectedBar.resolvedCases} Solved | {selectedBar.pendingCases} Pending
              </span>
            </div>

            <div style={{
              padding: '0.8rem',
              backgroundColor: 'var(--surface-muted)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)'
            }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block' }}>
                CRIME RATE INDEX
              </span>
              <span style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--accent)' }}>
                {selectedBar.crimeRatePerLakh}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.2rem' }}>
                Per 100,000 Citizens
              </span>
            </div>

            <div style={{
              padding: '0.8rem',
              backgroundColor: 'var(--surface-muted)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)'
            }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block' }}>
                DOMINANT OFFENSE
              </span>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginTop: '0.25rem' }}>
                {selectedBar.dominantCategory}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 700, display: 'block', marginTop: '0.2rem' }}>
                Primary Pattern Vector
              </span>
            </div>
          </div>

          {/* AI Recommended Command Action */}
          <div style={{
            padding: '0.85rem 1rem',
            backgroundColor: 'rgba(217, 119, 6, 0.1)',
            border: '1px solid rgba(217, 119, 6, 0.3)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={16} color="var(--accent)" />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                Recommended Command Action: Deploy <strong>{selectedBar.dominantCategory}</strong> taskforce to {selectedBar.name} sector.
              </span>
            </div>

            <button
              className="admin-btn-primary"
              style={{ fontSize: '0.74rem', padding: '0.4rem 0.8rem', fontWeight: 800 }}
              onClick={() => alert(`Command action triggered for ${selectedBar.name}!`)}
            >
              TRIGGER COMMAND ACTION
            </button>
          </div>

        </div>
      ) : (
        <div style={{
          padding: '1rem',
          textAlign: 'center',
          fontSize: '0.82rem',
          color: 'var(--text-muted)',
          backgroundColor: 'var(--surface-muted)',
          borderRadius: 'var(--radius-md)',
          border: '1px stroke var(--border-subtle)'
        }}>
          💡 Click or press on any vertical bar in the graph above to open complete district information.
        </div>
      )}

    </div>
  );
};
