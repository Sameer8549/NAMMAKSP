import React, { useState, useMemo, useEffect } from 'react';
import { Activity, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';

interface OversightCategoryItem {
  id: string;
  title: string;
  categoryName: string;
  caseCount: number;
  financialLoss: string;
  status: string;
  statusColor: string;
  primaryFir: string;
  summary: string;
}

interface MovingCaseOversightGraphProps {
  data: OversightCategoryItem[];
  onSelectCategory: (categoryId: string) => void;
  selectedCategoryId: string | null;
}

export const MovingCaseOversightGraph: React.FC<MovingCaseOversightGraphProps> = ({
  data,
  onSelectCategory,
  selectedCategoryId
}) => {
  const [hoveredCategoryId, setHoveredCategoryId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Dynamic live changing trend state (Red Rising / Green Decreasing)
  const [trendState, setTrendState] = useState<'RISING' | 'DECREASING'>('RISING');

  // Live telemetry pulse simulation for center pie counter (alternates between Red Rising & Green Decreasing)
  useEffect(() => {
    const interval = setInterval(() => {
      setTrendState(prev => prev === 'RISING' ? 'DECREASING' : 'RISING');
    }, 3500); // Toggles color & trend every 3.5 seconds
    return () => clearInterval(interval);
  }, []);

  // Filtered categories based on statusFilter
  const filteredCategories = useMemo(() => {
    if (statusFilter === 'ALL') return data;
    return data.filter(c => c.status === statusFilter);
  }, [data, statusFilter]);

  // Compute total active cases from filtered data
  const totalCases = useMemo(() => {
    return filteredCategories.reduce((sum, item) => sum + item.caseCount, 0);
  }, [filteredCategories]);

  // Hovered Category Object
  const hoveredCategory = useMemo(() => {
    if (!hoveredCategoryId) return null;
    return data.find(c => c.id === hoveredCategoryId) || null;
  }, [hoveredCategoryId, data]);

  // Compute SVG Donut Pie Slices
  const pieSlices = useMemo(() => {
    let cumulativePercent = 0;
    const radius = 70;
    const circumference = 2 * Math.PI * radius; // ~439.8

    return filteredCategories.map(cat => {
      const percent = totalCases > 0 ? cat.caseCount / totalCases : 0;
      const strokeDasharray = `${percent * circumference} ${circumference}`;
      const strokeDashoffset = -cumulativePercent * circumference;
      cumulativePercent += percent;

      return {
        ...cat,
        percent: Math.round(percent * 100),
        strokeDasharray,
        strokeDashoffset
      };
    });
  }, [filteredCategories, totalCases]);

  return (
    <div style={{
      marginTop: '1.1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.85rem'
    }}>
      {/* Chart Top Bar with Live Case Filters */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.65rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity size={18} color="var(--accent)" style={{ animation: 'pulse 1.5s infinite' }} />
          <span style={{
            fontSize: '0.88rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em'
          }}>
            Case Distribution Chart
          </span>
        </div>

        {/* Live Status Filter Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Filter Status:
          </span>
          {[
            { id: 'ALL', label: 'All Statuses' },
            { id: 'UNDER_INVESTIGATION', label: '🔴 Under Investigation' },
            { id: 'ABSCONDING_SUSPECT', label: '🟡 Absconding' },
            { id: 'UNDER_ARREST', label: '🔵 Under Arrest' },
            { id: 'INTERDICTION_ACTIVE', label: '🟢 Interdiction Active' }
          ].map(filter => (
            <button
              key={filter.id}
              onClick={() => setStatusFilter(filter.id)}
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '0.25rem 0.55rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                backgroundColor: statusFilter === filter.id ? 'var(--accent)' : 'var(--surface-muted)',
                color: statusFilter === filter.id ? 'var(--text-inverse)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'var(--transition-fast)'
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split Layout: Donut Chart with Hover Inspector | Category Inspection Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(280px, 1fr) minmax(340px, 1.8fr)',
        gap: '1.1rem',
        alignItems: 'center'
      }}>
        
        {/* LEFT: INTERACTIVE SVG PIE CHART WITH HOVER TOOLTIP & DYNAMIC CENTER TICKER */}
        <div style={{
          backgroundColor: 'var(--surface-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          boxShadow: 'var(--shadow-sm)',
          minHeight: '260px'
        }}>
          <div style={{ position: 'relative', width: '190px', height: '190px' }}>
            <svg
              viewBox="0 0 180 180"
              style={{
                width: '100%',
                height: '100%',
                transform: 'rotate(-90deg)',
                transition: 'all 600ms cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              {/* Background Ring */}
              <circle
                cx="90"
                cy="90"
                r="70"
                fill="none"
                stroke="var(--surface-muted)"
                strokeWidth="24"
              />

              {/* Dynamic Pie Slices with Hover Handlers */}
              {pieSlices.map(slice => {
                const isHovered = hoveredCategoryId === slice.id;
                const isSelected = selectedCategoryId === slice.id;

                return (
                  <circle
                    key={slice.id}
                    cx="90"
                    cy="90"
                    r="70"
                    fill="none"
                    stroke={slice.statusColor}
                    strokeWidth={isHovered || isSelected ? '28' : '22'}
                    strokeDasharray={slice.strokeDasharray}
                    strokeDashoffset={slice.strokeDashoffset}
                    onMouseEnter={() => setHoveredCategoryId(slice.id)}
                    onMouseLeave={() => setHoveredCategoryId(null)}
                    onClick={() => onSelectCategory(slice.id)}
                    style={{
                      transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
                      cursor: 'pointer',
                      filter: isHovered ? `drop-shadow(0 0 10px ${slice.statusColor})` : 'none',
                      opacity: hoveredCategoryId && !isHovered ? 0.35 : 1
                    }}
                  />
                );
              })}
            </svg>

            {/* DYNAMIC LIVE CHANGING NUMBER & COLOR PULSE IN DONUT CENTER */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              {/* Dynamic Live Counter with Color Pulse (Red Rising / Green Decreasing) */}
              <span style={{
                fontSize: '1.8rem',
                fontWeight: 900,
                color: trendState === 'RISING' ? 'var(--critical)' : 'var(--success)',
                lineHeight: 1,
                transition: 'color 500ms ease, transform 300ms ease',
                textShadow: trendState === 'RISING' ? '0 0 12px rgba(239, 68, 68, 0.4)' : '0 0 12px rgba(16, 185, 129, 0.4)'
              }}>
                {totalCases}
              </span>

              <span style={{
                fontSize: '0.62rem',
                fontWeight: 800,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginTop: '0.15rem'
              }}>
                ACTIVE CASES
              </span>

              {/* Dynamic Live Trend Badge (Red Rising vs Green Decreasing) */}
              <div style={{
                marginTop: '0.35rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.2rem',
                padding: '0.15rem 0.45rem',
                borderRadius: '999px',
                fontSize: '0.62rem',
                fontWeight: 800,
                backgroundColor: trendState === 'RISING' ? 'var(--critical-bg)' : 'var(--success-bg)',
                color: trendState === 'RISING' ? 'var(--critical)' : 'var(--success)',
                border: `1px solid ${trendState === 'RISING' ? 'var(--critical)' : 'var(--success)'}`,
                transition: 'all 500ms ease'
              }}>
                {trendState === 'RISING' ? (
                  <>
                    <TrendingUp size={11} />
                    <span>▲ RISING (2 NEW)</span>
                  </>
                ) : (
                  <>
                    <TrendingDown size={11} />
                    <span>▼ RESOLVED (1 CLOSED)</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* HOVER TOOLTIP FLOATING INSPECTOR BOX */}
          {hoveredCategory ? (
            <div style={{
              marginTop: '0.85rem',
              padding: '0.55rem 0.85rem',
              backgroundColor: 'var(--surface-card)',
              border: `1px solid ${hoveredCategory.statusColor}`,
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.75rem',
              textAlign: 'center',
              boxShadow: 'var(--shadow-sm)',
              animation: 'fadeIn 150ms ease-out',
              width: '90%'
            }}>
              <div style={{ fontWeight: 800, color: hoveredCategory.statusColor }}>
                ● {hoveredCategory.categoryName} ({hoveredCategory.caseCount} Active Case)
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                Status: {hoveredCategory.status} · Records: {hoveredCategory.caseCount}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.85rem', textAlign: 'center' }}>
              Hover mouse over any pie slice to inspect category breakdown
            </div>
          )}
        </div>

        {/* RIGHT: CATEGORY DOSSIER CARDS GRID */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '0.85rem'
        }}>
          {filteredCategories.map(cat => {
            const isSelected = selectedCategoryId === cat.id;
            const isHovered = hoveredCategoryId === cat.id;

            return (
              <div
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                onMouseEnter={() => setHoveredCategoryId(cat.id)}
                onMouseLeave={() => setHoveredCategoryId(null)}
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  border: isSelected || isHovered ? `1.5px solid ${cat.statusColor}` : '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.95rem 1.05rem',
                  cursor: 'pointer',
                  transition: 'all 200ms ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                  boxShadow: isSelected || isHovered ? `0 0 16px ${cat.statusColor}33` : 'var(--shadow-sm)'
                }}
              >
                {/* Top Meta */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <span style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: cat.statusColor,
                      boxShadow: `0 0 8px ${cat.statusColor}`
                    }} />
                    <span style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {cat.categoryName}
                    </span>
                  </div>

                  {/* Evidence volume */}
                  <span style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--critical)' }}>
                    {cat.caseCount} FIRs
                  </span>
                </div>

                <h4 style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, lineHeight: 1.25 }}>
                  {cat.title}
                </h4>

                <div style={{
                  padding: '0.45rem 0.65rem',
                  backgroundColor: 'var(--surface-muted)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)'
                }}>
                  <strong style={{ color: 'var(--text-primary)' }}>{cat.caseCount} Active Case</strong> ({cat.status})
                </div>

                {/* Inspect Footer Link */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.74rem', color: 'var(--accent)', fontWeight: 700, marginTop: '0.2rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                    <span>View Case Details</span>
                    <ChevronRight size={13} />
                  </span>
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};
