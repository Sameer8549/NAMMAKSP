import React, { useState, useMemo, useEffect } from 'react';
import { useRole } from '../../context/RoleContext';
import { useLanguage } from '../../context/LanguageContext';
import { StatusBadge } from '../common/StatusBadge';
import { AccusedNetworkGraph } from '../network/AccusedNetworkGraph';
import { CaseDetailView } from '../detail/CaseDetailView';
import { MovingCaseOversightGraph } from '../charts/MovingCaseOversightGraph';
import { WhiteSheetModal } from '../common/WhiteSheetModal';
import { ExportMenu } from '../common/ExportMenu';
import { exportDashboardToCSV } from '../../services/reportExportService';
import { dataService } from '../../services/mockDataService';
import type { CaseRecord, InvestigationLead, SimilarCaseMatch } from '../../types/crime';
import {
  Search,
  FileText,
  ArrowRight,
  GitCompare,
  Clock,
  UserCheck,
  Shield,
  CheckCircle2,
  Target,
  Share2,
  FolderOpen,
  BarChart3,
  X,
  MapPin,
} from 'lucide-react';
import './investigatorDashboard.css';
import { InvestigatorFinancialLeads } from './InvestigatorFinancialLeads';

interface InvestigatorDashboardProps {
  onOpenExplainModal: () => void;
  onOpenChatDrawer: () => void;
}

type CapabilityTab = 'ALL' | 'ACTIVE_CASES' | 'FIR_SEARCH' | 'ACCUSED_CONN' | 'SIMILAR_CASES' | 'TIMELINE' | 'NETWORK' | 'LEADS';

