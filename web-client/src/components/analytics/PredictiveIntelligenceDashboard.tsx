import React, { useMemo, useState } from 'react';
import {
  Brain
} from 'lucide-react';
import { dataService } from '../../services/mockDataService';

interface PredictiveSpike {
  district: string;
  division: string;
  predictedOffense: string;
  probabilityScore: number;
  expectedSpikeDate: string;
  peakHourWindow: string;
  recommendedPatrols: number;
  simulatedReduction: number;
  primaryLeadSuspect: string;
  status: 'HIGH_RISK' | 'MODERATE_RISK' | 'CONTAINED';
}

export const PredictiveIntelligenceDashboard: React.FC = () => {
  const forecast = dataService.getForecast() as {
    summary?: { method?: string; validation?: { production_status?: string } };
    early_warnings?: Array<{
      district?: string; recent_monthly_avg?: number; baseline_monthly_avg?: number;
      increase_percent?: number; alert_level?: string; recommended_action?: string;
    }>;
  };
  const cases = dataService.getAllCases();
  const predictiveSpikes = useMemo<PredictiveSpike[]>(() => (forecast.early_warnings || []).map((warning) => {
    const districtCases = cases.filter((item) => item.location.district === warning.district);
    const categoryCounts = districtCases.reduce<Record<string, number>>((totals, item) => {
      totals[item.category] = (totals[item.category] || 0) + 1;
      return totals;
    }, {});
    const leadingCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'No dominant category recorded';
    const increase = Number(warning.increase_percent || 0);
    const probability = Math.min(99, Math.max(1, Math.round(50 + increase)));
    return {
      district: String(warning.district || 'Unspecified district'),
      division: `${districtCases.length} verified FIR records in the current role scope`,
      predictedOffense: leadingCategory,
      probabilityScore: probability,
      expectedSpikeDate: 'Next monthly forecast window',
      peakHourWindow: 'No verified hour-level forecast',
      recommendedPatrols: Math.max(1, Math.min(10, Math.ceil(increase / 10))),
      simulatedReduction: 0,
      primaryLeadSuspect: String(warning.recommended_action || 'Review verified hotspot and repeat-offender evidence.'),
      status: warning.alert_level === 'High' ? 'HIGH_RISK' : warning.alert_level === 'Medium' ? 'MODERATE_RISK' : 'CONTAINED',
    };
  }), [cases, forecast.early_warnings]);
  const watchlist = useMemo(() => cases.flatMap((record) => record.accused.map((accused) => ({
    name: accused.name,
    fir: record.firNumber,
    district: record.location.district,
    risk: accused.riskScore,
    status: accused.status.replaceAll('_', ' '),
    offense: record.modusOperandi.primaryMethod || record.category,
  }))).sort((a, b) => b.risk - a.risk).slice(0, 8), [cases]);
  const [selectedDistrict, setSelectedDistrict] = useState<string>(() => predictiveSpikes[0]?.district || '');
  const [additionalPatrolsDeployed, setAdditionalPatrolsDeployed] = useState<number>(3);
  const [activeTab, setActiveTab] = useState<'FORECAST' | 'RECIDIVISM' | 'SIMULATOR'>('FORECAST');

  const activeSpike = predictiveSpikes.find(s => s.district === selectedDistrict) || predictiveSpikes[0] || {
    district: 'No warning available', division: 'No verified forecast payload', predictedOffense: 'Not available',
    probabilityScore: 0, expectedSpikeDate: 'Not available', peakHourWindow: 'Not available',
    recommendedPatrols: 0, simulatedReduction: 0, primaryLeadSuspect: 'No action required', status: 'CONTAINED' as const,
  };

  // Dynamic calculation for interactive patrol simulator
  const calculatedRiskReduction = Math.min(65, Math.max(0, (additionalPatrolsDeployed - 1) * 6));
  const calculatedNewProbability = Math.max(18, activeSpike.probabilityScore - calculatedRiskReduction * 0.7);

  return (
    <div style={{
      backgroundColor: 'var(--surface-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '1.25rem',
      boxShadow: 'var(--shadow-md)',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem'
    }}>

      {/* Header Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(217, 119, 6, 0.15)',
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Brain size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              Statewide Predictive Intelligence & Patrol Forecasting
            </h3>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              7-Day Crime Surge Forecasting, Recidivism Risk Surveillance, and Interactive Patrol Deployment Simulator for Karnataka Police.
            </p>
          </div>
        </div>

        {/* View Switcher Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('FORECAST')}
            style={{
              fontSize: '0.74rem',
              fontWeight: 800,
              padding: '0.4rem 0.8rem',
              borderRadius: 'var(--radius-md)',
              border: activeTab === 'FORECAST' ? '1.5px solid var(--accent)' : '1px solid var(--border)',
              backgroundColor: activeTab === 'FORECAST' ? 'rgba(234, 179, 8, 0.2)' : 'var(--surface-muted)',
              color: activeTab === 'FORECAST' ? 'var(--accent)' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            📊 7-Day Surge Forecast
          </button>

          <button
            onClick={() => setActiveTab('SIMULATOR')}
            style={{
              fontSize: '0.74rem',
              fontWeight: 800,
              padding: '0.4rem 0.8rem',
              borderRadius: 'var(--radius-md)',
              border: activeTab === 'SIMULATOR' ? '1.5px solid var(--accent)' : '1px solid var(--border)',
              backgroundColor: activeTab === 'SIMULATOR' ? 'rgba(234, 179, 8, 0.2)' : 'var(--surface-muted)',
              color: activeTab === 'SIMULATOR' ? 'var(--accent)' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            🚓 Patrol Deployment Simulator
          </button>

          <button
            onClick={() => setActiveTab('RECIDIVISM')}
            style={{
              fontSize: '0.74rem',
              fontWeight: 800,
              padding: '0.4rem 0.8rem',
              borderRadius: 'var(--radius-md)',
              border: activeTab === 'RECIDIVISM' ? '1.5px solid var(--accent)' : '1px solid var(--border)',
              backgroundColor: activeTab === 'RECIDIVISM' ? 'rgba(234, 179, 8, 0.2)' : 'var(--surface-muted)',
              color: activeTab === 'RECIDIVISM' ? 'var(--accent)' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            👤 Recidivism Risk Surveillance
          </button>
        </div>
      </div>

      {/* VIEW 1: 7-DAY SURGE FORECAST */}
      {activeTab === 'FORECAST' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.2fr) minmax(360px, 1.3fr)', gap: '1.25rem' }}>
          
          {/* LEFT: PREDICTED DISTRICT SPIKES LIST */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Verified early-warning districts ({predictiveSpikes.length}):
            </span>

            {predictiveSpikes.map(item => {
              const isSelected = item.district === selectedDistrict;

              return (
                <div
                  key={item.district}
                  onClick={() => setSelectedDistrict(item.district)}
                  style={{
                    backgroundColor: isSelected ? 'var(--surface-hover)' : 'var(--surface-elevated)',
                    border: isSelected ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                    borderLeft: isSelected ? '5px solid var(--accent)' : '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    cursor: 'pointer',
                    transition: 'all 200ms ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.55rem',
                    boxShadow: isSelected ? '0 0 14px rgba(234, 179, 8, 0.2)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="badge badge-critical" style={{ fontSize: '0.7rem' }}>
                      {item.probabilityScore}% FORECAST RISK
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                      {item.district}
                    </span>
                  </div>

                  <h4 style={{ fontSize: '0.96rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3 }}>
                    {item.predictedOffense}
                  </h4>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                    <span>Division: <strong>{item.division}</strong></span>
                    <span style={{ color: 'var(--warning)', fontWeight: 700 }}>{item.expectedSpikeDate}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* RIGHT: PREDICTIVE FORECAST DOSSIER */}
          <div style={{
            backgroundColor: 'var(--surface-elevated)',
            border: '1px solid var(--border-accent)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.1rem',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span className="badge badge-critical" style={{ fontSize: '0.7rem' }}>
                  {activeSpike.probabilityScore}% SPIKE PROBABILITY
                </span>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent)' }}>
                  JURISDICTION: {activeSpike.district}
                </span>
              </div>

              <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.35 }}>
                {activeSpike.predictedOffense}
              </h3>

              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontWeight: 600 }}>
                Target Sector: <strong style={{ color: 'var(--accent)' }}>"{activeSpike.division}"</strong>
              </div>
            </div>

            {/* Probability Gauge Bar */}
            <div style={{
              padding: '0.85rem 1rem',
              backgroundColor: 'var(--surface-muted)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>Machine Learning Forecast Confidence:</span>
                <strong style={{ color: 'var(--critical)', fontSize: '0.9rem' }}>{activeSpike.probabilityScore}% Risk Level</strong>
              </div>
              <div style={{ height: '8px', backgroundColor: 'var(--surface-card)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${activeSpike.probabilityScore}%`, height: '100%', backgroundColor: 'var(--critical)', borderRadius: '4px' }} />
              </div>
            </div>

            {/* Timing & Suspect Info */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.75rem',
              fontSize: '0.76rem',
              color: 'var(--text-secondary)'
            }}>
              <div style={{ backgroundColor: 'var(--surface-muted)', padding: '0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>EXPECTED DANGER WINDOW</span>
                <strong style={{ color: 'var(--warning)', fontSize: '0.82rem' }}>{activeSpike.peakHourWindow}</strong>
              </div>

              <div style={{ backgroundColor: 'var(--surface-muted)', padding: '0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>PRIMARY LEAD SUSPECT</span>
                <strong style={{ color: 'var(--critical)', fontSize: '0.82rem' }}>{activeSpike.primaryLeadSuspect}</strong>
              </div>
            </div>

            {/* AI Tactical Recommendation */}
            <div style={{
              padding: '0.85rem 1rem',
              backgroundColor: 'var(--surface-muted)',
              borderRadius: 'var(--radius-sm)',
              borderLeft: '4px solid var(--success)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem'
            }}>
              <strong style={{ fontSize: '0.86rem', color: 'var(--success)', display: 'block' }}>
                🛡️ Recommended Preventive Countermeasure:
              </strong>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: 1.45, margin: 0 }}>
                Deploy <strong>+{activeSpike.recommendedPatrols} specialized PCR patrol units</strong> along {activeSpike.division} during {activeSpike.peakHourWindow} to prevent predicted surge.
              </p>
            </div>

            <button
              onClick={() => setActiveTab('SIMULATOR')}
              style={{
                width: '100%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1rem',
                backgroundColor: 'var(--accent)',
                color: '#000000',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.82rem',
                fontWeight: 900,
                cursor: 'pointer'
              }}
            >
              <span>Launch Patrol Deployment Simulator →</span>
            </button>

          </div>
        </div>
      )}

      {/* VIEW 2: INTERACTIVE PATROL DEPLOYMENT SIMULATOR */}
      {activeTab === 'SIMULATOR' && (
        <div style={{
          backgroundColor: 'var(--surface-elevated)',
          border: '1px solid var(--border-accent)',
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.2rem'
        }}>
          <div>
            <span className="badge badge-accent" style={{ fontSize: '0.68rem', marginBottom: '0.35rem' }}>
              RESOURCE ALLOCATION SIMULATOR
            </span>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-primary)' }}>
              Interactive Patrol Deployment Impact Calculator
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Adjust additional PCR patrol unit density for <strong style={{ color: 'var(--accent)' }}>{selectedDistrict}</strong> to simulate crime spike mitigation percentage.
            </p>
          </div>

          {/* District Select Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>Target District:</label>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              style={{
                padding: '0.4rem 0.8rem',
                backgroundColor: 'var(--surface-muted)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '0.8rem',
                outline: 'none'
              }}
            >
              {predictiveSpikes.map(s => (
                <option key={s.district} value={s.district}>{s.district} — {s.predictedOffense}</option>
              ))}
            </select>
          </div>

          {/* Interactive Range Slider */}
          <div style={{
            padding: '1.25rem',
            backgroundColor: 'var(--surface-muted)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Additional Tactical PCR Patrol Vans Deployed:
              </span>
              <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--accent)' }}>
                +{additionalPatrolsDeployed} Patrol Units
              </span>
            </div>

            <input
              type="range"
              min="1"
              max="10"
              value={additionalPatrolsDeployed}
              onChange={(e) => setAdditionalPatrolsDeployed(parseInt(e.target.value))}
              style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--accent)' }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              <span>+1 Unit (Baseline Patrol)</span>
              <span>+5 Units (Recommended Density)</span>
              <span>+10 Units (Maximum Surge Lockdown)</span>
            </div>
          </div>

          {/* Simulation Output Comparison Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.85rem' }}>
            <div style={{ backgroundColor: 'var(--surface-card)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', textAlign: 'center' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>BASELINE FORECAST RISK</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--critical)', marginTop: '0.2rem' }}>
                {activeSpike.probabilityScore}%
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Without Intervention</span>
            </div>

            <div style={{ backgroundColor: 'var(--surface-card)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--success)', textAlign: 'center' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--success)', textTransform: 'uppercase' }}>SIMULATED RISK REDUCTION</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--success)', marginTop: '0.2rem' }}>
                -{calculatedRiskReduction.toFixed(0)}%
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Incident Mitigation Score</span>
            </div>

            <div style={{ backgroundColor: 'var(--surface-card)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--accent)', textAlign: 'center' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase' }}>NEW RESIDUAL RISK LEVEL</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--accent)', marginTop: '0.2rem' }}>
                {calculatedNewProbability.toFixed(0)}%
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Post-Patrol Risk Profile</span>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: RECIDIVISM RISK SURVEILLANCE */}
      {activeTab === 'RECIDIVISM' && (
        <div style={{
          backgroundColor: 'var(--surface-elevated)',
          border: '1px solid var(--border-accent)',
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div>
            <span className="badge badge-critical" style={{ fontSize: '0.68rem', marginBottom: '0.35rem' }}>
              HIGH-RISK BAIL SURVEILLANCE
            </span>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-primary)' }}>
              Karnataka High-Recidivism Accused Watchlist
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Repeat offenders currently on active court bail with highest predicted re-offense risk within 14 days.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {watchlist.map((suspect, idx) => (
              <div key={idx} style={{
                padding: '0.85rem 1rem',
                backgroundColor: 'var(--surface-muted)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}>
                <div>
                  <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>{suspect.name}</strong>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                    Modus Operandi: <strong>{suspect.offense}</strong> | District: {suspect.district}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--critical)', textTransform: 'uppercase', display: 'block' }}>RECIDIVISM RISK</span>
                    <strong style={{ color: 'var(--critical)', fontSize: '1.1rem' }}>{suspect.risk}%</strong>
                  </div>

                  <span className="badge badge-critical" style={{ fontSize: '0.7rem' }}>
                    {suspect.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
