import React, { useState, useEffect } from 'react';
import { useRole } from '../../context/RoleContext';
import { useLanguage } from '../../context/LanguageContext';
import { WorkloadHistogramChart } from '../charts/WorkloadHistogramChart';
import { Modal } from '../common/Modal';
import { WhiteSheetModal } from '../common/WhiteSheetModal';
import { exportDashboardToCSV } from '../../services/reportExportService';
import { ExportMenu } from '../common/ExportMenu';
import { dataService } from '../../services/mockDataService';
import { apiClient } from '../../services/apiClient';
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';
import {
  Users,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Clock,
  UserCheck,
  UserX,
  Zap,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import { CaseDetailView } from '../detail/CaseDetailView';
import type { CaseRecord } from '../../types/crime';
import { SupervisorCommandIntelligence } from './SupervisorCommandIntelligence';

interface SupervisorDashboardProps {
  onOpenExplainModal?: () => void;
  onOpenChatDrawer?: () => void;
}

type SupervisorTab =
  | 'WORKLOAD'
  | 'PERFORMANCE'
  | 'AGING'
  | 'BOTTLENECKS'
  | 'OFFICER_REVIEW';


export const SupervisorDashboard: React.FC<SupervisorDashboardProps> = ({ onOpenExplainModal }) => {
  const { activeView } = useRole();
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<SupervisorTab>('WORKLOAD');
  const [isWhiteSheetOpen, setIsWhiteSheetOpen] = useState(false);

  // Dynamic state for workloads, bottlenecks & delayed cases
  const initialWorkloads = dataService.getOfficerWorkloads();
  const [workloads, setWorkloads] = useState(initialWorkloads);

  const [bottlenecks, setBottlenecks] = useState<any[]>(dataService.getSupervisorBottlenecks());


  const [delayedCases, setDelayedCases] = useState<any[]>(() => dataService.getAllCases()
    .filter((record) => record.status !== 'CLOSED' && record.daysAging >= 30)
    .sort((a, b) => b.daysAging - a.daysAging)
    .slice(0, 30)
    .map((record) => ({
      fir: record.firNumber,
      title: record.title,
      officer: record.assignedOfficer.name,
      daysOpen: record.daysAging,
      actionNeeded: `Review ${record.status.replaceAll('_', ' ').toLowerCase()} case and record the next action`,
      status: 'PENDING',
    })));

  // Modal & Notification states
  const [selectedBottleneck, setSelectedBottleneck] = useState<any | null>(null);
  const [selectedOfficerToReassign, setSelectedOfficerToReassign] = useState<any | null>(null);
  const [reassignTargetOfficer, setReassignTargetOfficer] = useState<string>('OFF-004');
  const [actionSuccessToast, setActionSuccessToast] = useState<string | null>(null);
  const [selectedCaseDetail, setSelectedCaseDetail] = useState<CaseRecord | null>(null);

  // Officer Profile History Modal state
  const [viewedOfficerProfile, setViewedOfficerProfile] = useState<any | null>(null);

  const overdueCount = delayedCases.length;
  const stationPerformance = Array.from(dataService.getAllCases().reduce((groups, record) => {
    const station = record.location?.station || record.assignedOfficer?.station || record.location?.district;
    const key = station || 'Command scope';
    const current = groups.get(key) || { station: key, district: record.location?.district || 'Karnataka', resolved: 0, pending: 0, totalDays: 0, total: 0 };
    current.total += 1;
    current.totalDays += Number(record.daysAging || 0);
    if (record.status === 'CLOSED') current.resolved += 1;
    else current.pending += 1;
    groups.set(key, current);
    return groups;
  }, new Map<string, { station: string; district: string; resolved: number; pending: number; totalDays: number; total: number }>()).values())
    .map(item => {
      const rate = item.total ? Math.round((item.resolved / item.total) * 1000) / 10 : 0;
      return { ...item, rate, avgDays: `${Math.round(item.totalDays / Math.max(item.total, 1))} days`, badge: rate >= 75 ? 'Strong clearance' : rate >= 50 ? 'Monitor' : 'Review needed', color: rate >= 75 ? 'var(--success)' : rate >= 50 ? 'var(--info)' : 'var(--warning)' };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);
  const commandCases = dataService.getAllCases();
  const closedCases = commandCases.filter(record => record.status === 'CLOSED');
  const clearanceRate = commandCases.length ? (closedCases.length / commandCases.length) * 100 : 0;
  const overloadedOfficers = workloads.filter(item => item.capacityUtilization > 90);
  const availableOfficer = [...workloads].sort((a, b) => a.capacityUtilization - b.capacityUtilization)[0];
  const activeCases = commandCases.filter(record => record.status !== 'CLOSED');
  const ageingBrackets = [
    { label: '< 15 Days (Fresh Cases)', records: activeCases.filter(record => record.daysAging < 15), color: 'var(--success)', note: 'On-schedule progress' },
    { label: '15 to 30 Days (Active Review)', records: activeCases.filter(record => record.daysAging >= 15 && record.daysAging < 30), color: 'var(--warning)', note: 'Approaching limit' },
    { label: '30 to 60 Days (Delayed Cases)', records: activeCases.filter(record => record.daysAging >= 30 && record.daysAging < 60), color: 'var(--critical)', note: 'Review required' },
    { label: '60+ Days (Critical Overdue)', records: activeCases.filter(record => record.daysAging >= 60), color: '#dc2626', note: 'Immediate action needed' },
  ].map(item => ({ ...item, count: item.records.length, percentage: activeCases.length ? Math.round((item.records.length / activeCases.length) * 100) : 0 }));

  // Map role context activeView to Supervisor dashboard tab bidirectionally
  useEffect(() => {
    if (activeView) {
      const v = activeView.trim().toLowerCase();
      if (v.includes('workload')) {
        setActiveTab('WORKLOAD');
      } else if (v.includes('station performance') || (v.includes('station') && !v.includes('review'))) {
        setActiveTab('PERFORMANCE');
      } else if (v.includes('aging') || v.includes('ageing')) {
        setActiveTab('AGING');
      } else if (v.includes('bottleneck') || v.includes('delay') || v.includes('tracker') || v.includes('stalled')) {
        setActiveTab('BOTTLENECKS');
      } else if (v.includes('officer review') || v.includes('review') || v.includes('officer')) {
        setActiveTab('OFFICER_REVIEW');
      }
    }
  }, [activeView]);


  const handleApproveBottleneck = (botId: string) => {
    setBottlenecks(prev => prev.map(b => b.id === botId ? { ...b, status: 'APPROVED' } : b));
    setActionSuccessToast('Recommendation marked for supervisor review. No case assignment was changed.');
    setTimeout(() => setActionSuccessToast(null), 4000);
    setSelectedBottleneck(null);
  };

  const handleRejectBottleneck = (botId: string) => {
    setBottlenecks(prev => prev.map(b => b.id === botId ? { ...b, status: 'REJECTED' } : b));
    setActionSuccessToast('❌ Solution Plan Rejected by Supervisor. Sent back to IO for revised proposal.');
    setTimeout(() => setActionSuccessToast(null), 4000);
    setSelectedBottleneck(null);
  };

  const handleApproveDelayedCase = (fir: string) => {
    setDelayedCases(prev => prev.map(c => c.fir === fir ? { ...c, status: 'APPROVED' } : c));
    setActionSuccessToast(`✅ Review Approved for ${fir}`);
    setTimeout(() => setActionSuccessToast(null), 4000);
  };

  const handleRejectDelayedCase = (fir: string) => {
    setDelayedCases(prev => prev.map(c => c.fir === fir ? { ...c, status: 'REJECTED' } : c));
    setActionSuccessToast(`❌ Review Rejected for ${fir}. Returned to IO.`);
    setTimeout(() => setActionSuccessToast(null), 4000);
  };

  const inspectCaseByFir = (firNumber: string) => {
    const found = dataService.getAllCases().find(c => c.firNumber === firNumber || c.id === firNumber);
    if (found) {
      setSelectedCaseDetail(found);
    } else {
      setActionSuccessToast(`FIR ${firNumber} is not present in the verified command registry.`);
      setTimeout(() => setActionSuccessToast(null), 4000);
    }
  };

  // Manual Reassignment Execution
  const handleExecuteReassignment = async () => {
    if (selectedOfficerToReassign) {
      const target = workloads.find(officer => officer.officerId === reassignTargetOfficer);
      const selectedCases = dataService.getAllCases().filter(record => record.status !== 'CLOSED' && (record.assignedOfficer.id === selectedOfficerToReassign.officerId || record.assignedOfficer.name === selectedOfficerToReassign.officerName)).slice(0, 2);
      if (!target || !selectedCases.length) {
        setActionSuccessToast('No eligible command-scoped case is available for reassignment.');
        return;
      }
      try {
        await Promise.all(selectedCases.map(record => apiClient.reassignCase(record.firNumber, target.officerName, `Supervisor workload transfer from ${selectedOfficerToReassign.officerName}`)));
        await dataService.hydrate();
        setWorkloads([...dataService.getOfficerWorkloads()]);
        setActionSuccessToast(`${selectedCases.length} verified case${selectedCases.length === 1 ? '' : 's'} reassigned to ${target.officerName}.`);
        setSelectedOfficerToReassign(null);
      } catch (error) {
        setActionSuccessToast(error instanceof Error ? error.message : 'Reassignment failed.');
      }
      setTimeout(() => setActionSuccessToast(null), 4000);
    } else if (selectedBottleneck) {
      handleApproveBottleneck(selectedBottleneck.id);
    }
  };

  const commandView = activeView.toLowerCase();
  if (commandView.includes('alert inbox')) return <SupervisorCommandIntelligence view="alerts" />;
  if (commandView.includes('forecast review')) return <SupervisorCommandIntelligence view="forecast" />;
  if (commandView.includes('command audit')) return <SupervisorCommandIntelligence view="audit" />;

  return (
    <div className="supervisor-dashboard" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'relative' }}>
      
      {/* CLEAR VISIBLE FLOATING TOAST NOTIFICATION AT BOTTOM-RIGHT */}
      {actionSuccessToast && (
        <div style={{
          position: 'fixed',
          bottom: '30px',
          right: '30px',
          zIndex: 100000,
          backgroundColor: 'var(--surface-elevated)',
          color: 'var(--text-primary)',
          border: '2px solid var(--accent)',
          padding: '1rem 1.4rem',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(234, 179, 8, 0.25)',
          fontSize: '0.88rem',
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          maxWidth: '460px',
          backdropFilter: 'blur(10px)',
          animation: 'fadeIn 250ms cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          <div style={{
            padding: '0.4rem',
            borderRadius: '50%',
            backgroundColor: 'rgba(16, 185, 129, 0.2)',
            color: 'var(--success)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <CheckCircle2 size={22} />
          </div>
          <span style={{ lineHeight: 1.4 }}>{actionSuccessToast}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. EXECUTIVE OPERATIONAL METRICS STRIP WITH FAST MOVING NUMBERS            */}
      {/* ========================================================================= */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
        
        {/* Metric 1: Aging Cases */}
        <div style={{
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem 1.2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              AGING CASES (&gt; 30 DAYS)
            </span>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--critical)', marginTop: '0.15rem', transition: 'all 200ms ease' }}>
              {overdueCount} Cases <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--critical)' }}>30+ days</span>
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{new Set(delayedCases.map(item => dataService.getCaseById(item.fir)?.location.district).filter(Boolean)).size} districts require review</span>
          </div>
          <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--critical)' }}>
            <Clock size={20} />
          </div>
        </div>

        {/* Metric 2: Overloaded Officers */}
        <div style={{
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem 1.2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              OVERLOADED OFFICERS (&gt;90%)
            </span>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--critical)', marginTop: '0.15rem', transition: 'all 200ms ease' }}>
              {overloadedOfficers.length} Officers <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--critical)' }}>High Load</span>
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{overloadedOfficers.slice(0,2).map(item => item.officerName).join(' · ') || 'No officer above threshold'}</span>
          </div>
          <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--critical)' }}>
            <UserX size={20} />
          </div>
        </div>

        {/* Metric 3: Station Clearance Rate */}
        <div style={{
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem 1.2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              CASE CLEARANCE RATE
            </span>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--success)', marginTop: '0.15rem', transition: 'all 200ms ease' }}>
              {clearanceRate.toFixed(1)}% <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--success)' }}>Verified FIRs</span>
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{closedCases.length} closed in command scope</span>
          </div>
          <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)' }}>
            <CheckCircle2 size={20} />
          </div>
        </div>

        {/* Metric 4: Available Capacity */}
        <div style={{
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem 1.2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              AVAILABLE CAPACITY
            </span>
            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--accent)', marginTop: '0.15rem' }}>
              {availableOfficer?.officerName || 'No workload record'}
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{availableOfficer ? `${availableOfficer.capacityUtilization}% capacity · ${availableOfficer.station}` : 'Workload data unavailable'}</span>
          </div>
          <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(217, 119, 6, 0.15)', color: 'var(--accent)' }}>
            <UserCheck size={20} />
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 2. SUPERVISOR CAPABILITY NAVIGATION TABS & REPORT DOWNLOAD ACTIONS         */}
      {/* ========================================================================= */}
      <div className="workspace-actions">
        <ExportMenu
          reportLabel="Generate command PDF"
          onReport={() => setIsWhiteSheetOpen(true)}
          onCsv={() => exportDashboardToCSV('SUPERVISOR', activeTab, language)}
        />
      </div>

      {/* ========================================================================= */}
      {/* 3. WORKSPACE CONTENTS BASED ON ACTIVE TAB                                 */}
      {/* ========================================================================= */}

      {/* VIEW 1: WORKLOAD MATRIX */}
      {activeTab === 'WORKLOAD' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* TOP SECTION: ONE BIG SINGLE HISTOGRAM GRAPH ACROSS FULL WIDTH */}
          <div style={{ width: '100%' }}>
            <WorkloadHistogramChart />
          </div>

          {/* BOTTOM SECTION: HIGH-END ELEGANT STATION OFFICER WORKLOAD TABLE */}
          <div style={{
            backgroundColor: 'var(--surface-card)',
            border: '1.5px solid var(--border-accent)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.35rem',
            boxShadow: 'var(--shadow-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.1rem'
          }}>
            {/* Header Title Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
                  <Users size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    Station Officer Workload List
                  </h3>
                  <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
                    Current case load and officer work status across station personnel.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <button
                  onClick={() => setActionSuccessToast('Select an officer below to review and reassign active cases.')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.5rem 1rem',
                    backgroundColor: 'var(--accent)',
                    color: '#000000',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.78rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(217, 119, 6, 0.3)'
                  }}
                >
                  <Zap size={15} />
                  <span>Review workload</span>
                </button>
                <span className="badge badge-accent" style={{ fontSize: '0.72rem', padding: '0.4rem 0.75rem' }}>
                  {workloads.length} OFFICERS MONITORED
                </span>
              </div>
            </div>

            {/* Modern Card-Style Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.5rem' }}>
                <thead>
                  <tr style={{ textAlign: 'left', fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '0.6rem 0.85rem' }}>OFFICER</th>
                    <th style={{ padding: '0.6rem 0.85rem' }}>STATION JURISDICTION</th>
                    <th style={{ padding: '0.6rem 0.85rem' }}>ACTIVE CASES</th>
                    <th style={{ padding: '0.6rem 0.85rem' }}>AGING (&gt;30D)</th>
                    <th style={{ padding: '0.6rem 0.85rem' }}>WORKLOAD STATUS</th>
                    <th style={{ padding: '0.6rem 0.85rem' }}>STATUS</th>
                    <th style={{ padding: '0.6rem 0.85rem', textAlign: 'center' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {workloads.map(off => {
                    const isOverloaded = off.capacityUtilization > 90;
                    const isOptimal = off.capacityUtilization > 70 && !isOverloaded;

                    return (
                      <tr
                        key={off.officerId}
                        style={{
                          backgroundColor: 'var(--surface-muted)',
                          borderRadius: 'var(--radius-md)',
                          transition: 'all 200ms ease',
                          boxShadow: 'var(--shadow-xs)'
                        }}
                      >
                        <td style={{ padding: '0.85rem', borderRadius: 'var(--radius-md) 0 0 var(--radius-md)' }}>
                          <strong style={{ color: 'var(--text-primary)', fontSize: '0.92rem', display: 'block' }}>
                            {off.officerName}
                          </strong>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            Badge: {off.badgeNumber}
                          </span>
                        </td>

                        <td style={{ padding: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.82rem' }}>
                          {off.station}
                        </td>

                        <td style={{ padding: '0.85rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <strong style={{
                              color: 'var(--text-primary)',
                              fontSize: '0.96rem',
                              fontFamily: 'var(--font-mono)'
                            }}>
                              {off.activeCasesCount} Cases
                            </strong>
                            <span style={{ fontSize: '0.66rem', fontWeight: 800, color: 'var(--success)' }}>
                              ● Live
                            </span>
                          </div>
                        </td>

                        <td style={{ padding: '0.85rem', fontWeight: 800, fontSize: '0.84rem', color: off.agingCasesCount > 3 ? 'var(--critical)' : 'var(--text-secondary)' }}>
                          {off.agingCasesCount} overdue
                        </td>

                        <td style={{ padding: '0.85rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span style={{
                              fontWeight: 900,
                              fontSize: '0.88rem',
                              fontFamily: 'var(--font-mono)',
                              color: isOverloaded ? 'var(--critical)' : isOptimal ? 'var(--warning)' : 'var(--info)'
                            }}>
                              {off.capacityUtilization}%
                            </span>
                            <div style={{ width: '75px', height: '8px', backgroundColor: 'var(--surface-card)', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{
                                width: `${off.capacityUtilization}%`,
                                height: '100%',
                                backgroundColor: isOverloaded ? 'var(--critical)' : isOptimal ? 'var(--warning)' : 'var(--info)',
                                transition: 'width 350ms ease'
                              }} />
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: '0.85rem' }}>
                          <span className={`badge ${isOverloaded ? 'badge-critical' : isOptimal ? 'badge-warning' : 'badge-success'}`}>
                            {isOverloaded ? 'OVERLOADED' : isOptimal ? 'HIGH LOAD' : 'AVAILABLE'}
                          </span>
                        </td>

                        <td style={{ padding: '0.85rem', textAlign: 'center', borderRadius: '0 var(--radius-md) var(--radius-md) 0' }}>
                          <button
                            onClick={() => setSelectedOfficerToReassign(off)}
                            style={{
                              fontSize: '0.74rem',
                              fontWeight: 900,
                              padding: '0.4rem 0.85rem',
                              backgroundColor: 'var(--accent)',
                              color: '#000000',
                              border: 'none',
                              borderRadius: 'var(--radius-md)',
                              cursor: 'pointer',
                              boxShadow: '0 2px 8px rgba(217, 119, 6, 0.25)',
                              transition: 'transform 150ms ease'
                            }}
                          >
                            Reassign Cases
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* VIEW 2: STATION PERFORMANCE (REDESIGNED VIBRANT CARD GRID WITH PROGRESS BARS) */}
      {activeTab === 'PERFORMANCE' && (
        <div style={{
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.4rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
                Station Performance & Case Resolution
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                Case clearance efficiency, resolved FIR count, and active backlog across Karnataka State Police stations.
              </p>
            </div>
            <span className="badge badge-success" style={{ fontSize: '0.72rem', padding: '0.4rem 0.8rem' }}>
              {stationPerformance.length} STATIONS IN SCOPE
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.1rem' }}>
            {stationPerformance.map(st => (
              <div key={st.station} style={{
                padding: '1.2rem',
                backgroundColor: 'var(--surface-muted)',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
                boxShadow: 'var(--shadow-xs)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <strong style={{ fontSize: '0.98rem', color: 'var(--text-primary)', display: 'block' }}>{st.station}</strong>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{st.district}</span>
                  </div>
                  <span className="badge" style={{ backgroundColor: `${st.color}22`, color: st.color, border: `1px solid ${st.color}`, fontSize: '0.68rem' }}>
                    {st.badge}
                  </span>
                </div>

                {/* Progress Bar & Rate */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontWeight: 700 }}>Case Resolution Rate:</span>
                    <strong style={{ fontSize: '1.25rem', fontWeight: 900, color: st.color }}>{st.rate}%</strong>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--surface-card)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${st.rate}%`, height: '100%', backgroundColor: st.color, transition: 'width 500ms ease' }} />
                  </div>
                </div>

                {/* Counts Breakdown Strip */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '0.5rem',
                  padding: '0.65rem 0.8rem',
                  backgroundColor: 'var(--surface-card)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.74rem',
                  textAlign: 'center'
                }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.66rem' }}>RESOLVED</span>
                    <strong style={{ color: 'var(--success)', fontSize: '0.92rem' }}>{st.resolved} Cases</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.66rem' }}>PENDING</span>
                    <strong style={{ color: 'var(--critical)', fontSize: '0.92rem' }}>{st.pending} Cases</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.66rem' }}>AVG SPEED</span>
                    <strong style={{ color: 'var(--text-primary)', fontSize: '0.92rem' }}>{st.avgDays}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 3: AGING CASES (REDESIGNED SIMPLIFIED CARD LAYOUT) */}
      {activeTab === 'AGING' && (
        <div style={{
          backgroundColor: 'var(--surface-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.4rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div>
            <span className="badge badge-accent" style={{ fontSize: '0.68rem', marginBottom: '0.35rem' }}>
              TIME OVERDUE MONITORING
            </span>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
              Case Age Overview (Pending Duration)
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Track active cases by duration bracket to prevent investigation delays.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {ageingBrackets.map((bracket, idx) => (
              <div key={idx} style={{
                padding: '1.1rem',
                backgroundColor: 'var(--surface-muted)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.45rem'
              }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-muted)' }}>{bracket.label}</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: bracket.color }}>
                  {bracket.count} Cases <span style={{ fontSize: '0.74rem', fontWeight: 700 }}>({bracket.percentage}%)</span>
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{bracket.note}</span>
                <div style={{ height: '6px', backgroundColor: 'var(--surface-card)', borderRadius: '3px', overflow: 'hidden', marginTop: '0.2rem' }}>
                  <div style={{ width: `${bracket.percentage * 2}%`, height: '100%', backgroundColor: bracket.color }} />
                </div>
              </div>
            ))}
          </div>

          {/* Detailed Overdue Cases List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 900, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
              High-Priority Delayed Cases Requiring Sign-off:
            </span>
            {delayedCases.map(item => (
              <div key={item.fir} style={{
                padding: '0.95rem 1.15rem',
                backgroundColor: 'var(--surface-muted)',
                borderRadius: 'var(--radius-md)',
                border: item.status === 'APPROVED' 
                  ? '1.5px solid rgba(16, 185, 129, 0.4)' 
                  : item.status === 'REJECTED'
                  ? '1.5px solid rgba(239, 68, 68, 0.4)'
                  : '1.5px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.85rem'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <strong style={{ fontSize: '0.88rem', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{item.fir}</strong>
                    {item.status === 'APPROVED' ? (
                      <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>APPROVED</span>
                    ) : item.status === 'REJECTED' ? (
                      <span className="badge" style={{ backgroundColor: 'var(--critical-bg)', color: 'var(--critical)', border: '1px solid var(--critical)', fontSize: '0.65rem' }}>REJECTED</span>
                    ) : (
                      <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>SIGN-OFF REQUIRED</span>
                    )}
                  </div>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.9rem', display: 'block', marginTop: '0.2rem' }}>{item.title}</span>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    Assigned Officer: <strong>{item.officer}</strong> | Days Pending: <strong style={{ color: 'var(--critical)' }}>{item.daysOpen} Days Overdue</strong>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600, marginTop: '0.2rem' }}>
                    Action Requested: {item.actionNeeded}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    onClick={() => inspectCaseByFir(item.fir)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.45rem 0.85rem',
                      backgroundColor: 'var(--surface-card)',
                      color: 'var(--accent)',
                      border: '1px solid var(--border-accent)',
                      borderRadius: 'var(--radius-md)',
                      fontWeight: 800,
                      fontSize: '0.76rem',
                      cursor: 'pointer'
                    }}
                  >
                    <Eye size={14} />
                    <span>View Case</span>
                  </button>

                  {item.status !== 'REJECTED' && (
                    <button
                      onClick={() => handleRejectDelayedCase(item.fir)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        padding: '0.45rem 0.8rem',
                        backgroundColor: 'var(--critical-bg)',
                        color: 'var(--critical)',
                        border: '1px solid var(--critical)',
                        borderRadius: 'var(--radius-md)',
                        fontWeight: 800,
                        fontSize: '0.76rem',
                        cursor: 'pointer'
                      }}
                    >
                      <XCircle size={14} />
                      <span>Reject</span>
                    </button>
                  )}

                  {item.status !== 'APPROVED' && (
                    <button
                      onClick={() => handleApproveDelayedCase(item.fir)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        padding: '0.45rem 0.95rem',
                        backgroundColor: 'var(--accent)',
                        color: '#000000',
                        borderRadius: 'var(--radius-md)',
                        fontWeight: 900,
                        fontSize: '0.76rem',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <CheckCircle2 size={14} />
                      <span>Approve Action</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 4: CASE DELAY TRACKER (SIMPLIFIED EASY ENGLISH TITLE & CARD GRID) */}
      {activeTab === 'BOTTLENECKS' && (
        <div style={{
          backgroundColor: 'var(--surface-card)',
          border: '1.5px solid rgba(245, 158, 11, 0.4)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.35rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              color: 'var(--warning)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertTriangle size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--warning)', margin: 0 }}>
                Case Delay Tracker & Solution Plans ({bottlenecks.length})
              </h3>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
                Detected investigation delays, lab wait times, and recommended solutions.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem' }}>
            {bottlenecks.map(bot => (
              <div key={bot.id} style={{
                padding: '1.15rem 1.25rem',
                backgroundColor: 'var(--surface-muted)',
                border: bot.status === 'APPROVED'
                  ? '1.5px solid var(--success)'
                  : bot.status === 'REJECTED'
                  ? '1.5px solid var(--critical)'
                  : '1.5px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <strong style={{ fontSize: '0.98rem', color: 'var(--critical)' }}>{bot.title}</strong>
                  {bot.status === 'APPROVED' ? (
                    <span className="badge badge-success" style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      backgroundColor: 'var(--success-bg)',
                      color: 'var(--success)',
                      border: '1px solid var(--success)',
                      fontSize: '0.7rem',
                      fontWeight: 800
                    }}>
                      <CheckCircle2 size={13} /> APPROVED & EXECUTED
                    </span>
                  ) : bot.status === 'REJECTED' ? (
                    <span className="badge badge-critical" style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      backgroundColor: 'var(--critical-bg)',
                      color: 'var(--critical)',
                      border: '1px solid var(--critical)',
                      fontSize: '0.7rem',
                      fontWeight: 800
                    }}>
                      <XCircle size={13} /> REJECTED BY SUPERVISOR
                    </span>
                  ) : (
                    <span className="badge badge-critical" style={{ fontSize: '0.7rem' }}>ACTION NEEDED</span>
                  )}
                </div>

                <p style={{ fontSize: '0.84rem', color: 'var(--text-primary)', lineHeight: 1.45, margin: 0 }}>
                  {bot.description}
                </p>

                <div style={{
                  padding: '0.75rem 0.95rem',
                  backgroundColor: 'var(--surface-elevated)',
                  borderRadius: 'var(--radius-sm)',
                  borderLeft: '3.5px solid var(--accent)',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)'
                }}>
                  <strong style={{ color: 'var(--accent)' }}>Recommended Solution:</strong> {bot.recommendedAction}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.65rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setSelectedBottleneck(bot)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.45rem 0.95rem',
                      backgroundColor: 'var(--surface-card)',
                      color: 'var(--accent)',
                      border: '1.5px solid var(--border-accent)',
                      borderRadius: 'var(--radius-md)',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      cursor: 'pointer'
                    }}
                  >
                    <Eye size={15} />
                    <span>View Case Details</span>
                  </button>

                  {bot.status !== 'REJECTED' && (
                    <button
                      onClick={() => handleRejectBottleneck(bot.id)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.45rem 0.85rem',
                        backgroundColor: 'var(--critical-bg)',
                        color: 'var(--critical)',
                        border: '1px solid var(--critical)',
                        borderRadius: 'var(--radius-md)',
                        fontWeight: 800,
                        fontSize: '0.78rem',
                        cursor: 'pointer'
                      }}
                    >
                      <XCircle size={15} />
                      <span>Reject</span>
                    </button>
                  )}

                  {bot.status !== 'APPROVED' && (
                    <button
                      onClick={() => handleApproveBottleneck(bot.id)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.45rem 1rem',
                        backgroundColor: 'var(--accent)',
                        color: '#000000',
                        borderRadius: 'var(--radius-md)',
                        fontWeight: 900,
                        fontSize: '0.78rem',
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(217, 119, 6, 0.25)'
                      }}
                    >
                      <CheckCircle2 size={15} />
                      <span>Approve Solution</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 5: OFFICER REVIEW (CLICKABLE OFFICER CARDS OPENING FULL WORK HISTORY MODAL) */}
      {activeTab === 'OFFICER_REVIEW' && (
        <div style={{
          backgroundColor: 'var(--surface-elevated)',
          border: '1.5px solid var(--border-accent)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.35rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div>
            <span className="badge badge-success" style={{ fontSize: '0.68rem', marginBottom: '0.35rem' }}>
              OFFICER PERFORMANCE ROSTER
            </span>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
              Karnataka Police Investigator Roster
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Click any officer card below to view complete work history, monthly case resolution graph, and assigned portfolio.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem' }}>
            {workloads.map(off => (
              <div
                key={off.officerId}
                onClick={() => setViewedOfficerProfile(off)}
                style={{
                  padding: '1.1rem 1.25rem',
                  backgroundColor: 'var(--surface-muted)',
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  cursor: 'pointer',
                  transition: 'all 200ms ease',
                  boxShadow: 'var(--shadow-xs)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--surface-card)',
                    border: '2px solid var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent)',
                    fontWeight: 900,
                    fontSize: '1.1rem'
                  }}>
                    {off.officerName.split(' ')[1]?.[0] || 'O'}
                  </div>
                  <div>
                    <strong style={{ fontSize: '1rem', color: 'var(--text-primary)', display: 'block' }}>{off.officerName}</strong>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                      Badge: <span style={{ fontFamily: 'var(--font-mono)' }}>{off.badgeNumber}</span> | Station: {off.station}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.35rem', flexWrap: 'wrap' }}>
                  <div>
                    <span style={{ fontSize: '0.66rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>ACTIVE CASES</span>
                    <strong style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>{off.activeCasesCount} Cases</strong>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.66rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>WORKLOAD</span>
                    <strong style={{ color: off.capacityUtilization > 90 ? 'var(--critical)' : 'var(--success)', fontSize: '1rem' }}>{off.capacityUtilization}%</strong>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewedOfficerProfile(off);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.45rem 0.9rem',
                      backgroundColor: 'var(--accent)',
                      color: '#000000',
                      borderRadius: 'var(--radius-md)',
                      fontWeight: 900,
                      fontSize: '0.76rem',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <span>View Work History</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* OFFICER DETAILED WORK HISTORY & PERFORMANCE MODAL                         */}
      {/* ========================================================================= */}
      {viewedOfficerProfile && (
        <Modal
          isOpen={!!viewedOfficerProfile}
          onClose={() => setViewedOfficerProfile(null)}
          title={`Officer Profile: ${viewedOfficerProfile.officerName}`}
          subtitle={`Badge: ${viewedOfficerProfile.badgeNumber} | ${viewedOfficerProfile.station}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', fontSize: '0.84rem' }}>
            
            {/* Header Summary Strip */}
            {(() => {
              const officerCases = dataService.getAllCases().filter((record) =>
                record.assignedOfficer.id === viewedOfficerProfile.officerId ||
                record.assignedOfficer.badgeNumber === viewedOfficerProfile.badgeNumber
              );
              const monthBuckets = new Map<string, { month: string; resolved: number; active: number }>();
              officerCases.forEach((record) => {
                const date = new Date(record.filedDate);
                const month = Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
                const bucket = monthBuckets.get(month) || { month, resolved: 0, active: 0 };
                if (record.status === 'CLOSED') bucket.resolved += 1;
                else bucket.active += 1;
                monthBuckets.set(month, bucket);
              });
              const details = {
                rank: viewedOfficerProfile.rank || 'Rank not recorded',
                specialization: officerCases[0]?.category || 'No specialization recorded',
                solvedTotal: officerCases.filter((record) => record.status === 'CLOSED').length,
                speedRating: `${viewedOfficerProfile.capacityUtilization || 0}% capacity utilization`,
                recentCases: officerCases.slice(0, 8).map((record) => ({
                  id: record.firNumber,
                  title: record.title,
                  status: record.status,
                  date: new Date(record.filedDate).toLocaleDateString('en-IN'),
                })),
                monthlyHistory: Array.from(monthBuckets.values()).slice(-5),
              };

              return (
                <>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '0.85rem',
                    padding: '1rem',
                    backgroundColor: 'var(--surface-muted)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block' }}>RANK & TITLE</span>
                      <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{details.rank}</strong>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block' }}>SPECIALIZATION</span>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--accent)' }}>{details.specialization}</strong>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block' }}>TOTAL CASES SOLVED</span>
                      <strong style={{ fontSize: '1rem', color: 'var(--success)' }}>{details.solvedTotal} Cases</strong>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block' }}>SPEED RATING</span>
                      <strong style={{ fontSize: '0.9rem', color: 'var(--accent)' }}>{details.speedRating}</strong>
                    </div>
                  </div>

                  {/* Monthly Case Resolution Performance Chart */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <TrendingUp size={16} color="var(--accent)" />
                      <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                        5-Month Case Resolution & Work History Chart
                      </h4>
                    </div>

                    <div style={{ width: '100%', height: 180, backgroundColor: 'var(--surface-card)', borderRadius: 'var(--radius-md)', padding: '0.75rem', border: '1px solid var(--border)' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={details.monthlyHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                          <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} />
                          <YAxis stroke="var(--text-muted)" fontSize={11} />
                          <Tooltip />
                          <Area type="monotone" dataKey="resolved" name="Resolved Cases" stroke="var(--success)" fill="rgba(16, 185, 129, 0.2)" strokeWidth={2} />
                          <Area type="monotone" dataKey="active" name="Active Load" stroke="var(--accent)" fill="rgba(217, 119, 6, 0.15)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Assigned Case Portfolio */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                      Recent Case History & Assigned Portfolio:
                    </h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                      {details.recentCases.map((c: any) => (
                        <div key={c.id} style={{
                          padding: '0.65rem 0.85rem',
                          backgroundColor: 'var(--surface-muted)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}>
                          <div>
                            <strong style={{ fontSize: '0.8rem', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{c.id}</strong> — {c.title}
                            <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)' }}>Assigned Date: {c.date}</span>
                          </div>
                          <span className={`badge ${c.status === 'RESOLVED' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.65rem' }}>
                            {c.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              );
            })()}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                onClick={() => setViewedOfficerProfile(null)}
                style={{
                  padding: '0.55rem 1.1rem',
                  backgroundColor: 'var(--accent)',
                  color: '#000000',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 900,
                  fontSize: '0.8rem',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Close Officer Dossier
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* CASE REVIEW & BOTTLENECK APPROVAL MODAL                                   */}
      {/* ========================================================================= */}
      {(selectedOfficerToReassign || selectedBottleneck) && (
        <Modal
          isOpen={!!(selectedOfficerToReassign || selectedBottleneck)}
          onClose={() => { setSelectedOfficerToReassign(null); setSelectedBottleneck(null); }}
          title={selectedOfficerToReassign ? `Reassign Workload: ${selectedOfficerToReassign.officerName}` : `Case & Solution Review: ${selectedBottleneck?.title}`}
          subtitle="Supervisor Operational Review & Action Sign-off"
          width="780px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', fontSize: '0.84rem' }}>
            
            {selectedBottleneck && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', backgroundColor: 'var(--surface-muted)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>AFFECTED DIVISION / UNIT</span>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)', display: 'block' }}>{selectedBottleneck.affectedStation}</strong>
                  </div>
                  {selectedBottleneck.status === 'APPROVED' ? (
                    <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', backgroundColor: 'var(--success-bg)', color: 'var(--success)', border: '1px solid var(--success)', padding: '0.3rem 0.75rem', borderRadius: '4px', fontWeight: 800 }}>
                      <CheckCircle2 size={14} /> APPROVED & EXECUTED
                    </span>
                  ) : selectedBottleneck.status === 'REJECTED' ? (
                    <span className="badge badge-critical" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', backgroundColor: 'var(--critical-bg)', color: 'var(--critical)', border: '1px solid var(--critical)', padding: '0.3rem 0.75rem', borderRadius: '4px', fontWeight: 800 }}>
                      <XCircle size={14} /> REJECTED BY SUPERVISOR
                    </span>
                  ) : (
                    <span className="badge badge-critical" style={{ fontSize: '0.72rem', padding: '0.3rem 0.75rem' }}>ACTION NEEDED</span>
                  )}
                </div>

                <div style={{ padding: '0.85rem 1rem', backgroundColor: 'var(--surface-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--critical)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>
                    BOTTLENECK CAUSE & DELAY DIAGNOSIS
                  </span>
                  <p style={{ color: 'var(--text-primary)', margin: 0, lineHeight: 1.45 }}>
                    {selectedBottleneck.description}
                  </p>
                </div>

                {/* ASSOCIATED FIR CASES LIST */}
                {selectedBottleneck.associatedCases && selectedBottleneck.associatedCases.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                      Impacted Cases & FIR Records ({selectedBottleneck.associatedCases.length} Cases):
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                      {selectedBottleneck.associatedCases.map((c: any) => (
                        <div key={c.firNumber} style={{
                          padding: '0.75rem 0.95rem',
                          backgroundColor: 'var(--surface-muted)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '0.65rem'
                        }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <strong style={{ fontSize: '0.85rem', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{c.firNumber}</strong>
                              <span className="badge badge-warning" style={{ fontSize: '0.62rem' }}>{c.daysOpen} Days Open</span>
                            </div>
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginTop: '0.15rem' }}>{c.title}</span>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                              Lead IO: <strong>{c.officer}</strong> | Cause: <span style={{ color: 'var(--critical)' }}>{c.delayReason}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => inspectCaseByFir(c.firNumber)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.4rem 0.85rem',
                              backgroundColor: 'var(--surface-elevated)',
                              color: 'var(--accent)',
                              border: '1px solid var(--border-accent)',
                              borderRadius: 'var(--radius-sm)',
                              fontWeight: 800,
                              fontSize: '0.74rem',
                              cursor: 'pointer'
                            }}
                          >
                            <Eye size={13} />
                            <span>View Case Dossier</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ padding: '0.9rem 1.05rem', backgroundColor: 'var(--surface-elevated)', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--accent)' }}>
                  <p style={{ color: 'var(--accent)', fontWeight: 800, fontSize: '0.76rem', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                    RECOMMENDED INTERVENTION SOLUTION
                  </p>
                  <p style={{ color: 'var(--text-primary)', margin: 0, fontWeight: 600 }}>
                    {selectedBottleneck.recommendedAction}
                  </p>
                </div>
              </>
            )}

            {selectedOfficerToReassign && (
              <>
                <p style={{ color: 'var(--text-secondary)' }}>
                  {selectedOfficerToReassign.officerName} currently has {selectedOfficerToReassign.activeCasesCount} active cases ({selectedOfficerToReassign.capacityUtilization}% workload status). Select target officer to rebalance cases.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontWeight: 800, color: 'var(--text-primary)' }}>Select Target Officer for Case Transfer:</label>
                  <select
                    value={reassignTargetOfficer}
                    onChange={(e) => setReassignTargetOfficer(e.target.value)}
                    style={{
                      padding: '0.55rem',
                      backgroundColor: 'var(--surface-muted)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)',
                      fontSize: '0.82rem',
                      outline: 'none'
                    }}
                  >
                    {workloads.filter(officer => officer.officerId !== selectedOfficerToReassign.officerId).map(officer => (
                      <option key={officer.officerId} value={officer.officerId}>{officer.officerName} ({officer.capacityUtilization}% capacity)</option>
                    ))}
                  </select>
                </div>
                <div style={{ padding: '0.85rem', backgroundColor: 'var(--surface-muted)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <p style={{ color: 'var(--accent)', fontWeight: 800, fontSize: '0.78rem', marginBottom: '0.3rem' }}>
                    RECOMMENDED ACTION
                  </p>
                  <p style={{ color: 'var(--text-primary)', margin: 0 }}>
                    Reassign up to two command-scoped active cases from {selectedOfficerToReassign.officerName}. The backend will record each transfer in the audit trail.
                  </p>
                </div>
              </>
            )}

            {/* ACTION BUTTONS FOOTER */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem', marginTop: '0.6rem' }}>
              <button
                onClick={() => { setSelectedOfficerToReassign(null); setSelectedBottleneck(null); }}
                style={{
                  padding: '0.55rem 1rem',
                  backgroundColor: 'var(--surface-muted)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                Close / Cancel
              </button>

              {selectedBottleneck && selectedBottleneck.status !== 'REJECTED' && (
                <button
                  onClick={() => handleRejectBottleneck(selectedBottleneck.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.55rem 1.1rem',
                    backgroundColor: 'var(--critical-bg)',
                    color: 'var(--critical)',
                    border: '1.5px solid var(--critical)',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  <XCircle size={15} />
                  <span>Reject Solution</span>
                </button>
              )}

              {selectedBottleneck && selectedBottleneck.status !== 'APPROVED' && (
                <button
                  onClick={() => handleApproveBottleneck(selectedBottleneck.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.55rem 1.25rem',
                    backgroundColor: 'var(--accent)',
                    color: '#000000',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 900,
                    fontSize: '0.8rem',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 2px 10px rgba(217, 119, 6, 0.3)'
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>Approve & Execute Solution</span>
                </button>
              )}

              {selectedOfficerToReassign && (
                <button
                  onClick={handleExecuteReassignment}
                  style={{
                    padding: '0.55rem 1.1rem',
                    backgroundColor: 'var(--accent)',
                    color: '#000000',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 900,
                    fontSize: '0.8rem',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Approve & Execute Reassignment
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* RENDER CASE DETAIL MODAL IF A CASE FILE IS INSPECTED */}
      {selectedCaseDetail && (
        <CaseDetailView
          caseRecord={selectedCaseDetail}
          onClose={() => setSelectedCaseDetail(null)}
          onOpenExplain={onOpenExplainModal}
        />
      )}

      <WhiteSheetModal
        isOpen={isWhiteSheetOpen}
        onClose={() => setIsWhiteSheetOpen(false)}
      />
    </div>
  );
};
