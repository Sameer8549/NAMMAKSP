import React, { useState, useMemo, useRef, useEffect } from 'react';
import { MOCK_SUSPECT_GRAPH } from '../../mock/mockNetwork';
import type { NetworkNodeType } from '../../types/network';
import {
  Layers,
  Sparkles,
  User,
  FileText,
  Phone,
  CreditCard,
  Shield,
  MapPin,
  Search,
  RotateCcw,
  UserCheck,
  Flame,
  Target,
  CheckCircle2,
  ArrowLeft,
  Grid,
  Box,
} from 'lucide-react';

type ViewMode = 'DIRECTORY' | 'TOPOLOGY_GRAPH';

export const AccusedNetworkGraph: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('DIRECTORY');
  const [selectedAccusedId, setSelectedAccusedId] = useState<string>('');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const [selectedEdgeId, setSelectedEdgeId] = useState<string>('');
  const [highlightEdgeId, setHighlightEdgeId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [onlyHighRisk, setOnlyHighRisk] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [isFlowAnimated, setIsFlowAnimated] = useState(true);

  // Dragging state
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [customPositions, setCustomPositions] = useState<Record<string, { x: number; y: number }>>({});
  const svgRef = useRef<SVGSVGElement | null>(null);

  const rawNodes = MOCK_SUSPECT_GRAPH.nodes;
  const rawEdges = MOCK_SUSPECT_GRAPH.edges;

  useEffect(() => {
    if (selectedAccusedId || !rawNodes.length) return;
    const initialAccused = rawNodes.find(node => node.type === 'ACCUSED') || rawNodes[0];
    setSelectedAccusedId(initialAccused.id);
    setSelectedNodeId(initialAccused.id);
  }, [rawNodes, selectedAccusedId]);

  // Selected accused node object
  const selectedAccusedNode = useMemo(() => {
    return rawNodes.find(n => n.id === selectedAccusedId) || rawNodes.find(n => n.type === 'ACCUSED') || rawNodes[0];
  }, [rawNodes, selectedAccusedId]);

  const selectedEvidenceNode = useMemo(
    () => rawNodes.find(node => node.id === selectedNodeId) || selectedAccusedNode,
    [rawNodes, selectedNodeId, selectedAccusedNode],
  );

  const selectedRelationship = useMemo(
    () => rawEdges.find(edge => edge.id === selectedEdgeId) || null,
    [rawEdges, selectedEdgeId],
  );

  // STRICT CASE ISOLATION: The active network ID is strictly tied to the selected accused culprit!
  const activeCulpritNetworkId = useMemo(() => {
    return selectedAccusedNode?.networkId || rawNodes[0]?.networkId || '';
  }, [selectedAccusedNode, rawNodes]);

  // STRICT NETWORK FILTER: Only keep nodes and edges belonging strictly to THIS culprit's case!
  const caseIsolatedNodes = useMemo(() => {
    return rawNodes.filter(node => node.networkId === activeCulpritNetworkId);
  }, [rawNodes, activeCulpritNetworkId]);

  const caseIsolatedNodeIds = useMemo(() => new Set(caseIsolatedNodes.map(n => n.id)), [caseIsolatedNodes]);

  const caseIsolatedEdges = useMemo(() => {
    return rawEdges.filter(edge => edge.networkId === activeCulpritNetworkId && caseIsolatedNodeIds.has(edge.source) && caseIsolatedNodeIds.has(edge.target));
  }, [rawEdges, activeCulpritNetworkId, caseIsolatedNodeIds]);

  // Accused persons in this isolated case
  const accusedPersonsList = useMemo(() => {
    return caseIsolatedNodes.filter(node => node.type === 'ACCUSED');
  }, [caseIsolatedNodes]);

  // All accused profiles for directory
  const allAccusedNodes = useMemo(() => {
    return rawNodes.filter(n => n.type === 'ACCUSED');
  }, [rawNodes]);

  // Filtered accused profiles for directory view
  const filteredAccusedProfiles = useMemo(() => {
    return allAccusedNodes.filter(accused => {
      const matchesSearch =
        accused.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        accused.subText?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        accused.details?.alias?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        accused.details?.district?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        accused.details?.firNumber?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRisk = !onlyHighRisk || accused.riskLevel === 'CRITICAL' || accused.riskLevel === 'HIGH';

      return matchesSearch && matchesRisk;
    });
  }, [allAccusedNodes, searchTerm, onlyHighRisk]);

  // Active Network Info
  const activeNetwork = useMemo(() => {
    return MOCK_SUSPECT_GRAPH.networks.find(n => n.id === activeCulpritNetworkId) || null;
  }, [activeCulpritNetworkId]);

  // Node type counts for active case
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ACCUSED: 0,
      SYNDICATE: 0,
      CASE: 0,
      BANK_ACCOUNT: 0,
      PHONE: 0,
      LOCATION: 0
    };
    caseIsolatedNodes.forEach(node => {
      if (counts[node.type] !== undefined) {
        counts[node.type]++;
      }
    });
    return counts;
  }, [caseIsolatedNodes]);

  // Node position computer (STRICT ORBIT AROUND SELECTED ACCUSED)
  const computedNodes = useMemo(() => {
    const canvasWidth = 780;
    const canvasHeight = 500;

    return caseIsolatedNodes.map((node) => {
      if (customPositions[node.id]) {
        return { ...node, x: customPositions[node.id].x, y: customPositions[node.id].y };
      }

      if (node.id === selectedAccusedId) {
        return { ...node, x: canvasWidth / 2, y: canvasHeight / 2 };
      }

      const otherNodes = caseIsolatedNodes.filter(n => n.id !== selectedAccusedId);
      const nodeIndex = otherNodes.findIndex(n => n.id === node.id);

      if (nodeIndex !== -1) {
        const total = otherNodes.length;
        const angle = (2 * Math.PI * nodeIndex) / (total || 1);
        const radius = node.type === 'ACCUSED' || node.type === 'SYNDICATE' ? 160 : 200;
        return {
          ...node,
          x: Math.round(canvasWidth / 2 + radius * Math.cos(angle)),
          y: Math.round(canvasHeight / 2 + radius * Math.sin(angle))
        };
      }

      return { ...node, x: 400, y: 250 };
    });
  }, [caseIsolatedNodes, selectedAccusedId, customPositions]);

  // Visible nodes filtered by Search or Risk
  const visibleNodes = useMemo(() => {
    return computedNodes.filter(node => {
      const matchesSearch =
        node.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.subText?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.details?.alias?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.details?.firNumber?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRisk = !onlyHighRisk || node.riskLevel === 'CRITICAL' || node.riskLevel === 'HIGH';

      return matchesSearch && matchesRisk;
    });
  }, [computedNodes, searchTerm, onlyHighRisk]);

  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map(n => n.id)), [visibleNodes]);

  // Visible edges connecting visible nodes
  const visibleEdges = useMemo(() => {
    return caseIsolatedEdges.filter(e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target));
  }, [caseIsolatedEdges, visibleNodeIds]);

  // Connected edges to selectedAccusedNode
  const connectedEdgeIds = useMemo(() => {
    return new Set(caseIsolatedEdges.filter(e => e.source === selectedNodeId || e.target === selectedNodeId).map(e => e.id));
  }, [caseIsolatedEdges, selectedNodeId]);

  const selectedNodeRelationships = useMemo(
    () => caseIsolatedEdges.filter(edge => edge.source === selectedNodeId || edge.target === selectedNodeId),
    [caseIsolatedEdges, selectedNodeId],
  );

  const handleInspectAccusedNetwork = (accusedId: string) => {
    setSelectedAccusedId(accusedId);
    setSelectedNodeId(accusedId);
    setSelectedEdgeId('');
    setViewMode('TOPOLOGY_GRAPH');
  };

  const handleInspectEvidenceNode = (nodeId: string) => {
    const node = rawNodes.find(item => item.id === nodeId);
    setSelectedNodeId(nodeId);
    setSelectedEdgeId('');
    if (node?.type === 'ACCUSED') setSelectedAccusedId(nodeId);
  };

  // Node Color & Icon Helper
  const getNodeTheme = (type: NetworkNodeType) => {
    switch (type) {
      case 'ACCUSED':
        return { color: 'var(--critical)', bg: 'rgba(239, 68, 68, 0.16)', border: '#ef4444' };
      case 'SYNDICATE':
        return { color: 'var(--accent)', bg: 'rgba(217, 119, 6, 0.16)', border: '#d97706' };
      case 'CASE':
        return { color: 'var(--info)', bg: 'rgba(59, 130, 246, 0.16)', border: '#3b82f6' };
      case 'BANK_ACCOUNT':
        return { color: 'var(--warning)', bg: 'rgba(245, 158, 11, 0.16)', border: '#f59e0b' };
      case 'PHONE':
        return { color: '#a855f7', bg: 'rgba(168, 85, 247, 0.16)', border: '#a855f7' };
      case 'LOCATION':
        return { color: 'var(--success)', bg: 'rgba(16, 185, 129, 0.16)', border: '#10b981' };
      default:
        return { color: 'var(--text-secondary)', bg: 'var(--surface-muted)', border: 'var(--border)' };
    }
  };

  const getNodeIcon = (type: NetworkNodeType) => {
    switch (type) {
      case 'ACCUSED': return <User size={15} />;
      case 'SYNDICATE': return <Shield size={15} />;
      case 'CASE': return <FileText size={15} />;
      case 'BANK_ACCOUNT': return <CreditCard size={15} />;
      case 'PHONE': return <Phone size={15} />;
      case 'LOCATION': return <MapPin size={15} />;
      default: return <Layers size={15} />;
    }
  };

  // Dragging event handlers
  const handleMouseDownNode = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setDraggedNodeId(nodeId);
  };

  const handleMouseMoveCanvas = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!draggedNodeId || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) / zoomScale);
    const y = Math.round((e.clientY - rect.top) / zoomScale);
    setCustomPositions(prev => ({ ...prev, [draggedNodeId]: { x, y } }));
  };

  const handleMouseUpCanvas = () => {
    setDraggedNodeId(null);
  };

  const resetGraphView = () => {
    setCustomPositions({});
    setSearchTerm('');
    setTypeFilter('ALL');
    setOnlyHighRisk(false);
    setZoomScale(1);
    const initialAccused = rawNodes.find(node => node.type === 'ACCUSED') || rawNodes[0];
    if (initialAccused) {
      setSelectedAccusedId(initialAccused.id);
      setSelectedNodeId(initialAccused.id);
    }
    setSelectedEdgeId('');
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
      gap: '1.1rem'
    }}>
      
      {/* Header Banner & Mode Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--accent-light)',
            color: 'var(--accent-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Flame size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              Individual Suspect Network Topology
            </h3>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              Select a suspect to inspect their verified FIR, victim, location, call and financial links in one isolated graph.
            </p>
          </div>
        </div>

        {/* View Mode Toggle Buttons */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          backgroundColor: 'var(--surface-muted)',
          padding: '0.3rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)'
        }}>
          <button
            onClick={() => setViewMode('DIRECTORY')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              backgroundColor: viewMode === 'DIRECTORY' ? 'var(--accent)' : 'transparent',
              color: viewMode === 'DIRECTORY' ? '#000000' : 'var(--text-secondary)'
            }}
          >
            <Grid size={15} />
            <span>Criminal Directory ({allAccusedNodes.length})</span>
          </button>

          <button
            onClick={() => setViewMode('TOPOLOGY_GRAPH')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              backgroundColor: viewMode === 'TOPOLOGY_GRAPH' ? 'var(--accent)' : 'transparent',
              color: viewMode === 'TOPOLOGY_GRAPH' ? '#000000' : 'var(--text-secondary)'
            }}
          >
            <Box size={15} />
            <span>2D Case Topology Canvas</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: CRIMINAL DIRECTORY LIST                                           */}
      {/* ========================================================================= */}
      {viewMode === 'DIRECTORY' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          
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
                placeholder="Search suspect name, alias, district, FIR ref, or modus operandi..."
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={() => setOnlyHighRisk(!onlyHighRisk)}
                style={{
                  padding: '0.45rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: onlyHighRisk ? '1px solid var(--critical)' : '1px solid var(--border)',
                  backgroundColor: onlyHighRisk ? 'var(--critical-bg)' : 'var(--surface-card)',
                  color: onlyHighRisk ? 'var(--critical)' : 'var(--text-secondary)'
                }}
              >
                ⚠️ High Risk Only (Risk &ge; 75)
              </button>

              <span style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                Showing {filteredAccusedProfiles.length} Criminal Profiles
              </span>
            </div>
          </div>

          {/* Criminal Profiles Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: '1.1rem'
          }}>
            {filteredAccusedProfiles.map(criminal => {
              const riskVal = parseInt(criminal.subText?.match(/\d+/)?.[0] || '80', 10);

              return (
                <div
                  key={criminal.id}
                  style={{
                    backgroundColor: 'var(--surface-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'var(--transition-fast)'
                  }}
                >
                  <div>
                    {/* Top Status & Risk */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span className={`badge ${criminal.details?.status === 'ABSCONDING' ? 'badge-critical' : criminal.details?.status === 'UNDER_ARREST' ? 'badge-success' : 'badge-warning'}`}>
                        {criminal.details?.status || 'SUSPECT'}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)' }}>RECIDIVISM RISK:</span>
                        <span style={{ fontSize: '0.88rem', fontWeight: 800, color: riskVal >= 85 ? 'var(--critical)' : 'var(--warning)' }}>
                          {riskVal}/100
                        </span>
                      </div>
                    </div>

                    {/* Suspect Name & Alias */}
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {criminal.label}
                    </h4>
                    {criminal.details?.alias && (
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent)', marginTop: '0.1rem' }}>
                        Known Alias: "{criminal.details.alias}"
                      </div>
                    )}

                    {/* Key Attributes */}
                    <div style={{
                      marginTop: '0.75rem',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '0.5rem',
                      fontSize: '0.76rem',
                      color: 'var(--text-secondary)'
                    }}>
                      <div><strong>District:</strong> {criminal.details?.district}</div>
                      <div><strong>Prior Convictions:</strong> <span style={{ color: 'var(--critical)', fontWeight: 700 }}>{criminal.details?.priorOffenses || 0} Cases</span></div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <strong>Primary FIR:</strong> <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 700 }}>{criminal.details?.firNumber}</span>
                      </div>
                    </div>

                    {/* Registered Crimes Summary Box */}
                    <div style={{
                      marginTop: '0.75rem',
                      padding: '0.6rem 0.75rem',
                      backgroundColor: 'var(--surface-muted)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.74rem',
                      color: 'var(--text-secondary)'
                    }}>
                      <strong style={{ color: 'var(--text-primary)' }}>Primary Offense Record:</strong>
                      <div style={{ marginTop: '0.2rem', lineHeight: 1.35 }}>
                        {criminal.details?.crimesList?.[0] || 'Under active multi-district investigation.'}
                      </div>
                    </div>
                  </div>

                  {/* Primary Action Button */}
                  <button
                    onClick={() => handleInspectAccusedNetwork(criminal.id)}
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
                      fontSize: '0.84rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      boxShadow: '0 0 12px rgba(217, 119, 6, 0.3)',
                      transition: 'var(--transition-fast)'
                    }}
                  >
                    <Target size={16} />
                    <span>Open Individual Network</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: 2D TOPOLOGY GRAPH                                                */}
      {/* ========================================================================= */}
      {viewMode === 'TOPOLOGY_GRAPH' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Back Controls Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}>
            <button
              onClick={() => setViewMode('DIRECTORY')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.85rem',
                backgroundColor: 'var(--surface-muted)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <ArrowLeft size={15} />
              <span>Back to Criminal Directory</span>
            </button>

            {/* Active Isolated Case Badge */}
            <span style={{
              fontSize: '0.76rem',
              fontWeight: 800,
              color: 'var(--accent)',
              backgroundColor: 'rgba(217, 119, 6, 0.12)',
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(217, 119, 6, 0.3)'
            }}>
              ISOLATED CASE VIEW: {activeNetwork?.name || 'Active Case Topology'}
            </span>
          </div>

          {/* Control & Type Filter Bar */}
          <div style={{
            backgroundColor: 'var(--surface-muted)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '0.65rem 0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.65rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>Highlight Node Type:</span>
              {[
                { type: 'ALL', label: 'All Types' },
                { type: 'ACCUSED', label: `🔴 Accused (${typeCounts['ACCUSED'] || 0})` },
                { type: 'SYNDICATE', label: `🟠 Syndicate (${typeCounts['SYNDICATE'] || 0})` },
                { type: 'CASE', label: `🔵 FIR Case (${typeCounts['CASE'] || 0})` },
                { type: 'BANK_ACCOUNT', label: `🟡 Mule A/C (${typeCounts['BANK_ACCOUNT'] || 0})` },
                { type: 'PHONE', label: `🟣 CDR Log (${typeCounts['PHONE'] || 0})` },
                { type: 'LOCATION', label: `🟢 Location (${typeCounts['LOCATION'] || 0})` }
              ].map(pill => (
                <button
                  key={pill.type}
                  onClick={() => setTypeFilter(pill.type)}
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '0.25rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    backgroundColor: typeFilter === pill.type ? 'var(--accent)' : 'var(--surface-card)',
                    color: typeFilter === pill.type ? '#000000' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'var(--transition-fast)'
                  }}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <button
                onClick={() => setIsFlowAnimated(!isFlowAnimated)}
                style={{
                  padding: '0.25rem 0.55rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: '1px solid var(--border)',
                  backgroundColor: isFlowAnimated ? 'rgba(16, 185, 129, 0.15)' : 'var(--surface-card)',
                  color: isFlowAnimated ? 'var(--success)' : 'var(--text-secondary)'
                }}
              >
                ⚡ {isFlowAnimated ? 'Flow FX On' : 'Flow FX Off'}
              </button>

              <button
                onClick={resetGraphView}
                title="Reset Graph & Center"
                style={{ padding: '0.25rem 0.45rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', backgroundColor: 'var(--surface-card)', color: 'var(--text-primary)', cursor: 'pointer' }}
              >
                <RotateCcw size={13} />
              </button>
            </div>
          </div>

          {/* Main Canvas & Right Inspector Split Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1.3fr', gap: '1.2rem', minHeight: '520px' }}>
            
            {/* LEFT: 2D FLAT SVG GRAPH CANVAS */}
            <div style={{
              backgroundColor: 'var(--surface-muted)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              position: 'relative',
              overflow: 'hidden',
              cursor: draggedNodeId ? 'grabbing' : 'grab'
            }}>

              {/* Active Focus Sub-title Tag */}
              <div style={{
                position: 'absolute',
                top: '0.75rem',
                left: '0.75rem',
                zIndex: 10,
                backgroundColor: 'var(--surface-elevated)',
                border: '1px solid var(--border-accent)',
                borderRadius: 'var(--radius-md)',
                padding: '0.35rem 0.7rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <Target size={14} color="var(--accent)" />
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Selected Culprit: <span style={{ color: 'var(--accent)' }}>{selectedAccusedNode?.label || 'Select Suspect'}</span>
                </span>
              </div>

              {/* 2D Flat SVG Canvas */}
              <div style={{ width: '100%', height: '100%' }}>
                <svg
                  ref={svgRef}
                  viewBox="0 0 780 500"
                  onMouseMove={handleMouseMoveCanvas}
                  onMouseUp={handleMouseUpCanvas}
                  style={{
                    width: '100%',
                    height: '100%',
                    transform: `scale(${zoomScale})`,
                    transformOrigin: 'center center'
                  }}
                >
                  <defs>
                    <pattern id="gridPatternCanvas" width="36" height="36" patternUnits="userSpaceOnUse">
                      <path d="M 36 0 L 0 0 0 36" fill="none" stroke="var(--border)" strokeWidth="0.5" opacity="0.35" />
                    </pattern>

                    <style>{`
                      @keyframes pulseGlowRingCanvas {
                        0% { r: 24px; opacity: 0.85; stroke-width: 2px; }
                        50% { r: 36px; opacity: 0.15; stroke-width: 6px; }
                        100% { r: 24px; opacity: 0.85; stroke-width: 2px; }
                      }
                      @keyframes dashFlowAnimCanvas {
                        to { stroke-dashoffset: -20; }
                      }
                      .flowing-dash-canvas {
                        animation: dashFlowAnimCanvas 1.2s linear infinite;
                      }
                    `}</style>
                  </defs>

                  <rect width="100%" height="100%" fill="url(#gridPatternCanvas)" />

                  {/* Verified relationships for the selected individual network. */}
                  {visibleEdges.map(edge => {
                    const src = computedNodes.find(n => n.id === edge.source);
                    const tgt = computedNodes.find(n => n.id === edge.target);
                    if (!src || !tgt) return null;

                    const isHighlighted = highlightEdgeId === edge.id || connectedEdgeIds.has(edge.id);
                    const isSelectedNodeEdge = edge.source === selectedNodeId || edge.target === selectedNodeId;

                    const isFilterActive = typeFilter !== 'ALL';
                    const isSrcMatch = typeFilter === 'ALL' || src.type === typeFilter || src.id === selectedNodeId;
                    const isTgtMatch = typeFilter === 'ALL' || tgt.type === typeFilter || tgt.id === selectedNodeId;
                    const isEdgeMatched = isSrcMatch && isTgtMatch;

                    const edgeColor = isSelectedNodeEdge ? 'var(--accent)' : isHighlighted ? 'var(--info)' : 'var(--border-subtle)';
                    const midX = (src.x + tgt.x) / 2;
                    const midY = (src.y + tgt.y) / 2;

                    return (
                      <g
                        key={edge.id}
                        data-edge-id={edge.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`${edge.relationType.replaceAll('_', ' ')}: ${edge.description}`}
                        onClick={() => {
                          setSelectedEdgeId(edge.id);
                          setSelectedNodeId(edge.target === selectedNodeId ? edge.source : edge.target);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setSelectedEdgeId(edge.id);
                            setSelectedNodeId(edge.target === selectedNodeId ? edge.source : edge.target);
                          }
                        }}
                        onMouseEnter={() => setHighlightEdgeId(edge.id)}
                        onMouseLeave={() => setHighlightEdgeId(null)}
                        style={{ cursor: 'pointer' }}
                      >
                        <line
                          x1={src.x}
                          y1={src.y}
                          x2={tgt.x}
                          y2={tgt.y}
                          stroke={edgeColor}
                          strokeWidth={isSelectedNodeEdge ? 3.5 : isHighlighted ? 2.5 : 1.5}
                          strokeDasharray={edge.relationType === 'FINANCIAL_TRANSFER' || edge.relationType === 'CALL_LOG' ? '6,4' : 'none'}
                          className={isFlowAnimated && (edge.relationType === 'FINANCIAL_TRANSFER' || edge.relationType === 'CALL_LOG') ? 'flowing-dash-canvas' : ''}
                          opacity={isFilterActive ? (isEdgeMatched ? 0.95 : 0.2) : 0.85}
                          style={{ transition: 'all 400ms cubic-bezier(0.4, 0, 0.2, 1)' }}
                        />

                        <g transform={`translate(${midX}, ${midY})`}>
                          <rect
                            x="-44"
                            y="-10"
                            width="88"
                            height="20"
                            rx="6"
                            fill="var(--surface-elevated)"
                            stroke={isSelectedNodeEdge ? 'var(--accent)' : 'var(--border)'}
                            strokeWidth="1"
                          />
                          <text
                            x="0"
                            y="3"
                            textAnchor="middle"
                            fill={isSelectedNodeEdge ? 'var(--accent)' : 'var(--text-muted)'}
                            fontSize="9"
                            fontWeight="800"
                            fontFamily="var(--font-mono)"
                          >
                            {edge.relationType}
                          </text>
                        </g>
                      </g>
                    );
                  })}

                  {/* Evidence nodes. Selection updates the adjacent evidence inspector. */}
                  {visibleNodes.map(node => {
                    const isSelected = selectedNodeId === node.id;
                    const theme = getNodeTheme(node.type);
                    const isCritical = node.riskLevel === 'CRITICAL';

                    const isFilterActive = typeFilter !== 'ALL';
                    const isTypeMatched = typeFilter === 'ALL' || node.type === typeFilter || node.id === selectedNodeId;

                    let nodeOpacity = 1;
                    if (isFilterActive) {
                      nodeOpacity = isTypeMatched ? 1 : 0.25;
                    }

                    return (
                      <g
                        key={node.id}
                        data-node-id={node.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`Inspect ${node.type.replace('_', ' ')} ${node.label}`}
                        onMouseDown={(e) => handleMouseDownNode(e, node.id)}
                        onClick={() => handleInspectEvidenceNode(node.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            handleInspectEvidenceNode(node.id);
                          }
                        }}
                        style={{ cursor: 'grab', opacity: nodeOpacity, transition: 'all 400ms cubic-bezier(0.4, 0, 0.2, 1)' }}
                      >
                        {/* Outer Pulsing Aura for Selected Culprit / Critical Risk */}
                        {(isSelected || isCritical || (isFilterActive && isTypeMatched && node.id !== selectedNodeId)) && (
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r="26"
                            fill="none"
                            stroke={isSelected ? 'var(--accent)' : theme.border}
                            strokeWidth="3"
                            style={{ animation: 'pulseGlowRingCanvas 2.4s infinite ease-in-out' }}
                          />
                        )}

                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={isSelected ? 26 : (isFilterActive && isTypeMatched ? 23 : 20)}
                          fill="var(--surface-card)"
                          stroke={isSelected ? 'var(--accent)' : theme.border}
                          strokeWidth={isSelected ? 4 : (isFilterActive && isTypeMatched ? 3.5 : 2.5)}
                          style={{ transition: 'all 300ms ease', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.35))' }}
                        />

                        <g transform={`translate(${node.x - 7.5}, ${node.y - 7.5})`} color={theme.color}>
                          {getNodeIcon(node.type)}
                        </g>

                        <g transform={`translate(${node.x}, ${node.y + 30})`}>
                          <rect
                            x="-70"
                            y="-4"
                            width="140"
                            height="30"
                            rx="6"
                            fill="var(--surface-elevated)"
                            stroke={isSelected ? 'var(--accent)' : (isFilterActive && isTypeMatched ? theme.border : 'var(--border)')}
                            strokeWidth={isSelected ? 2.2 : (isFilterActive && isTypeMatched ? 1.8 : 1)}
                          />

                          <text
                            x="0"
                            y="9"
                            textAnchor="middle"
                            fill="var(--text-primary)"
                            fontSize="10.5"
                            fontWeight="800"
                          >
                            {node.label.length > 20 ? node.label.slice(0, 18) + '...' : node.label}
                          </text>

                          <text
                            x="0"
                            y="21"
                            textAnchor="middle"
                            fill="var(--text-muted)"
                            fontSize="8.5"
                            fontWeight="600"
                          >
                            {node.subText ? (node.subText.length > 22 ? node.subText.slice(0, 20) + '...' : node.subText) : node.type}
                          </text>
                        </g>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* RIGHT: AI Case Brief & Accused Dossier Panel */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              maxHeight: '520px',
              overflowY: 'auto'
            }}>
              
              {/* SECTION A: AI Criminal Network & Case Brief */}
              <div style={{
                backgroundColor: 'var(--surface-elevated)',
                border: '1px solid var(--border-accent)',
                borderRadius: 'var(--radius-md)',
                padding: '1.1rem',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Sparkles size={16} color="var(--accent)" />
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      AI NETWORK CASE BRIEF
                    </span>
                  </div>
                  <span className="badge badge-critical" style={{ fontSize: '0.68rem' }}>
                    {activeNetwork ? activeNetwork.threatLevel : 'STATEWIDE SYNDICATES'}
                  </span>
                </div>

                <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                  {activeNetwork ? activeNetwork.name : 'Isolated Case Topology Map'}
                </h4>

                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.3rem', lineHeight: 1.45 }}>
                  {activeNetwork ? activeNetwork.briefSummary : 'Showing isolated case topology for the selected culprit.'}
                </p>

                <div style={{
                  marginTop: '0.65rem',
                  padding: '0.55rem',
                  backgroundColor: 'var(--surface-muted)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.74rem',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-accent)'
                }}>
                  <div><strong>Primary Modus Operandi:</strong> "{activeNetwork ? activeNetwork.modusOperandi : 'Trojanized APKs, Gas-Cutters, VoIP Extortion'}"</div>
                  <div style={{ marginTop: '0.25rem' }}><strong style={{ color: 'var(--critical)' }}>Financial Impact:</strong> {activeNetwork ? activeNetwork.totalFinancialImpact : '₹38.5 Lakhs Stolen'}</div>
                </div>
              </div>

              {/* SECTION B: Accused Persons Directory */}
              <div style={{
                backgroundColor: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '1.1rem',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <UserCheck size={16} color="var(--accent)" />
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                      Accused Persons In This Case ({accusedPersonsList.length})
                    </span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Click a person to isolate their graph
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                  {accusedPersonsList.map(accusedNode => {
                    const isSelected = selectedAccusedId === accusedNode.id;

                    return (
                      <div
                        key={accusedNode.id}
                        onClick={() => handleInspectAccusedNetwork(accusedNode.id)}
                        style={{
                          padding: '0.65rem 0.85rem',
                          backgroundColor: isSelected ? 'var(--accent-light)' : 'var(--surface-muted)',
                          border: isSelected ? '1px solid var(--border-accent)' : '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                          transition: 'var(--transition-fast)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{
                              fontSize: '0.88rem',
                              fontWeight: 800,
                              color: isSelected ? 'var(--accent-muted)' : 'var(--text-primary)'
                            }}>
                              {accusedNode.label}
                            </span>
                            {accusedNode.details?.alias && (
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                ("{accusedNode.details.alias}")
                              </span>
                            )}
                          </div>

                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                            {accusedNode.details?.district} • {accusedNode.details?.priorOffenses || 0} Convictions
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                          <span className={`badge ${accusedNode.details?.status === 'ABSCONDING' ? 'badge-critical' : accusedNode.details?.status === 'UNDER_ARREST' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.65rem' }}>
                            {accusedNode.details?.status || 'SUSPECT'}
                          </span>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--critical)' }}>
                            Risk: {accusedNode.subText?.match(/\d+/)?.[0] || '80'}/100
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECTION C: Selected evidence node and its verified relationships. */}
              {selectedEvidenceNode && (
                <div style={{
                  backgroundColor: 'var(--surface-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.1rem',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--critical)', textTransform: 'uppercase' }}>
                      SELECTED {selectedEvidenceNode.type.replace('_', ' ')} EVIDENCE
                    </span>
                    <span className="badge badge-warning" style={{ fontSize: '0.68rem' }}>
                      {selectedNodeRelationships.length} VERIFIED LINK{selectedNodeRelationships.length === 1 ? '' : 'S'}
                    </span>
                  </div>

                  <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {selectedEvidenceNode.label}
                  </h4>
                  {selectedEvidenceNode.subText && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      {selectedEvidenceNode.subText}
                    </div>
                  )}

                  <div style={{ marginTop: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.45rem' }}>
                    {selectedEvidenceNode.details?.firNumber && <div className="network-evidence-field"><span>FIR reference</span><strong>{selectedEvidenceNode.details.firNumber}</strong></div>}
                    {selectedEvidenceNode.details?.district && <div className="network-evidence-field"><span>District</span><strong>{selectedEvidenceNode.details.district}</strong></div>}
                    {selectedEvidenceNode.details?.crimeType && <div className="network-evidence-field"><span>Crime type</span><strong>{selectedEvidenceNode.details.crimeType}</strong></div>}
                    {selectedEvidenceNode.details?.filedDate && <div className="network-evidence-field"><span>Recorded date</span><strong>{selectedEvidenceNode.details.filedDate}</strong></div>}
                    {selectedEvidenceNode.details?.priorOffenses !== undefined && <div className="network-evidence-field"><span>Previous FIRs</span><strong>{selectedEvidenceNode.details.priorOffenses}</strong></div>}
                    <div className="network-evidence-field"><span>Risk classification</span><strong>{selectedEvidenceNode.riskLevel || 'NORMAL'}</strong></div>
                  </div>

                  <div style={{ marginTop: '0.8rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Connected evidence
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.35rem' }}>
                      {selectedNodeRelationships.length ? selectedNodeRelationships.slice(0, 8).map((relationship) => {
                        const relatedId = relationship.source === selectedEvidenceNode.id ? relationship.target : relationship.source;
                        const relatedNode = rawNodes.find(node => node.id === relatedId);
                        return (
                          <button key={relationship.id} onClick={() => handleInspectEvidenceNode(relatedId)} style={{
                            padding: '0.45rem 0.65rem',
                            backgroundColor: 'var(--surface-muted)',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-subtle)',
                            fontSize: '0.74rem',
                            color: 'var(--text-primary)',
                            display: 'flex',
                            width: '100%',
                            textAlign: 'left',
                            cursor: 'pointer',
                            alignItems: 'flex-start',
                            gap: '0.4rem'
                          }}>
                            <CheckCircle2 size={13} color="var(--accent)" style={{ flexShrink: 0, marginTop: '2px' }} />
                            <span><strong>{relationship.relationType.replaceAll('_', ' ')}</strong><br />{relatedNode?.label || relatedId}<br /><small>{relationship.description}</small></span>
                          </button>
                        );
                      }) : (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          No relationship is recorded for this node in the verified registry.
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedRelationship && (
                    <div style={{ marginTop: '0.75rem', padding: '0.65rem', borderRadius: 'var(--radius-sm)', background: 'var(--surface-muted)', border: '1px solid var(--border-accent)', fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>Selected relationship:</strong> {selectedRelationship.description}
                      {selectedRelationship.amount ? <div style={{ marginTop: '0.25rem' }}>Recorded amount: INR {selectedRelationship.amount.toLocaleString('en-IN')}</div> : null}
                    </div>
                  )}

                  <div style={{
                    marginTop: '0.85rem',
                    paddingTop: '0.65rem',
                    borderTop: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.76rem',
                    color: 'var(--text-secondary)'
                  }}>
                    <span>Evidence source:</span>
                    <strong style={{ color: 'var(--accent)' }}>
                      {selectedEvidenceNode.details?.provenance || 'Verified relationship registry'}
                    </strong>
                  </div>
                </div>
              )}

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
