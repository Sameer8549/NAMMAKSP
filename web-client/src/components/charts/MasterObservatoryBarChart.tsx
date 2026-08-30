import React, { useState, useEffect, useRef } from 'react';
import { useRole } from '../../context/RoleContext';
import { MOCK_KARNATAKA_DISTRICTS } from '../../mock/mockDistricts';
import { dataService } from '../../services/mockDataService';
import {
  Activity,
  Zap,
  Sparkles,
  SlidersHorizontal,
  X,
  Filter,
  ShieldAlert,
  UserCheck,
  UserX,
  User,
  Shield,
  Share2,
  Users,
  MapPin,
  ChevronRight
} from 'lucide-react';

export type ChartViewMode = 'CATEGORY' | 'DISTRICT';
export type FilterSeverity = 'ALL' | 'CRITICAL' | 'HIGH' | 'MODERATE';

interface SuspectProfile {
  name: string;
  alias: string;
  age: number;
  gender: string;
  priorOffenses: number;
  riskScore: number;
  status: 'WANTED' | 'SUSPECT' | 'UNDER_INTERROGATION' | 'ARRESTED';
  syndicate: string;
}

interface VictimProfile {
  demographicGroup: string;
  description: string;
  vulnerabilityNote: string;
  impactedCount: number;
}

interface AssignedOfficer {
  name: string;
  badgeNumber: string;
  unit: string;
}

interface BarDataPoint {
  id: string;
  name: string;
  shortLabel: string;
  totalCases: number;
  liveCases: number;
  resolvedCases: number;
  pendingCases: number;
  clearanceRate: number;
  trendPercentage: number;
  riskStatus: 'HIGH_ALERT' | 'MODERATE' | 'NORMAL';
  dominantInfo: string;
  topHotspots: string;
  color: string;
  peakHours: string;
  syndicateCount: number;
  policeStationCount: number;
  pcrPatrolVans: number;
  linkedFIR: string;
  primarySuspects: SuspectProfile[];
  victimInfo: VictimProfile;
  assignedOfficer: AssignedOfficer;
}