export const InvestigatorDashboard: React.FC<InvestigatorDashboardProps> = ({ onOpenChatDrawer }) => {
  const { activeView } = useRole();
  const cases = dataService.getAllCases();
  const identity = dataService.getWorkspace()?.identity;
  const [activeTab, setActiveTab] = useState<CapabilityTab>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [districtFilter, setDistrictFilter] = useState<string>('ALL');
  const [selectedCase, setSelectedCase] = useState<CaseRecord | null>(null);
  const [selectedWhiteSheetCase, setSelectedWhiteSheetCase] = useState<CaseRecord | null>(null);
  const [actionedLeads, setActionedLeads] = useState<Record<string, boolean>>({});
  const districts = useMemo(() => Array.from(new Set(cases.map(item => item.location?.district).filter(Boolean))).sort(), [cases]);

  const investigationLeads = useMemo<InvestigationLead[]>(() => cases
    .filter(item => item.status !== 'CLOSED')
    .sort((a, b) => b.daysAging - a.daysAging)
    .slice(0, 12)
    .map((item, index) => ({
      id: `lead-${item.firNumber}`,
      caseFir: item.firNumber,
      title: `${item.category} evidence review`,
      confidenceScore: Math.min(95, 55 + item.accused.reduce((max, accused) => Math.max(max, accused.riskScore), 0) / 3),
      evidenceBasis: `${item.firNumber} is ${item.daysAging} days old with ${item.accused.length} linked accused record(s).`,
      suggestedNextStep: item.priority === 'HIGH' || item.priority === 'CRITICAL'
        ? 'Review the linked evidence and escalate through the authorized command chain.'
        : 'Verify the case timeline and record the next investigation action.',
      leadType: index % 2 === 0 ? 'MO_PATTERN' : 'SUSPECT_LOCATION',
      status: item.priority === 'HIGH' || item.priority === 'CRITICAL' ? 'ACTION_REQUIRED' : 'UNDER_REVIEW',
    })), [cases]);

  const similarCases = useMemo<SimilarCaseMatch[]>(() => cases.flatMap((activeCase, index) => {
    const match = cases.find((candidate, candidateIndex) => candidateIndex > index
      && candidate.category === activeCase.category
      && candidate.location.district !== activeCase.location.district);
    if (!match) return [];
    return [{
      id: `similar-${activeCase.firNumber}-${match.firNumber}`,
      activeFir: activeCase.firNumber,
      matchedFir: match.firNumber,
      matchedTitle: match.title,
      district: match.location.district,
      similarityScore: activeCase.modusOperandi.primaryMethod === match.modusOperandi.primaryMethod ? 92 : 76,
      matchedSignature: match.modusOperandi.uniqueSignature,
      overlappingMO: [activeCase.modusOperandi.primaryMethod, match.modusOperandi.primaryMethod],
    }];
  }).slice(0, 12), [cases]);

  // Oversight Category Modal State
  const [selectedOversightCategory, setSelectedOversightCategory] = useState<string | null>(null);

  // Sync activeView from Sidebar to activeTab in Dashboard
  useEffect(() => {
    if (!activeView) return;
    const view = activeView.toLowerCase();
    if (view === 'my cases' || view === 'active cases') setActiveTab('ACTIVE_CASES');
    else if (view === 'fir database' || view === 'fir search') setActiveTab('FIR_SEARCH');
    else if (view === 'accused network' || view === 'accused connections' || view === 'suspect networks') setActiveTab('NETWORK');
    else if (view === 'mo pattern matcher' || view === 'similar cases' || view === 'similar crime methods') setActiveTab('SIMILAR_CASES');
    else if (view === 'evidence vault' || view === 'investigation lead' || view === 'case leads') setActiveTab('LEADS');
    else if (view === 'timeline view' || view === 'case timeline') setActiveTab('TIMELINE');
    else if (view === 'overview') setActiveTab('ALL');
  }, [activeView]);

  const oversightBarData = useMemo(() => {
    const categories = Array.from(new Set(cases.map(item => item.category)));
    return categories.map((category, index) => {
      const matchedCases = cases.filter(item => item.category === category);
      const openCount = matchedCases.filter(item => item.status !== 'CLOSED').length;
      const oldest = Math.max(0, ...matchedCases.map(item => item.daysAging));
      return {
        id: category.toUpperCase().replace(/\W+/g, '_'), title: category,
        categoryName: category, caseCount: matchedCases.length,
        financialLoss: `${matchedCases.length} verified FIR records`,
        status: openCount ? 'UNDER_INVESTIGATION' : 'CLOSED',
        statusColor: ['#2563eb', '#0f766e', '#d97706', '#be123c'][index % 4],
        progressVal: Math.max(5, Math.round((matchedCases.length - openCount) / Math.max(1, matchedCases.length) * 100)),
        primaryFir: matchedCases[0]?.firNumber || '',
        summary: `${openCount} active records; oldest case age is ${oldest} days.`,
        matchedCases,
      };
    }).slice(0, 6);
  }, [cases]);

  const filteredCases = useMemo(() => {
    return cases.filter(c => {
      const matchesSearch =
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.firNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.modusOperandi.primaryMethod.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.accused.some(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()) || (a.alias && a.alias.toLowerCase().includes(searchTerm.toLowerCase())));

      const matchesCategory = categoryFilter === 'ALL' || c.category === categoryFilter;
      const matchesPriority = priorityFilter === 'ALL' || c.priority === priorityFilter;
      const matchesDistrict = districtFilter === 'ALL' || (c.location && c.location.district.toLowerCase().includes(districtFilter.toLowerCase()));

      return matchesSearch && matchesCategory && matchesPriority && matchesDistrict;
    });
  }, [cases, searchTerm, categoryFilter, priorityFilter, districtFilter]);

  const sortedTimelineEvents = useMemo(() => {
    const events: Array<{ event: CaseRecord['timeline'][0]; caseFir: string; caseTitle: string }> = [];
    cases.forEach(c => {
      c.timeline.forEach(e => {
        events.push({ event: e, caseFir: c.firNumber, caseTitle: c.title });
      });
    });
    return events;
  }, [cases]);

  const toggleActionLead = (leadId: string) => {
    setActionedLeads(prev => ({ ...prev, [leadId]: !prev[leadId] }));
  };

  const selectedCategoryData = useMemo(() => {
    if (!selectedOversightCategory) return null;
    return oversightBarData.find(b => b.id === selectedOversightCategory) || null;
  }, [selectedOversightCategory, oversightBarData]);

  const { language, translations } = useLanguage();
  const [isWhiteSheetOpen, setIsWhiteSheetOpen] = useState(false);

  if (activeView.toLowerCase().includes('financial')) return <InvestigatorFinancialLeads onOpenChat={onOpenChatDrawer}/>;

  return (
    <div className="investigator-desk-container">
      
      {/* TOP NAVIGATION BAR & REPORT DOWNLOAD ACTIONS */}
      <div className="workspace-actions">
        <ExportMenu
          reportLabel="Generate case PDF"
          onReport={() => setIsWhiteSheetOpen(true)}
          onCsv={() => exportDashboardToCSV('INVESTIGATOR', activeTab, language)}
        />
      </div>

      {/* CASE DETAIL VIEW */}
      {selectedCase ? (
        <CaseDetailView caseRecord={selectedCase} onClose={() => setSelectedCase(null)} />
      ) : (
        <>
          {/* PAGE 1: OVERVIEW */}
          {activeTab === 'ALL' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="desk-header-banner">
                <div className="desk-header-top">
                  <div className="desk-title-group">
                    <div className="desk-badge-icon">
                      <BarChart3 size={24} color="var(--accent)" />
                    </div>
                    <div>
                      <h2 className="desk-title">
                        Case Overview & Active Cases
                      </h2>
                      <div className="desk-subtitle">
                        <span>Click any card below to view details and suspects linked to the case.</span>
                      </div>
                    </div>
                  </div>

                  <div className="desk-officer-pill">
                    <Shield size={14} color="var(--accent)" />
                    <span>{identity?.username || 'Authenticated investigator'} • assigned case scope</span>
                  </div>
                </div>

                <MovingCaseOversightGraph
                  data={oversightBarData}
                  onSelectCategory={(id) => setSelectedOversightCategory(id)}
                  selectedCategoryId={selectedOversightCategory}
                />
              </div>

              {/* Active Cases Grid Preview */}
              <div className="active-cases-grid">
                {filteredCases.slice(0, 60).map(c => (
                  <div key={c.id} className="case-story-card">
                    <div>
                      <div className="case-card-header">
                        <span className="case-fir-tag">{c.firNumber}</span>
                        <StatusBadge type="status" value={c.status} />
                      </div>
                      <h3 className="case-title">{c.title}</h3>
                      <div className="case-district-meta">
                        <MapPin size={13} color="var(--accent)" />
                        <span>{c.location?.district || 'Karnataka'} • {c.category}</span>
                      </div>
                      <div className="mo-story-box" style={{ marginTop: '0.85rem' }}>
                        <div className="mo-story-label">Crime Method</div>
                        <div className="mo-story-text">"{c.modusOperandi.primaryMethod}"</div>
                      </div>
                    </div>
                    <div className="case-card-footer">
                      <div className="case-aging-indicator">
                        <Clock size={13} />
                        <span>Days Open: {c.daysAging} Days</span>
                      </div>
                      <button onClick={() => setSelectedCase(c)} className="btn-open-dossier">
                        <span>View Case Details</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PAGE 2: MY CASES */}
          {activeTab === 'ACTIVE_CASES' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{
                backgroundColor: 'var(--surface-card)',
                border: '1px solid var(--border)',
                borderTop: '2px solid var(--accent)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FolderOpen size={22} color="var(--accent)" />
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                      My Cases
                    </h2>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                    View and manage all your assigned cases and investigation records
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{ padding: '0.4rem 0.75rem', backgroundColor: 'var(--surface-muted)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Officer: {identity?.username || 'Authenticated investigator'}
                  </div>
                  <span className="badge badge-info" style={{ fontSize: '0.78rem' }}>
                    {filteredCases.filter(item => item.status !== 'CLOSED').length} Active Cases
                  </span>
                </div>
              </div>

              {/* Filter Toolbar */}
              <div className="desk-filter-toolbar">
                <div className="search-input-wrapper">
                  <Search size={16} className="search-icon-inside" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search FIR number, suspect name, crime method, or district..."
                    className="search-input-field"
                  />
                </div>

                <div className="filter-selectors-group">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="filter-select"
                  >
                    <option value="ALL">All Categories</option>
                    <option value="Cybercrime">Cybercrime</option>
                    <option value="Property Theft">Property Theft</option>
                    <option value="Organized Syndicate">Extortion & Syndicate</option>
                    <option value="Narcotics">Drugs & Narcotics</option>
                  </select>

                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="filter-select"
                  >
                    <option value="ALL">All Priorities</option>
                    <option value="CRITICAL">High Priority</option>
                    <option value="HIGH">Medium Priority</option>
                    <option value="MEDIUM">Normal Priority</option>
                  </select>

                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Showing {filteredCases.length} Cases
                  </span>
                </div>
              </div>

              {/* Full Cases Grid */}
              <div className="active-cases-grid">
                {filteredCases.slice(0, 60).map(c => (
                  <div key={c.id} className="case-story-card">
                    <div>
                      <div className="case-card-header">
                        <span className="case-fir-tag">{c.firNumber}</span>
                        <StatusBadge type="status" value={c.status} />
                      </div>

                      <h3 className="case-title">{c.title}</h3>
                      
                      <div className="case-district-meta">
                        <MapPin size={13} color="var(--accent)" />
                        <span>{c.location?.district || 'Karnataka'} • {c.category}</span>
                      </div>

                      <div className="mo-story-box" style={{ marginTop: '0.85rem' }}>
                        <div className="mo-story-label">Crime Method</div>
                        <div className="mo-story-text">"{c.modusOperandi.primaryMethod}"</div>
                        <div className="mo-chips-group">
                          {c.modusOperandi.toolsUsed.map((tool, idx) => (
                            <span key={idx} className="mo-chip">🔧 {tool}</span>
                          ))}
                        </div>
                      </div>

                      <div style={{ marginTop: '0.85rem' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                          ACCUSED SUSPECTS ({c.accused.length}):
                        </div>
                        <div className="accused-suspects-list">
                          {c.accused.map(acc => (
                            <div key={acc.id} className="accused-row">
                              <div className="accused-name-alias">
                                <UserCheck size={14} color="var(--critical)" />
                                <span>{acc.name}</span>
                                {acc.alias && <span style={{ fontSize: '0.72rem', color: 'var(--accent)' }}>("{acc.alias}")</span>}
                              </div>
                              <span className="accused-risk-badge">Risk: {acc.riskScore}/100</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="case-card-footer">
                      <div className="case-aging-indicator">
                        <Clock size={13} />
                        <span>Days Open: {c.daysAging} Days</span>
                      </div>

                      <button
                        onClick={() => setSelectedCase(c)}
                        className="btn-open-dossier"
                      >
                        <span>View Case Details</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PAGE 3: FIR SEARCH */}
          {activeTab === 'FIR_SEARCH' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{
                backgroundColor: 'var(--surface-card)',
                border: '1px solid var(--border)',
                borderTop: '2px solid var(--info)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={22} color="var(--info)" />
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                      FIR Search & Records
                    </h2>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                    Search all registered FIR records and police reports across Karnataka
                  </p>
                </div>

                <span className="badge badge-info" style={{ fontSize: '0.78rem' }}>
                  Police Database Connected
                </span>
              </div>

              {/* FIR Search Toolbar */}
              <div className="desk-filter-toolbar">
                <div className="search-input-wrapper">
                  <Search size={16} className="search-icon-inside" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by FIR number (e.g. FIR-0421), police station, or complainant name..."
                    className="search-input-field"
                  />
                </div>

                <div className="filter-selectors-group">
                  <select
                    value={districtFilter}
                    onChange={(e) => setDistrictFilter(e.target.value)}
                    className="filter-select"
                  >
                    <option value="ALL">All Districts</option>
                    {districts.map(district => <option value={district} key={district}>{district}</option>)}
                  </select>

                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="filter-select"
                  >
                    <option value="ALL">All Categories</option>
                    <option value="Cybercrime">Cybercrime</option>
                    <option value="Property Theft">Property Theft</option>
                    <option value="Organized Syndicate">Extortion</option>
                    <option value="Narcotics">Drugs</option>
                  </select>

                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Found {filteredCases.length} FIR Records
                  </span>
                </div>
              </div>

              {/* FIR Database Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {filteredCases.slice(0, 60).map(fir => (
                  <div
                    key={fir.id}
                    style={{
                      backgroundColor: 'var(--surface-card)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '1rem',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: '280px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <span className="case-fir-tag">{fir.firNumber}</span>
                        <StatusBadge type="status" value={fir.status} />
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                          Filed Date: {fir.filedDate}
                        </span>
                      </div>

                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.4rem' }}>
                        {fir.title}
                      </h3>

                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <span>Police Station: <strong>{fir.assignedOfficer?.station || fir.location?.station || 'Cyber Crime PS'}</strong></span>
                        <span>District: <strong>{fir.location?.district || 'Karnataka'}</strong></span>
                        <span>Category: <strong>{fir.category}</strong></span>
                      </div>

                      <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)' }}>LAW SECTIONS:</span>
                        {fir.ipcSections.map((sec, idx) => (
                          <span key={idx} style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.45rem', backgroundColor: 'var(--surface-muted)', borderRadius: '4px', border: '1px solid var(--border-subtle)', color: 'var(--accent)' }}>
                            {sec}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        onClick={() => {
                          setSelectedWhiteSheetCase(fir);
                          setIsWhiteSheetOpen(true);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.55rem 0.85rem',
                          backgroundColor: 'var(--accent-light)',
                          color: 'var(--accent-muted)',
                          border: '1px solid var(--border-accent)',
                          fontWeight: 800,
                          fontSize: '0.8rem',
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer'
                        }}
                        title="Download KSP White Sheet Report for this FIR case"
                      >
                        <FileText size={14} />
                        <span>{translations.whiteSheet.downloadReport}</span>
                      </button>

                      <button
                        onClick={() => setSelectedCase(fir)}
                        className="btn-open-dossier"
                      >
                        <span>View FIR Report</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* PAGE 4: SUSPECT NETWORKS */}
          {activeTab === 'NETWORK' && (
            <AccusedNetworkGraph />
          )}

          {/* PAGE 5: SIMILAR CRIME METHODS */}
          {activeTab === 'SIMILAR_CASES' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{
                backgroundColor: 'var(--surface-card)',
                border: '1px solid var(--border)',
                borderTop: '2px solid var(--accent)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <GitCompare size={22} color="var(--accent)" />
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                      Similar Cases & Crime Methods
                    </h2>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                    Find cases with matching crime patterns, tools, and methods used by suspects
                  </p>
                </div>
                <span className="badge badge-success" style={{ fontSize: '0.78rem' }}>
                  {similarCases.length} Matching Cases Found
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
                {similarCases.map(match => (
                  <div key={match.id} className="case-story-card">
                    <div>
                      <div className="case-card-header">
                        <span className="case-fir-tag">{match.activeFir}</span>
                        <span className="badge badge-success" style={{ fontSize: '0.72rem', fontWeight: 800 }}>
                          {match.similarityScore}% MATCH
                        </span>
                      </div>

                      <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.5rem' }}>
                        Matched with: {match.matchedFir} ({match.district})
                      </h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                        {match.matchedTitle}
                      </p>

                      <div className="mo-story-box" style={{ marginTop: '0.75rem' }}>
                        <div className="mo-story-label">Matching Pattern</div>
                        <div className="mo-story-text">"{match.matchedSignature}"</div>
                      </div>

                      <div style={{ marginTop: '0.75rem' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          Matching Crime Details:
                        </span>
                        <div className="mo-chips-group" style={{ marginTop: '0.35rem' }}>
                          {match.overlappingMO.map((item, idx) => (
                            <span key={idx} className="mo-chip" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>
                              ✓ {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      className="btn-open-dossier"
                      onClick={() => setSelectedCase(cases.find(item => item.firNumber === match.matchedFir) || null)}
                    >
                      <Share2 size={14} />
                      <span>Inspect matched case</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PAGE 6: CASE LEADS */}
          {activeTab === 'LEADS' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{
                backgroundColor: 'var(--surface-card)',
                border: '1px solid var(--border)',
                borderTop: '2px solid var(--accent)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Target size={22} color="var(--accent)" />
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                      Evidence & Case Leads
                    </h2>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                    Important leads and next steps found from phone pings, bank accounts, and evidence
                  </p>
                </div>
                <span className="badge badge-info" style={{ fontSize: '0.78rem' }}>
                  {investigationLeads.length} Case Leads Available
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {investigationLeads.map(lead => {
                  const isActioned = actionedLeads[lead.id];

                  return (
                    <div
                      key={lead.id}
                      style={{
                        backgroundColor: 'var(--surface-card)',
                        border: '1px solid var(--border)',
                        borderTop: `2px solid ${lead.leadType === 'FINANCIAL_TRACE' ? 'var(--critical)' : 'var(--accent)'}`,
                        borderRadius: 'var(--radius-lg)',
                        padding: '1.2rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.85rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className="case-fir-tag">{lead.caseFir}</span>
                          <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>{lead.leadType}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--accent)' }}>
                            CONFIDENCE: {lead.confidenceScore}%
                          </span>
                          <span className={`badge ${isActioned ? 'badge-success' : 'badge-warning'}`}>
                            {isActioned ? 'DONE' : lead.status}
                          </span>
                        </div>
                      </div>

                      <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {lead.title}
                      </h4>

                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        <strong>Evidence Details:</strong> {lead.evidenceBasis}
                      </div>

                      <div style={{
                        padding: '0.65rem 0.85rem',
                        backgroundColor: 'var(--surface-muted)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <ArrowRight size={15} color="var(--accent)" />
                        <span><strong>Suggested Next Step:</strong> {lead.suggestedNextStep}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
                        <button
                          onClick={() => {
                            const caseRecord = cases.find(item => item.firNumber === lead.caseFir);
                            if (caseRecord) setSelectedCase(caseRecord);
                            toggleActionLead(lead.id);
                          }}
                          className={isActioned ? 'admin-btn-secondary' : 'admin-btn-primary'}
                        >
                          <CheckCircle2 size={15} />
                          <span>{isActioned ? 'Open evidence again' : 'Inspect evidence and act'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PAGE 7: CASE TIMELINE */}
          {activeTab === 'TIMELINE' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{
                backgroundColor: 'var(--surface-card)',
                border: '1px solid var(--border)',
                borderTop: '2px solid var(--accent)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={22} color="var(--accent)" />
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                      Case Activity Timeline
                    </h2>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                    Chronological history of case updates, FIR filings, and phone pings
                  </p>
                </div>
                <span className="badge badge-info" style={{ fontSize: '0.78rem' }}>
                  {sortedTimelineEvents.length} Updates Listed
                </span>
              </div>

              <div style={{
                backgroundColor: 'var(--surface-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem'
              }}>
                {sortedTimelineEvents.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="timeline-evidence-row"
                    onClick={() => setSelectedCase(cases.find(record => record.firNumber === item.caseFir) || null)}
                    style={{
                      display: 'flex',
                      gap: '1rem',
                      alignItems: 'flex-start',
                      paddingBottom: idx !== sortedTimelineEvents.length - 1 ? '1rem' : 0,
                      borderBottom: idx !== sortedTimelineEvents.length - 1 ? '1px solid var(--border-subtle)' : 'none'
                    }}
                  >
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--accent-light)',
                      color: 'var(--accent-muted)',
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0
                    }}>
                      <Clock size={16} />
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem' }}>
                        <span className="case-fir-tag">{item.caseFir}</span>
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>{item.event.timestamp}</span>
                      </div>

                      <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.35rem' }}>
                        {item.event.title}
                      </h4>

                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem', lineHeight: 1.4 }}>
                        {item.event.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

        </>
      )}

      {/* CATEGORY DETAIL MODAL */}
      {selectedCategoryData && (
        <div className="oversight-modal-overlay" onClick={() => setSelectedOversightCategory(null)}>
          <div className="oversight-modal-card" onClick={(e) => e.stopPropagation()}>
            
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.85rem' }}>
              <div>
                <span className="badge" style={{ backgroundColor: selectedCategoryData.statusColor, color: '#ffffff', fontSize: '0.7rem' }}>
                  {selectedCategoryData.status}
                </span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.35rem' }}>
                  {selectedCategoryData.title}
                </h3>
                <div style={{ fontSize: '0.78rem', color: 'var(--critical)', fontWeight: 700, marginTop: '0.15rem' }}>
                  Evidence volume: {selectedCategoryData.financialLoss}
                </div>
              </div>

              <button
                onClick={() => setSelectedOversightCategory(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.35rem'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{
              padding: '0.85rem 1rem',
              backgroundColor: 'var(--surface-muted)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.82rem',
              color: 'var(--text-primary)',
              lineHeight: 1.45
            }}>
              <strong>Case Summary:</strong> {selectedCategoryData.summary}
            </div>

            <div>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.65rem' }}>
                Cases in this category ({selectedCategoryData.matchedCases.length}):
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {selectedCategoryData.matchedCases.map(caseRecord => (
                  <div
                    key={caseRecord.id}
                    style={{
                      padding: '1rem',
                      backgroundColor: 'var(--surface-elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.65rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className="case-fir-tag">{caseRecord.firNumber}</span>
                      <StatusBadge type="status" value={caseRecord.status} />
                    </div>

                    <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                      {caseRecord.title}
                    </h4>

                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      District: {caseRecord.location?.district || 'Karnataka'} • Days Open: {caseRecord.daysAging} Days
                    </div>

                    <div style={{
                      padding: '0.55rem',
                      backgroundColor: 'var(--surface-muted)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.75rem',
                      color: 'var(--text-secondary)'
                    }}>
                      <strong>Crime Method:</strong> "{caseRecord.modusOperandi.primaryMethod}"
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.35rem' }}>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        Accused: {caseRecord.accused.map(a => a.name).join(', ')}
                      </div>

                      <button
                        onClick={() => {
                          setSelectedCase(caseRecord);
                          setSelectedOversightCategory(null);
                        }}
                        className="btn-open-dossier"
                      >
                        <span>View Full Case</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      <WhiteSheetModal
        isOpen={isWhiteSheetOpen}
        onClose={() => {
          setIsWhiteSheetOpen(false);
          setSelectedWhiteSheetCase(null);
        }}
        caseRecord={selectedWhiteSheetCase}
      />
    </div>
  );
};
