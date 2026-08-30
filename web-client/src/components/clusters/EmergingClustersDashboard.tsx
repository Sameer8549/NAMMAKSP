import React, { useState, useEffect, useMemo } from 'react';
import {
  Radio,
  Target,
  Shield,
  Zap,
  Search,
  ChevronRight,
  UserCheck,
  Activity,
  Layers
} from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import { dataService } from '../../services/mockDataService';

export interface CrimeClusterItem {
  id: string;
  name: string;
  district: string;
  category: string;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  incidentCount: number;
  threatScore: number; // 0-100
  financialImpact: string;
  primaryModusOperandi: string;
  centerCoords: { x: number; y: number; label: string };
  radiusKm: number;
  activePeakHours: string;
  primarySuspect: {
    id: string;
    name: string;
    alias: string;
    riskScore: number;
    firNumber: string;
  };
  crimeBreakdown: { type: string; count: number; percentage: number }[];
  patrolDispatchAdvisory: string;
  status: 'ACTIVE_SURGE' | 'MONITORED' | 'CONTAINED';
}

export const EmergingClustersDashboard: React.FC = () => {
  const { setActiveView } = useRole();
  const cases = dataService.getAllCases();
  const warnings = (dataService.getForecast().early_warnings as Array<Record<string, unknown>> | undefined) || [];
  const clusters = useMemo<CrimeClusterItem[]>(() => warnings.map((warning, index) => {
    const district = String(warning.district || 'District not recorded');
    const districtCases = cases.filter(item => item.location.district === district);
    const byCrime = Array.from(new Set(districtCases.map(item => item.modusOperandi.primaryMethod)))
      .map(type => ({ type, count: districtCases.filter(item => item.modusOperandi.primaryMethod === type).length }))
      .sort((a, b) => b.count - a.count);
    const primary = districtCases.flatMap(item => item.accused.map(accused => ({ accused, fir: item.firNumber })))
      .sort((a, b) => b.accused.riskScore - a.accused.riskScore)[0];
    const total = districtCases.length || 1;
    const alert = String(warning.alert_level || 'Medium').toUpperCase();
    return {
      id: `cluster-${index + 1}`,
      name: `${district} early-warning cluster`, district,
      category: byCrime[0]?.type || 'Multi-category signal',
      riskLevel: alert === 'HIGH' ? 'HIGH' : alert === 'CRITICAL' ? 'CRITICAL' : 'MEDIUM',
      incidentCount: districtCases.length,
      threatScore: Math.min(100, Math.round(Number(warning.increase_percent || 0) + 50)),
      financialImpact: 'No financial impact value in the forecast source',
      primaryModusOperandi: byCrime[0]?.type || 'No dominant method recorded',
      centerCoords: { x: 120 + (index % 3) * 130, y: 90 + Math.floor(index / 3) * 120, label: district },
      radiusKm: 0,
      activePeakHours: 'Not recorded in the forecast source',
      primarySuspect: {
        id: primary?.accused.id || 'No linked accused',
        name: primary?.accused.name || 'No linked accused', alias: primary?.accused.alias || '',
        riskScore: primary?.accused.riskScore || 0, firNumber: primary?.fir || 'No FIR',
      },
      crimeBreakdown: byCrime.slice(0, 5).map(item => ({ ...item, percentage: Math.round(item.count / total * 100) })),
      patrolDispatchAdvisory: String(warning.recommended_action || 'Human review is required.'),
      status: alert === 'HIGH' || alert === 'CRITICAL' ? 'ACTIVE_SURGE' : 'MONITORED',
    };
  }), [cases, warnings]);

  const [selectedClusterId, setSelectedClusterId] = useState<string>('CLUSTER-BLR-01');
  const [activeRadarSweep, setActiveRadarSweep] = useState(true);
  const [angle, setAngle] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH'>('ALL');
  const [activeTab, setActiveTab] = useState<'SPATIAL' | 'SUSPECT' | 'PATROL'>('SPATIAL');
  const [dispatchAlert, setDispatchAlert] = useState<string | null>(null);

  // Animated Radar Sweep angle timer
  useEffect(() => {
    let timer: any;
    if (activeRadarSweep) {
      timer = setInterval(() => {
        setAngle(prev => (prev + 3.5) % 360);
      }, 40);
    }
    return () => clearInterval(timer);
  }, [activeRadarSweep]);

  // Filtered clusters
  const filteredClusters = useMemo(() => {
    return clusters.filter(cluster => {
      const matchesSearch =
        cluster.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cluster.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cluster.primaryModusOperandi.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRisk = riskFilter === 'ALL' || cluster.riskLevel === riskFilter;

      return matchesSearch && matchesRisk;
    });
  }, [clusters, searchTerm, riskFilter]);

  // Selected Cluster details
  const selectedCluster = useMemo(() => {
    return clusters.find(c => c.id === selectedClusterId) || clusters[0];
  }, [clusters, selectedClusterId]);

  // Handle Patrol Dispatch Button Click
  const handleDispatchPatrol = (clusterName: string) => {
    setDispatchAlert(`⚡ TACTICAL ADVISORY SENT: High-frequency PCR Patrol dispatched to ${clusterName}!`);
    setTimeout(() => {
      setDispatchAlert(null);
    }, 4500);
  };

  return (
    <div style={{
      backgroundColor: 'var(--surface-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '1.25rem',
      boxShadow: 'var(--shadow-md)',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.2rem'
    }}>

      {/* Top Banner Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(239, 68, 68, 0.16)',
            color: 'var(--critical)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Radio size={22} style={{ animation: activeRadarSweep ? 'pulse 1.5s infinite' : 'none' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              Emerging Crime Clusters & Spatial Radar Sweep
            </h3>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              Real-time spatial density detection, criminal hot-spot radii, and tactical patrol dispatch advisory across Karnataka.
            </p>
          </div>
        </div>

        {/* Sweep Controls & Quick Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveRadarSweep(!activeRadarSweep)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.76rem',
              fontWeight: 800,
              cursor: 'pointer',
              border: activeRadarSweep ? '1.5px solid var(--accent)' : '1px solid var(--border)',
              backgroundColor: activeRadarSweep ? 'var(--accent)' : 'var(--surface-muted)',
              color: activeRadarSweep ? '#000000' : 'var(--text-secondary)',
              transition: 'var(--transition-fast)'
            }}
          >
            <Activity size={15} />
            <span>{activeRadarSweep ? 'LIVE RADAR SWEEP ACTIVE' : 'PAUSED RADAR SWEEP'}</span>
          </button>

          <span className="badge badge-critical" style={{ fontSize: '0.74rem', padding: '0.45rem 0.75rem' }}>
            5 DENSITY CLUSTERS TRACKED
          </span>
        </div>
      </div>

      {/* Dispatch Action Alert Toast Notice */}
      {dispatchAlert && (
        <div style={{
          padding: '0.85rem 1.1rem',
          backgroundColor: 'rgba(16, 185, 129, 0.16)',
          border: '1.5px solid var(--success)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--success)',
          fontSize: '0.84rem',
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          boxShadow: '0 0 16px rgba(16, 185, 129, 0.25)',
          animation: 'fadeIn 250ms ease-out'
        }}>
          <Zap size={18} />
          <span>{dispatchAlert}</span>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div style={{
        backgroundColor: 'var(--surface-muted)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '0.75rem 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search cluster name, district, modus operandi, or crime category..."
            style={{
              width: '100%',
              padding: '0.5rem 0.85rem 0.5rem 2.2rem',
              backgroundColor: 'var(--surface-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: '0.82rem',
              outline: 'none'
            }}
          />
          <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>Threat Level:</span>
          {(['ALL', 'CRITICAL', 'HIGH'] as const).map(level => (
            <button
              key={level}
              onClick={() => setRiskFilter(level)}
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '0.3rem 0.7rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                backgroundColor: riskFilter === level ? 'var(--accent)' : 'var(--surface-card)',
                color: riskFilter === level ? '#000000' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              {level === 'ALL' ? 'All Severities' : level === 'CRITICAL' ? '🔴 Critical' : '🟡 High'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split Grid: Left Interactive Radar & Selector | Right Deep Intelligence Drawer */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(320px, 1.1fr) minmax(360px, 1.4fr)',
        gap: '1.25rem'
      }}>

        {/* LEFT COLUMN: INTERACTIVE RADAR SWEEP CANVAS & CLUSTER SELECTOR CARDS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          
          {/* RADAR CANVAS */}
          <div style={{
            position: 'relative',
            width: '100%',
            height: '270px',
            backgroundColor: 'var(--surface-elevated)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)'
          }}>
            {/* Radar Header Label */}
            <div style={{
              position: 'absolute',
              top: '0.65rem',
              left: '0.75rem',
              zIndex: 10,
              backgroundColor: 'var(--surface-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.25rem 0.65rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}>
              <Target size={14} color="var(--accent)" />
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Target Lock: <span style={{ color: 'var(--accent)' }}>{selectedCluster.name.split(' ')[0]}</span>
              </span>
            </div>

            <svg viewBox="0 0 500 300" style={{ width: '100%', height: '100%' }}>
              <defs>
                <pattern id="radarGridPattern" width="25" height="25" patternUnits="userSpaceOnUse">
                  <path d="M 25 0 L 0 0 0 25" fill="none" stroke="var(--border)" strokeWidth="0.4" opacity="0.3" />
                </pattern>
              </defs>

              <rect width="100%" height="100%" fill="url(#radarGridPattern)" />

              {/* Concentric Radar Rings */}
              <circle cx="250" cy="150" r="45" fill="none" stroke="var(--border)" strokeWidth="1" strokeDasharray="3 3" />
              <circle cx="250" cy="150" r="90" fill="none" stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
              <circle cx="250" cy="150" r="135" fill="none" stroke="var(--border)" strokeWidth="1" strokeDasharray="5 5" />
              
              {/* Crosshairs */}
              <line x1="250" y1="0" x2="250" y2="300" stroke="var(--border-subtle)" strokeWidth="0.8" strokeDasharray="2 2" />
              <line x1="0" y1="150" x2="500" y2="150" stroke="var(--border-subtle)" strokeWidth="0.8" strokeDasharray="2 2" />

              {/* Rotating Radar Sweep Line */}
              <line
                x1="250"
                y1="150"
                x2={250 + 140 * Math.cos((angle * Math.PI) / 180)}
                y2={150 + 140 * Math.sin((angle * Math.PI) / 180)}
                stroke="var(--accent)"
                strokeWidth="2.5"
                opacity="0.95"
              />

              {/* Radar Sweep Arc Cone Highlight */}
              <path
                d={`M 250 150 L ${250 + 140 * Math.cos(((angle - 25) * Math.PI) / 180)} ${150 + 140 * Math.sin(((angle - 25) * Math.PI) / 180)} A 140 140 0 0 1 ${250 + 140 * Math.cos((angle * Math.PI) / 180)} ${150 + 140 * Math.sin((angle * Math.PI) / 180)} Z`}
                fill="var(--accent)"
                opacity="0.15"
              />

              {/* Cluster Nodes on Radar */}
              {filteredClusters.map((cluster) => {
                const isSelected = cluster.id === selectedClusterId;
                const nodeColor = cluster.riskLevel === 'CRITICAL' ? 'var(--critical)' : cluster.riskLevel === 'HIGH' ? 'var(--warning)' : 'var(--success)';

                return (
                  <g
                    key={cluster.id}
                    onClick={() => setSelectedClusterId(cluster.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Pulsing Radius Ring */}
                    <circle
                      cx={cluster.centerCoords.x}
                      cy={cluster.centerCoords.y}
                      r={isSelected ? '24' : '16'}
                      fill="none"
                      stroke={nodeColor}
                      strokeWidth={isSelected ? '2.5' : '1.2'}
                      opacity={isSelected ? 0.9 : 0.4}
                      style={{ animation: 'pulse 1.8s infinite' }}
                    />

                    {/* Outer Cluster Solid Node */}
                    <circle
                      cx={cluster.centerCoords.x}
                      cy={cluster.centerCoords.y}
                      r={isSelected ? '10' : '7'}
                      fill={nodeColor}
                    />

                    {/* Center Core Dot */}
                    <circle
                      cx={cluster.centerCoords.x}
                      cy={cluster.centerCoords.y}
                      r="3"
                      fill="#ffffff"
                    />

                    {/* Text Label */}
                    <g transform={`translate(${cluster.centerCoords.x + 12}, ${cluster.centerCoords.y + 4})`}>
                      <rect
                        x="-4"
                        y="-10"
                        width={cluster.name.length * 5.8 + 24}
                        height="18"
                        rx="4"
                        fill="var(--surface-card)"
                        stroke={isSelected ? 'var(--accent)' : 'var(--border)'}
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="2"
                        fill="var(--text-primary)"
                        fontSize="9.5"
                        fontWeight={isSelected ? '900' : '700'}
                      >
                        {cluster.name.split(' ')[0]} ({cluster.incidentCount})
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* CLUSTER SELECTOR CARDS LIST */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Select Cluster to Inspect Intelligence ({filteredClusters.length}):
            </span>

            {filteredClusters.map(cluster => {
              const isSelected = cluster.id === selectedClusterId;
              const borderColor = cluster.riskLevel === 'CRITICAL' ? 'var(--critical)' : cluster.riskLevel === 'HIGH' ? 'var(--warning)' : 'var(--success)';

              return (
                <div
                  key={cluster.id}
                  onClick={() => setSelectedClusterId(cluster.id)}
                  style={{
                    padding: '0.85rem 1rem',
                    backgroundColor: isSelected ? 'var(--accent-light)' : 'var(--surface-elevated)',
                    border: isSelected ? '2px solid var(--accent)' : `1px solid var(--border)`,
                    borderLeft: `4px solid ${borderColor}`,
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    transition: 'var(--transition-fast)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    boxShadow: isSelected ? 'var(--shadow-sm)' : 'none'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {cluster.name}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span>📍 {cluster.district}</span>
                      <span>•</span>
                      <span><strong>{cluster.incidentCount} Offenses</strong></span>
                      <span>•</span>
                      <span style={{ color: 'var(--critical)', fontWeight: 700 }}>Threat: {cluster.threatScore}/100</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span className={`badge ${cluster.riskLevel === 'CRITICAL' ? 'badge-critical' : 'badge-warning'}`} style={{ fontSize: '0.65rem' }}>
                      {cluster.riskLevel}
                    </span>
                    <ChevronRight size={16} color={isSelected ? 'var(--accent)' : 'var(--text-muted)'} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: COMPREHENSIVE CLUSTER DEEP INTELLIGENCE DRAWER */}
        <div style={{
          backgroundColor: 'var(--surface-elevated)',
          border: '1px solid var(--border-accent)',
          borderRadius: 'var(--radius-md)',
          padding: '1.2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          boxShadow: 'var(--shadow-sm)'
        }}>

          {/* Cluster Detail Header */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span className={`badge ${selectedCluster.riskLevel === 'CRITICAL' ? 'badge-critical' : 'badge-warning'}`} style={{ fontSize: '0.7rem' }}>
                {selectedCluster.riskLevel} SEVERITY • {selectedCluster.status.replace('_', ' ')}
              </span>
              <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--accent)' }}>
                📍 Radius Coverage: {selectedCluster.radiusKm} KM
              </span>
            </div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: '0.4rem', lineHeight: 1.3 }}>
              {selectedCluster.name}
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              District Jurisdiction: {selectedCluster.district} • Epicenter: {selectedCluster.centerCoords.label}
            </span>
          </div>

          {/* Quick Stats Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.65rem'
          }}>
            <div style={{ backgroundColor: 'var(--surface-muted)', padding: '0.65rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>INCIDENTS</span>
              <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>{selectedCluster.incidentCount} Cases</strong>
            </div>

            <div style={{ backgroundColor: 'var(--surface-muted)', padding: '0.65rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>THREAT INDEX</span>
              <strong style={{ fontSize: '1.05rem', color: 'var(--critical)' }}>{selectedCluster.threatScore}/100</strong>
            </div>

            <div style={{ backgroundColor: 'var(--surface-muted)', padding: '0.65rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>FINANCIAL LOSS</span>
              <strong style={{ fontSize: '0.9rem', color: 'var(--accent)' }}>{selectedCluster.financialImpact.split(' ')[0]}</strong>
            </div>
          </div>

          {/* Drawer Sub-Tabs */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            backgroundColor: 'var(--surface-muted)',
            padding: '0.25rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)'
          }}>
            {[
              { id: 'SPATIAL', label: '📊 Spatial Breakdown', icon: <Layers size={14} /> },
              { id: 'SUSPECT', label: '👤 Primary Culprit', icon: <UserCheck size={14} /> },
              { id: 'PATROL', label: '🚓 Patrol Advisory', icon: <Shield size={14} /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  flex: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  padding: '0.4rem 0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  border: 'none',
                  backgroundColor: activeTab === tab.id ? 'var(--accent)' : 'transparent',
                  color: activeTab === tab.id ? '#000000' : 'var(--text-secondary)'
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* TAB 1: SPATIAL CRIME BREAKDOWN */}
          {activeTab === 'SPATIAL' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{
                padding: '0.75rem 0.85rem',
                backgroundColor: 'var(--surface-muted)',
                borderRadius: 'var(--radius-sm)',
                borderLeft: '3px solid var(--accent)',
                fontSize: '0.78rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.4
              }}>
                <strong style={{ color: 'var(--text-primary)' }}>Modus Operandi Summary:</strong>
                <div style={{ marginTop: '0.2rem' }}>"{selectedCluster.primaryModusOperandi}"</div>
                <div style={{ marginTop: '0.35rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  ⏰ Peak Time Window: <strong style={{ color: 'var(--critical)' }}>{selectedCluster.activePeakHours}</strong>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Offense Composition Breakdown ({selectedCluster.crimeBreakdown.length} Offense Types):
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.4rem' }}>
                  {selectedCluster.crimeBreakdown.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--text-primary)' }}>
                        <span>{item.type}</span>
                        <strong style={{ color: 'var(--accent)' }}>{item.count} Cases ({item.percentage}%)</strong>
                      </div>
                      <div style={{ height: '7px', backgroundColor: 'var(--surface-muted)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${item.percentage}%`, height: '100%', backgroundColor: 'var(--accent)', borderRadius: '4px' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRIMARY CULPRIT & SYNDICATE */}
          {activeTab === 'SUSPECT' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{
                padding: '0.85rem 1rem',
                backgroundColor: 'var(--surface-muted)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    PRIMARY ACCUSED SUSPECT
                  </span>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-primary)', margin: '0.15rem 0 0 0' }}>
                    {selectedCluster.primarySuspect.name}
                  </h4>
                  <span style={{ fontSize: '0.76rem', color: 'var(--accent)', fontWeight: 700 }}>
                    Known Alias: "{selectedCluster.primarySuspect.alias}"
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                  <span className="badge badge-critical" style={{ fontSize: '0.65rem' }}>
                    RISK {selectedCluster.primarySuspect.riskScore}/100
                  </span>
                  <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    {selectedCluster.primarySuspect.firNumber}
                  </span>
                </div>
              </div>

              <div style={{
                padding: '0.75rem 0.85rem',
                backgroundColor: 'var(--surface-muted)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.76rem',
                color: 'var(--text-secondary)'
              }}>
                <strong>Intelligence Note:</strong> Suspect identified as central node operating within this spatial cluster radius. Associated with multi-district network logs.
              </div>

              {/* Navigation Action Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setActiveView('Network Analysis')}
                  style={{
                    flex: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    padding: '0.55rem 0.85rem',
                    backgroundColor: 'var(--accent)',
                    color: '#000000',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.78rem',
                    fontWeight: 900,
                    cursor: 'pointer'
                  }}
                >
                  <span>Open Individual Network</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: PATROL DISPATCH ADVISORY */}
          {activeTab === 'PATROL' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{
                padding: '0.85rem 1rem',
                backgroundColor: 'var(--surface-muted)',
                borderRadius: 'var(--radius-md)',
                borderLeft: '4px solid var(--success)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.8rem',
                color: 'var(--text-primary)',
                lineHeight: 1.45
              }}>
                <strong style={{ color: 'var(--success)', display: 'block', marginBottom: '0.3rem' }}>
                  🚓 Recommended Police Action & Countermeasures:
                </strong>
                {selectedCluster.patrolDispatchAdvisory}
              </div>

              {/* Interactive Dispatch Trigger Button */}
              <button
                onClick={() => handleDispatchPatrol(selectedCluster.name)}
                style={{
                  width: '100%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1rem',
                  backgroundColor: 'var(--critical)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.85rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: '0 0 14px rgba(239, 68, 68, 0.35)',
                  transition: 'var(--transition-fast)'
                }}
              >
                <Zap size={18} />
                <span>⚡ DISPATCH TACTICAL PATROL UNIT NOW</span>
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