export const MasterObservatoryBarChart: React.FC = () => {
  const { setActiveView } = useRole();
  const infoDrawerRef = useRef<HTMLDivElement>(null);

  const [viewMode, setViewMode] = useState<ChartViewMode>('CATEGORY');
  const [filterSeverity, setFilterSeverity] = useState<FilterSeverity>('ALL');

  const cases = dataService.getAllCases();
  const buildBar = (id: string, name: string, groupedCases: typeof cases, index: number): BarDataPoint => {
    const resolvedCases = groupedCases.filter(item => item.status === 'CLOSED').length;
    const districts = Array.from(new Set(groupedCases.map(item => item.location.district)));
    const stations = Array.from(new Set(groupedCases.map(item => item.location.station)));
    const accused = groupedCases.flatMap(item => item.accused).slice(0, 5);
    const highRisk = accused.some(item => item.riskScore >= 80);
    return {
      id, name, shortLabel: name.split(' ')[0], totalCases: groupedCases.length,
      liveCases: groupedCases.length - resolvedCases, resolvedCases,
      pendingCases: groupedCases.length - resolvedCases,
      clearanceRate: groupedCases.length ? Math.round(resolvedCases / groupedCases.length * 1000) / 10 : 0,
      trendPercentage: 0,
      riskStatus: highRisk || groupedCases.length > cases.length / 5 ? 'HIGH_ALERT' : groupedCases.length > cases.length / 10 ? 'MODERATE' : 'NORMAL',
      dominantInfo: groupedCases[0]?.modusOperandi.primaryMethod || 'No recorded method',
      topHotspots: districts.slice(0, 3).join(', ') || 'No district recorded',
      color: ['#2563eb', '#0f766e', '#d97706', '#be123c', '#7c3aed'][index % 5],
      peakHours: 'Not recorded in FIR dataset', syndicateCount: 0,
      policeStationCount: stations.length, pcrPatrolVans: 0,
      linkedFIR: groupedCases[0]?.firNumber || 'No FIR',
      primarySuspects: accused.map(item => ({
        name: item.name, alias: item.alias || '', age: item.age, gender: item.gender,
        priorOffenses: item.priorOffensesCount, riskScore: item.riskScore,
        status: item.status === 'UNDER_ARREST' ? 'ARRESTED' : item.status === 'ABSCONDING' ? 'WANTED' : item.status === 'INTERROGATED' ? 'UNDER_INTERROGATION' : 'SUSPECT',
        syndicate: item.knownSyndicateAffiliation || 'No affiliation recorded',
      })),
      victimInfo: {
        demographicGroup: 'Verified FIR-linked victim records',
        description: `${groupedCases.length} linked victim records across ${districts.length} district(s)`,
        vulnerabilityNote: 'No vulnerability attribute recorded in the source dataset',
        impactedCount: groupedCases.length,
      },
      assignedOfficer: {
        name: groupedCases[0]?.assignedOfficer.name || 'Unassigned',
        badgeNumber: groupedCases[0]?.assignedOfficer.badgeNumber || 'UNASSIGNED',
        unit: groupedCases[0]?.assignedOfficer.station || 'Not recorded',
      },
    };
  };

  const categoryBarData: BarDataPoint[] = Array.from(new Set(cases.map(item => item.category)))
    .map((category, index) => buildBar(`category-${index + 1}`, category, cases.filter(item => item.category === category), index));

  const districtBarData: BarDataPoint[] = MOCK_KARNATAKA_DISTRICTS.map(d => ({
    id: d.id,
    name: d.name,
    shortLabel: d.name.split(' ')[0],
    totalCases: d.totalCases,
    liveCases: d.totalCases,
    resolvedCases: d.resolvedCases,
    pendingCases: d.pendingCases,
    clearanceRate: d.clearanceRate,
    trendPercentage: d.trendPercentage,
    riskStatus: d.riskStatus === 'HIGH_ALERT' ? 'HIGH_ALERT' : d.riskStatus === 'MODERATE' ? 'MODERATE' : 'NORMAL',
    dominantInfo: `Dominant category: ${d.dominantCategory}`,
    topHotspots: Array.from(new Set(cases.filter(item => item.location.district === d.name).map(item => item.location.station))).slice(0, 3).join(', ') || 'No station recorded',
    color: d.riskStatus === 'HIGH_ALERT' ? '#ef4444' : d.riskStatus === 'MODERATE' ? '#f59e0b' : '#10b981',
    peakHours: 'Not recorded in FIR dataset',
    syndicateCount: 0,
    policeStationCount: new Set(cases.filter(item => item.location.district === d.name).map(item => item.location.station)).size,
    pcrPatrolVans: 0,
    linkedFIR: cases.find(item => item.location.district === d.name)?.firNumber || 'No FIR',
    primarySuspects: cases.filter(item => item.location.district === d.name).flatMap(item => item.accused).slice(0, 5).map(item => ({
      name: item.name, alias: item.alias || '', age: item.age, gender: item.gender,
      priorOffenses: item.priorOffensesCount, riskScore: item.riskScore,
      status: item.status === 'UNDER_ARREST' ? 'ARRESTED' : item.status === 'ABSCONDING' ? 'WANTED' : item.status === 'INTERROGATED' ? 'UNDER_INTERROGATION' : 'SUSPECT',
      syndicate: item.knownSyndicateAffiliation || 'No affiliation recorded',
    })),
    victimInfo: {
      demographicGroup: `Verified victim records in ${d.name}`,
      description: `${d.totalCases} FIR-linked victim records`,
      vulnerabilityNote: 'No vulnerability attribute recorded in the source dataset',
      impactedCount: d.totalCases,
    },
    assignedOfficer: { name: 'District command pool', badgeNumber: d.karnatakaCode, unit: `${d.name} district` }
  }));

  // Select dataset based on viewMode
  const rawDataset = viewMode === 'CATEGORY' ? categoryBarData : districtBarData;

  // Filter dataset based on severity filter
  const filteredDataset = rawDataset.filter(item => {
    if (filterSeverity === 'ALL') return true;
    if (filterSeverity === 'CRITICAL') return item.riskStatus === 'HIGH_ALERT' && item.trendPercentage > 20;
    if (filterSeverity === 'HIGH') return item.riskStatus === 'HIGH_ALERT';
    if (filterSeverity === 'MODERATE') return item.riskStatus === 'MODERATE';
    return true;
  });

  // Moving telemetry ticker state
  const [datasetState, setDatasetState] = useState<BarDataPoint[]>(filteredDataset);
  const [selectedBar, setSelectedBar] = useState<BarDataPoint | null>(filteredDataset[0] || null);
  const [modalTab, setModalTab] = useState<'USERS_SUSPECTS' | 'OVERVIEW' | 'HOTSPOTS' | 'PATTERN'>('USERS_SUSPECTS');
  const [tick, setTick] = useState(0);

  // Sync dataset when filters change
  useEffect(() => {
    setDatasetState(filteredDataset);
    if (filteredDataset.length > 0) {
      setSelectedBar(filteredDataset[0]);
    } else {
      setSelectedBar(null);
    }
  }, [viewMode, filterSeverity]);

  // Dynamic Color Shift helper function ("Green getting Red, Red getting Green")
  const getDynamicColor = (cases: number, trend: number): { hex: string; label: string } => {
    if (trend > 25 || cases > 3200) {
      return { hex: '#ef4444', label: '🔴 CRITICAL SURGE (RED)' };
    } else if (trend > 10 || cases > 2200) {
      return { hex: '#f59e0b', label: '🟠 HIGH RISK (ORANGE)' };
    } else if (trend > 0 || cases > 1400) {
      return { hex: '#eab308', label: '🟡 MODERATE (YELLOW)' };
    } else {
      return { hex: '#10b981', label: '🟢 STABLE / SOLVED (GREEN)' };
    }
  };

  // Live animation loop
  useEffect(() => {
    const timer = setInterval(() => {
      setTick(prev => prev + 1);
      setDatasetState(prev =>
        prev.map((item, idx) => {
          const shift = Math.floor(Math.sin((tick * 0.4) + idx * 1.5) * 450);
          const newLiveCases = Math.max(800, item.totalCases + shift);
          const newTrend = Number((item.trendPercentage + Math.sin(tick + idx) * 8).toFixed(1));
          
          const dynamicCol = getDynamicColor(newLiveCases, newTrend);

          return {
            ...item,
            liveCases: newLiveCases,
            trendPercentage: newTrend,
            color: dynamicCol.hex
          };
        })
      );
    }, 1200);

    return () => clearInterval(timer);
  }, [tick]);

  const maxVal = Math.max(...datasetState.map(d => d.liveCases), 4500);

  // Handle Clicking ANY Vertical Bar: Selects bar AND smoothly scrolls user down to complete user/suspect drawer!
  const handleBarClick = (item: BarDataPoint) => {
    setSelectedBar(item);
    setModalTab('USERS_SUSPECTS'); // Default directly to Desired Users & Suspects Audit Tab!
    
    // Smooth auto-scroll to the information drawer
    setTimeout(() => {
      if (infoDrawerRef.current) {
        infoDrawerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
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
      
      {/* 1. MASTER HEADER & DYNAMIC CONTROLS */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Activity size={22} color="var(--accent)" style={{ animation: 'pulse 1.5s infinite' }} />
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
              Karnataka State Live Telemetry Bar Observatory
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
              Click any bar to instantly scroll and view complete Accused, Suspect & User Audit Information.
            </p>
          </div>
        </div>

        {/* Live Stream Ticker Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{
            fontSize: '0.72rem',
            fontWeight: 800,
            color: 'var(--success)',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            padding: '0.35rem 0.75rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}>
            <Zap size={14} />
            <span>DYNAMIC COLOR & TELEMETRY STREAM ACTIVE</span>
          </span>
        </div>
      </div>

      {/* 2. MULTI-PARAMETER FILTER CONTROL BAR */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        padding: '0.65rem 1rem',
        backgroundColor: 'var(--surface-muted)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)'
      }}>
        {/* View Mode Selector Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginRight: '0.2rem' }}>
            <SlidersHorizontal size={14} /> VIEW MODE:
          </span>
          <button
            onClick={() => setViewMode('CATEGORY')}
            style={{
              fontSize: '0.74rem',
              fontWeight: 800,
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              border: `1.5px solid ${viewMode === 'CATEGORY' ? 'var(--accent)' : 'var(--border)'}`,
              backgroundColor: viewMode === 'CATEGORY' ? 'var(--accent)' : 'var(--surface-card)',
              color: viewMode === 'CATEGORY' ? '#000000' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            BY CRIME CATEGORY
          </button>
          <button
            onClick={() => setViewMode('DISTRICT')}
            style={{
              fontSize: '0.74rem',
              fontWeight: 800,
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              border: `1.5px solid ${viewMode === 'DISTRICT' ? 'var(--accent)' : 'var(--border)'}`,
              backgroundColor: viewMode === 'DISTRICT' ? 'var(--accent)' : 'var(--surface-card)',
              color: viewMode === 'DISTRICT' ? '#000000' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            BY DISTRICT
          </button>
        </div>

        {/* Severity Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginRight: '0.2rem' }}>
            <Filter size={14} /> RISK FILTER:
          </span>
          {(['ALL', 'CRITICAL', 'HIGH', 'MODERATE'] as FilterSeverity[]).map(f => (
            <button
              key={f}
              onClick={() => setFilterSeverity(f)}
              style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                padding: '0.3rem 0.6rem',
                borderRadius: '4px',
                border: '1px solid var(--border)',
                backgroundColor: filterSeverity === f ? 'var(--accent)' : 'var(--surface-card)',
                color: filterSeverity === f ? '#000000' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. DYNAMIC COLOR TRANSITION VERTICAL BAR GRAPH                             */}
      {/* ========================================================================= */}
      <div style={{
        backgroundColor: 'var(--surface-card)',
        border: '1.5px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '1.5rem 1.25rem 1.25rem 1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', width: '100%', height: '300px' }}>
          
          {/* Y-AXIS SCALE NUMBERS */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            paddingRight: '0.85rem',
            borderRight: '2px solid var(--border)',
            fontSize: '0.7rem',
            fontWeight: 800,
            color: 'var(--text-muted)',
            textAlign: 'right',
            userSelect: 'none',
            paddingBottom: '2.5rem'
          }}>
            <span>4,500</span>
            <span>3,375</span>
            <span>2,250</span>
            <span>1,125</span>
            <span>0</span>
          </div>

          {/* MAIN GRAPH CANVAS AREA WITH HORIZONTAL GRIDLINES */}
          <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
            
            {/* Gridlines */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: '2.5rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              pointerEvents: 'none',
              opacity: 0.2
            }}>
              {[0, 1, 2, 3, 4].map(idx => (
                <div key={idx} style={{ borderBottom: '1px dashed var(--border)', width: '100%' }} />
              ))}
            </div>

            {/* BARS CONTAINER */}
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-around',
              paddingBottom: '0.5rem',
              position: 'relative',
              gap: '0.85rem',
              zIndex: 2
            }}>
              {datasetState.map(item => {
                const isSelected = selectedBar?.id === item.id;
                const heightPct = Math.min(100, Math.max(12, (item.liveCases / maxVal) * 100));
                const solvedPct = (item.resolvedCases / item.liveCases) * 100;
                const dynamicInfo = getDynamicColor(item.liveCases, item.trendPercentage);

                return (
                  <div
                    key={item.id}
                    onClick={() => handleBarClick(item)}
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
                    title={`Click bar to view complete Suspect & User information for ${item.name}`}
                  >
                    {/* VALUE BADGE ABOVE BAR */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      marginBottom: '0.4rem',
                      transition: 'all 400ms ease'
                    }}>
                      <span style={{
                        fontSize: '0.74rem',
                        fontWeight: 900,
                        color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
                        backgroundColor: 'var(--surface-elevated)',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px',
                        border: `1px solid ${dynamicInfo.hex}`,
                        boxShadow: `0 0 10px ${dynamicInfo.hex}44`
                      }}>
                        {item.liveCases}
                      </span>
                      <span style={{
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        color: dynamicInfo.hex,
                        marginTop: '0.1rem'
                      }}>
                        {item.trendPercentage > 0 ? `+${item.trendPercentage}%` : `${item.trendPercentage}%`}
                      </span>
                    </div>

                    {/* VERTICAL BAR COLUMN */}
                    <div style={{
                      width: '100%',
                      maxWidth: '48px',
                      height: `${heightPct}%`,
                      backgroundColor: 'var(--surface-muted)',
                      borderRadius: '6px 6px 0 0',
                      border: isSelected ? '2.5px solid var(--accent)' : `1.5px solid ${dynamicInfo.hex}`,
                      boxShadow: isSelected ? `0 0 24px ${dynamicInfo.hex}` : `0 0 10px ${dynamicInfo.hex}33`,
                      overflow: 'hidden',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-end',
                      transition: 'height 400ms cubic-bezier(0.4, 0, 0.2, 1), border-color 800ms ease, box-shadow 800ms ease'
                    }}>
                      {/* Solved Cases Fill */}
                      <div style={{
                        height: `${solvedPct}%`,
                        backgroundColor: dynamicInfo.hex,
                        opacity: isSelected ? 1 : 0.88,
                        transition: 'height 400ms ease, background-color 800ms cubic-bezier(0.4, 0, 0.2, 1)',
                        position: 'relative'
                      }}>
                        {/* Moving Signal Wave Cap */}
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: '4px',
                          backgroundColor: '#ffffff',
                          opacity: 0.85,
                          animation: 'pulse 1.2s infinite'
                        }} />
                      </div>

                      {/* Pending Cases Fill */}
                      <div style={{
                        flex: 1,
                        backgroundColor: `${dynamicInfo.hex}22`,
                        borderTop: '1px dashed rgba(255,255,255,0.25)'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* X-AXIS LINE & LABELS */}
            <div style={{
              borderTop: '2px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-around',
              paddingTop: '0.5rem',
              gap: '0.85rem',
              height: '2rem'
            }}>
              {datasetState.map(item => {
                const isSelected = selectedBar?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleBarClick(item)}
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      fontSize: '0.74rem',
                      fontWeight: isSelected ? 900 : 700,
                      color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                    title={item.name}
                  >
                    {item.shortLabel}
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. COMPLETE USER, SUSPECT & ACCUSED AUDIT DRAWER (SCROLLED TO ON BAR CLICK) */}
      {/* ========================================================================= */}
      {selectedBar ? (
        <div
          ref={infoDrawerRef}
          style={{
            backgroundColor: 'var(--surface-card)',
            border: `2px solid ${selectedBar.color}`,
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            boxShadow: `0 0 25px ${selectedBar.color}33`,
            animation: 'fadeIn 300ms ease-out'
          }}
        >
          {/* Header Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                backgroundColor: `${selectedBar.color}20`,
                border: `2px solid ${selectedBar.color}`,
                display: 'grid',
                placeItems: 'center'
              }}>
                <User size={22} color={selectedBar.color} />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h4 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
                    {selectedBar.name}: User & Accused Profile Audit
                  </h4>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 900,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '4px',
                    backgroundColor: `${selectedBar.color}25`,
                    color: selectedBar.color,
                    border: `1px solid ${selectedBar.color}`
                  }}>
                    {selectedBar.riskStatus.replace('_', ' ')} SEVERITY
                  </span>
                </div>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                  Complete User, Accused Suspect Network & Impacted Victim Intelligence Stream
                </p>
              </div>
            </div>

            <button
              onClick={() => setSelectedBar(null)}
              style={{
                background: 'var(--surface-muted)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer'
              }}
              title="Close Information Panel"
            >
              <X size={18} />
            </button>
          </div>

          {/* Intelligence Navigation Tabs */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '0.5rem',
            flexWrap: 'wrap'
          }}>
            {[
              { id: 'USERS_SUSPECTS', label: '👤 Accused & Suspects Audit', icon: UserCheck },
              { id: 'OVERVIEW', label: '📊 Telemetry Overview', icon: Activity },
              { id: 'HOTSPOTS', label: '📍 Regional Hotspots', icon: MapPin },
              { id: 'PATTERN', label: '🔍 Modus Operandi Pattern', icon: Sparkles }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setModalTab(t.id as any)}
                style={{
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  padding: '0.45rem 0.9rem',
                  borderRadius: 'var(--radius-sm)',
                  border: modalTab === t.id ? '1.5px solid var(--accent)' : '1px solid transparent',
                  backgroundColor: modalTab === t.id ? 'var(--surface-hover)' : 'transparent',
                  color: modalTab === t.id ? 'var(--accent)' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: ACCUSED, SUSPECTS & DESIRED USER INFORMATION                       */}
          {/* ========================================================================= */}
          {modalTab === 'USERS_SUSPECTS' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* PRIMARY ACCUSED & SUSPECT CARDS */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <h5 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <UserX size={16} color="var(--critical)" />
                    Primary Identified Accused & Suspect Profiles ({selectedBar.primarySuspects.length} Persons):
                  </h5>
                  <span style={{ fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 700 }}>
                    FIR Reference: {selectedBar.linkedFIR}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                  {selectedBar.primarySuspects.map((suspect, idx) => (
                    <div key={idx} style={{
                      padding: '1rem',
                      backgroundColor: 'var(--surface-muted)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.65rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)', display: 'block' }}>
                            {suspect.name}
                          </strong>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Alias: <strong style={{ color: 'var(--accent)' }}>{suspect.alias}</strong> | Age: {suspect.age} ({suspect.gender})
                          </span>
                        </div>
                        <span className={`badge ${suspect.status === 'WANTED' ? 'badge-critical' : 'badge-warning'}`} style={{ fontSize: '0.68rem' }}>
                          {suspect.status}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                        <span>Prior Recorded Offenses:</span>
                        <strong style={{ color: 'var(--critical)' }}>{suspect.priorOffenses} FIR Cases</strong>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                        <span>Syndicate Affiliation:</span>
                        <strong style={{ color: 'var(--text-primary)' }}>{suspect.syndicate}</strong>
                      </div>

                      {/* Risk Bar */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', fontWeight: 800 }}>
                          <span style={{ color: 'var(--text-muted)' }}>AI REPEAT OFFENSE RISK SCORE:</span>
                          <span style={{ color: 'var(--critical)' }}>{suspect.riskScore} / 100</span>
                        </div>
                        <div style={{ height: '6px', backgroundColor: 'var(--surface-card)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${suspect.riskScore}%`, height: '100%', backgroundColor: 'var(--critical)' }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* IMPACTED CITIZEN & VICTIM DEMOGRAPHICS */}
              <div style={{
                padding: '1rem 1.1rem',
                backgroundColor: 'var(--surface-muted)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h5 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Users size={16} color="var(--accent)" />
                    Impacted Citizen & Victim User Demographic Profile:
                  </h5>
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--accent)' }}>
                    ~{selectedBar.victimInfo.impactedCount} Citizens Impacted
                  </span>
                </div>

                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Target Demographic Group: <span style={{ color: 'var(--accent)' }}>{selectedBar.victimInfo.demographicGroup}</span>
                </div>

                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  <strong>Incident Impact Description:</strong> {selectedBar.victimInfo.description}
                </div>

                <div style={{ fontSize: '0.74rem', color: 'var(--warning)', fontWeight: 700 }}>
                  ⚠️ Primary Vulnerability Factor: {selectedBar.victimInfo.vulnerabilityNote}
                </div>
              </div>

              {/* ASSIGNED INVESTIGATING OFFICER */}
              <div style={{
                padding: '0.9rem 1.1rem',
                backgroundColor: 'var(--surface-muted)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Shield size={20} color="var(--success)" />
                  <div>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block' }}>
                      ASSIGNED INVESTIGATING OFFICER
                    </span>
                    <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                      {selectedBar.assignedOfficer.name} ({selectedBar.assignedOfficer.badgeNumber})
                    </strong>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'block' }}>
                      Unit: {selectedBar.assignedOfficer.unit}
                    </span>
                  </div>
                </div>

                {/* Direct Action Buttons to Switch to Suspect Network or Demographics View */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    className="admin-btn-secondary"
                    style={{ fontSize: '0.72rem', padding: '0.4rem 0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    onClick={() => setActiveView('Network Analysis')}
                  >
                    <Share2 size={14} />
                    <span>INSPECT SUSPECT NETWORK GRAPH</span>
                    <ChevronRight size={13} />
                  </button>

                  <button
                    className="admin-btn-secondary"
                    style={{ fontSize: '0.72rem', padding: '0.4rem 0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    onClick={() => setActiveView('Demographics')}
                  >
                    <Users size={14} />
                    <span>VIEW DEMOGRAPHICS STREAM</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: OVERVIEW METRICS GRID */}
          {modalTab === 'OVERVIEW' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '0.85rem'
              }}>
                <div style={{ padding: '0.9rem', backgroundColor: 'var(--surface-muted)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block' }}>
                    CURRENT LIVE VOLUME
                  </span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                    {selectedBar.liveCases}
                  </span>
                  <span style={{ fontSize: '0.74rem', color: selectedBar.trendPercentage > 0 ? 'var(--critical)' : 'var(--success)', fontWeight: 800, display: 'block', marginTop: '0.2rem' }}>
                    {selectedBar.trendPercentage > 0 ? `▲ +${selectedBar.trendPercentage}% Surge` : `▼ ${selectedBar.trendPercentage}% Decline`}
                  </span>
                </div>

                <div style={{ padding: '0.9rem', backgroundColor: 'var(--surface-muted)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block' }}>
                    CLEARANCE EFFICIENCY
                  </span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--success)' }}>
                    {selectedBar.clearanceRate}%
                  </span>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.2rem' }}>
                    {selectedBar.resolvedCases} Solved | {selectedBar.pendingCases} Pending
                  </span>
                </div>

                <div style={{ padding: '0.9rem', backgroundColor: 'var(--surface-muted)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block' }}>
                    PEAK INCIDENT WINDOW
                  </span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--accent)', marginTop: '0.2rem', display: 'block' }}>
                    {selectedBar.peakHours}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.2rem' }}>
                    Highest Offense Density
                  </span>
                </div>

                <div style={{ padding: '0.9rem', backgroundColor: 'var(--surface-muted)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block' }}>
                    POLICE STATIONS & PCR
                  </span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: '0.2rem', display: 'block' }}>
                    {selectedBar.policeStationCount} Stations ({selectedBar.pcrPatrolVans} Vans)
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 700, display: 'block', marginTop: '0.2rem' }}>
                    Active Patrol Telemetry
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DISTRICT HOTSPOTS */}
          {modalTab === 'HOTSPOTS' && (
            <div style={{
              padding: '1rem',
              backgroundColor: 'var(--surface-muted)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <h5 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Primary Hotspot Sectors & Regional Spread:
              </h5>
              <div style={{ fontSize: '0.84rem', color: 'var(--accent)', fontWeight: 800 }}>
                📍 {selectedBar.topHotspots}
              </div>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.45, margin: 0 }}>
                Incidents under {selectedBar.name} are geographically concentrated around commercial hubs and major transit intersections in these primary sectors.
              </p>
            </div>
          )}

          {/* TAB 4: PATTERN ANALYSIS */}
          {modalTab === 'PATTERN' && (
            <div style={{
              padding: '1rem',
              backgroundColor: 'var(--surface-muted)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem'
            }}>
              <h5 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Dominant Modus Operandi & Vector Mechanics:
              </h5>
              <div style={{ fontSize: '0.84rem', color: 'var(--text-primary)', lineHeight: 1.45, fontWeight: 600 }}>
                {selectedBar.dominantInfo}
              </div>
            </div>
          )}

          {/* Footer AI Recommendation & Action Buttons */}
          <div style={{
            padding: '0.95rem 1.1rem',
            backgroundColor: 'rgba(217, 119, 6, 0.12)',
            border: '1px solid rgba(217, 119, 6, 0.35)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.85rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={18} color="var(--accent)" />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                AI Strategy: Deploy specialized <strong>{selectedBar.shortLabel}</strong> taskforce to high-density hubs.
              </span>
            </div>

            <button
              className="admin-btn-primary"
              style={{ fontSize: '0.78rem', padding: '0.5rem 1rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              onClick={() => alert(`Command taskforce deployed for ${selectedBar.name}!`)}
            >
              <ShieldAlert size={16} />
              <span>DEPLOY SPECIALIZED TASKFORCE</span>
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
          border: '1px solid var(--border-subtle)'
        }}>
          💡 Click or press on any vertical bar in the graph above to view complete intelligence audit.
        </div>
      )}

    </div>
  );
};
