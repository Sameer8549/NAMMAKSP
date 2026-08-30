import React, { useState, useMemo } from 'react';
import {
  PieChart,
  ChevronRight
} from 'lucide-react';

export interface SunburstArcSegment {
  id: string;
  label: string;
  level: 1 | 2; // 1 = Age Group Inner Ring, 2 = Offense / Suspect-Victim Outer Ring
  parentAgeGroup?: string;
  percentage: number;
  color: string;
  accusedShare: number;
  victimShare: number;
  primaryRiskFactor: string;
  topOffenses: string[];
  recommendedStrategy: string;
}

const SUNBURST_DATA: SunburstArcSegment[] = [
  // LEVEL 1: AGE DEMOGRAPHIC GROUPS (INNER RING)
  {
    id: 'AGE-18-25',
    label: '18 - 25 yrs',
    level: 1,
    percentage: 32,
    color: '#ef4444', // Red / Critical
    accusedShare: 42.6,
    victimShare: 18.2,
    primaryRiskFactor: 'Telegram Money Mule Recruitment & Fast-Money APK Distribution',
    topOffenses: ['KEB Bill APK Phishing', 'SIM Card Forgery', 'High-Speed Bike Chain Snatching'],
    recommendedStrategy: 'Campus Cyber Awareness drives & Telegram Mule Account Interception.'
  },
  {
    id: 'AGE-26-35',
    label: '26 - 35 yrs',
    level: 1,
    percentage: 30,
    color: '#f59e0b', // Amber / Warning
    accusedShare: 34.1,
    victimShare: 24.5,
    primaryRiskFactor: 'Commercial Site Extortion & Hawala Wire Laundering',
    topOffenses: ['Gokul Road Extortion Threats', 'Gold Showroom Safe Cutting', 'USDT Crypto Transfers'],
    recommendedStrategy: 'Industrial zone armed PCR patrols & Builders Association sting ops.'
  },
  {
    id: 'AGE-36-50',
    label: '36 - 50 yrs',
    level: 1,
    percentage: 22,
    color: '#d97706', // Gold / Primary
    accusedShare: 16.4,
    victimShare: 32.8,
    primaryRiskFactor: 'Middle-Management Savings Fraud & Utility Bill APK Scams',
    topOffenses: ['Fake Electricity Bill Drops', 'Property Title Extortion', 'Fake Investment Schemes'],
    recommendedStrategy: 'Public advisories 5 days prior to utility bill due dates.'
  },
  {
    id: 'AGE-51-65',
    label: '51 - 65 yrs',
    level: 1,
    percentage: 11,
    color: '#3b82f6', // Info Blue
    accusedShare: 5.5,
    victimShare: 16.4,
    primaryRiskFactor: 'Retirement Savings Extraction & Pension Bank Hijacking',
    topOffenses: ['Pension Account OTP Interception', 'Senior Citizen Home Intrusion'],
    recommendedStrategy: 'Bank branch OTP push verification alerts & senior citizen beat visits.'
  },
  {
    id: 'AGE-65-PLUS',
    label: '65+ yrs',
    level: 1,
    percentage: 5,
    color: '#10b981', // Emerald Success
    accusedShare: 1.4,
    victimShare: 8.1,
    primaryRiskFactor: 'Vulnerable Isolated Living & Impersonation Scams',
    topOffenses: ['Police Impersonation Cash Demands', 'Daylight Doorstep Theft'],
    recommendedStrategy: 'Station Elderly Care Officer registry & emergency panic button installation.'
  }
];

// Outer Ring Sub-wedges (Offense Composition per Age Group)
const OUTER_SUB_WEDGES: SunburstArcSegment[] = [
  // 18 - 25 yrs Sub-wedges
  {
    id: 'SUB-18-25-CYBER',
    label: 'Cyber APK (55%)',
    level: 2,
    parentAgeGroup: '18 - 25 yrs',
    percentage: 17.6,
    color: '#dc2626',
    accusedShare: 48.0,
    victimShare: 12.0,
    primaryRiskFactor: 'Mule account selling via Telegram bots',
    topOffenses: ['KEB Bill APK Hijacking'],
    recommendedStrategy: 'Freeze ICICI mule accounts'
  },
  {
    id: 'SUB-18-25-SNATCH',
    label: 'Chain Snatching (45%)',
    level: 2,
    parentAgeGroup: '18 - 25 yrs',
    percentage: 14.4,
    color: '#b91c1c',
    accusedShare: 37.2,
    victimShare: 24.4,
    primaryRiskFactor: 'Stolen 390cc bikes along highway toll booths',
    topOffenses: ['Suburban Toll Gate Escapes'],
    recommendedStrategy: 'FASTag ANPR camera barrier locks'
  },

  // 26 - 35 yrs Sub-wedges
  {
    id: 'SUB-26-35-EXTORT',
    label: 'Extortion (60%)',
    level: 2,
    parentAgeGroup: '26 - 35 yrs',
    percentage: 18.0,
    color: '#d97706',
    accusedShare: 38.0,
    victimShare: 20.0,
    primaryRiskFactor: 'UK VoIP (+44) Extortion calls to building contractors',
    topOffenses: ['Gokul Road Extortion Ring'],
    recommendedStrategy: 'Audit Municipal approval file logs'
  },
  {
    id: 'SUB-26-35-HEIST',
    label: 'Safe Cutting (40%)',
    level: 2,
    parentAgeGroup: '26 - 35 yrs',
    percentage: 12.0,
    color: '#b45309',
    accusedShare: 30.2,
    victimShare: 29.0,
    primaryRiskFactor: 'Monsoon oxy-acetylene torch break-ins',
    topOffenses: ['Jeweler Cluster Safe Cutting'],
    recommendedStrategy: 'Stationary rainstorm night beats'
  },

  // 36 - 50 yrs Sub-wedges
  {
    id: 'SUB-36-50-SAVINGS',
    label: 'Savings Scams (70%)',
    level: 2,
    parentAgeGroup: '36 - 50 yrs',
    percentage: 15.4,
    color: '#ca8a04',
    accusedShare: 14.0,
    victimShare: 38.0,
    primaryRiskFactor: 'Fake High-Yield Crypto Investment portals',
    topOffenses: ['USDT Deposit Scams'],
    recommendedStrategy: 'Bank freeze orders'
  },
  {
    id: 'SUB-36-50-TITLE',
    label: 'Land Title (30%)',
    level: 2,
    parentAgeGroup: '36 - 50 yrs',
    percentage: 6.6,
    color: '#a16207',
    accusedShare: 18.8,
    victimShare: 27.6,
    primaryRiskFactor: 'Forged Property Records',
    topOffenses: ['Sub-Registrar Title Fraud'],
    recommendedStrategy: 'Biometric land deed validation'
  },

  // 51 - 65 yrs Sub-wedges
  {
    id: 'SUB-51-65-PENSION',
    label: 'Pension Fraud (80%)',
    level: 2,
    parentAgeGroup: '51 - 65 yrs',
    percentage: 8.8,
    color: '#2563eb',
    accusedShare: 4.0,
    victimShare: 18.0,
    primaryRiskFactor: 'Bank OTP Interception',
    topOffenses: ['Pension Account Hijack'],
    recommendedStrategy: 'Senior Citizen Bank OTP Push alerts'
  },
  {
    id: 'SUB-51-65-INTRUDE',
    label: 'Burglary (20%)',
    level: 2,
    parentAgeGroup: '51 - 65 yrs',
    percentage: 2.2,
    color: '#1d4ed8',
    accusedShare: 7.0,
    victimShare: 14.8,
    primaryRiskFactor: 'Night Doorlock Bypassing',
    topOffenses: ['Daylight Home Intrusion'],
    recommendedStrategy: 'Station Senior Citizen Beat Check'
  },

  // 65+ yrs Sub-wedges
  {
    id: 'SUB-65-POLICE',
    label: 'Police Impersonation (100%)',
    level: 2,
    parentAgeGroup: '65+ yrs',
    percentage: 5.0,
    color: '#059669',
    accusedShare: 1.4,
    victimShare: 8.1,
    primaryRiskFactor: 'Fake Officer Arrest Threats',
    topOffenses: ['Doorstep Cash Extortion'],
    recommendedStrategy: 'Elderly Care Officer Registry'
  }
];

export const DemographicsSunburstChart: React.FC = () => {
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>('AGE-18-25');
  const [hoveredSegmentId, setHoveredSegmentId] = useState<string | null>(null);

  // Active Segment Details
  const activeSegment = useMemo(() => {
    const all = [...SUNBURST_DATA, ...OUTER_SUB_WEDGES];
    return all.find(s => s.id === selectedSegmentId) || SUNBURST_DATA[0];
  }, [selectedSegmentId]);

  // SVG Sunburst Arc Math Generator
  const sunburstArcs = useMemo(() => {
    const cx = 200;
    const cy = 200;

    // Helper: Convert Polar to Cartesian coordinates
    const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
      const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
      return {
        x: centerX + radius * Math.cos(angleInRadians),
        y: centerY + radius * Math.sin(angleInRadians)
      };
    };

    // Helper: Create SVG Arc Path String
    const createArcPath = (innerRadius: number, outerRadius: number, startAngle: number, endAngle: number) => {
      // Ensure slight gap between wedges
      const gap = 0.8;
      const sa = startAngle + gap;
      const ea = endAngle - gap;

      if (ea <= sa) return '';

      const startOuter = polarToCartesian(cx, cy, outerRadius, ea);
      const endOuter = polarToCartesian(cx, cy, outerRadius, sa);
      const startInner = polarToCartesian(cx, cy, innerRadius, ea);
      const endInner = polarToCartesian(cx, cy, innerRadius, sa);

      const largeArcFlag = ea - sa <= 180 ? '0' : '1';

      return [
        `M ${startOuter.x} ${startOuter.y}`,
        `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${endOuter.x} ${endOuter.y}`,
        `L ${endInner.x} ${endInner.y}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${startInner.x} ${startInner.y}`,
        'Z'
      ].join(' ');
    };

    // Build Inner Ring Arcs (Level 1)
    let currentAngle = 0;
    const innerArcs = SUNBURST_DATA.map(item => {
      const angleSpan = (item.percentage / 100) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angleSpan;
      currentAngle = endAngle;

      const path = createArcPath(65, 125, startAngle, endAngle);
      const midAngle = (startAngle + endAngle) / 2;
      const labelPos = polarToCartesian(cx, cy, 95, midAngle);

      return {
        ...item,
        path,
        startAngle,
        endAngle,
        labelPos,
        midAngle
      };
    });

    // Build Outer Ring Arcs (Level 2)
    const outerArcs = OUTER_SUB_WEDGES.map(item => {
      const parent = innerArcs.find(p => p.label === item.parentAgeGroup);
      if (!parent) return null;

      // Calculate fraction relative to parent
      const parentSubWedges = OUTER_SUB_WEDGES.filter(w => w.parentAgeGroup === item.parentAgeGroup);
      const parentTotalSubPercent = parentSubWedges.reduce((sum, w) => sum + w.percentage, 0);

      const parentAngleSpan = parent.endAngle - parent.startAngle;
      const wedgeFraction = item.percentage / parentTotalSubPercent;
      const wedgeAngleSpan = parentAngleSpan * wedgeFraction;

      // Find index within parent
      const idxInParent = parentSubWedges.findIndex(w => w.id === item.id);
      let prevAnglesSum = 0;
      for (let i = 0; i < idxInParent; i++) {
        prevAnglesSum += (parentSubWedges[i].percentage / parentTotalSubPercent) * parentAngleSpan;
      }

      const startAngle = parent.startAngle + prevAnglesSum;
      const endAngle = startAngle + wedgeAngleSpan;

      const path = createArcPath(132, 182, startAngle, endAngle);
      const midAngle = (startAngle + endAngle) / 2;
      const labelPos = polarToCartesian(cx, cy, 157, midAngle);

      return {
        ...item,
        path,
        startAngle,
        endAngle,
        labelPos,
        midAngle
      };
    }).filter(Boolean);

    return { innerArcs, outerArcs };
  }, []);

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

      {/* Header Banner */}
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
            <PieChart size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              Interactive Multi-Tier Demographic Sunburst Chart
            </h3>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              Inner Ring: Age Demographic Groups | Outer Ring: Specific Offense Breakdown & Suspect/Victim Share.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{
            fontSize: '0.76rem',
            fontWeight: 800,
            color: 'var(--accent)',
            backgroundColor: 'rgba(217, 119, 6, 0.12)',
            padding: '0.35rem 0.75rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(217, 119, 6, 0.3)'
          }}>
            ⚡ INTERACTIVE SUNBURST DRILLDOWN ACTIVE
          </span>
        </div>
      </div>

      {/* Split Grid: Left Interactive SVG Sunburst Canvas | Right Selected Segment Dossier */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 1.3fr) minmax(340px, 1.1fr)', gap: '1.25rem' }}>
        
        {/* LEFT: SVG INTERACTIVE SUNBURST CANVAS */}
        <div style={{
          backgroundColor: 'var(--surface-elevated)',
          border: '1px solid var(--border-accent)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          boxShadow: 'var(--shadow-sm)',
          minHeight: '380px'
        }}>
          
          <svg viewBox="0 0 400 400" style={{ width: '100%', maxHeight: '360px' }}>
            <defs>
              <filter id="sunburstGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Background Radial Glow Center */}
            <circle cx="200" cy="200" r="60" fill="var(--surface-card)" stroke="var(--border-accent)" strokeWidth="1.5" />
            
            {/* Center Core Label */}
            <text x="200" y="195" textAnchor="middle" fill="var(--text-primary)" fontSize="12" fontWeight="900">
              KARNATAKA
            </text>
            <text x="200" y="212" textAnchor="middle" fill="var(--accent)" fontSize="10" fontWeight="800">
              DEMOGRAPHICS
            </text>

            {/* LEVEL 1: INNER RING ARCS */}
            {sunburstArcs.innerArcs.map(arc => {
              const isSelected = selectedSegmentId === arc.id;
              const isHovered = hoveredSegmentId === arc.id;

              return (
                <g
                  key={arc.id}
                  onClick={() => setSelectedSegmentId(arc.id)}
                  onMouseEnter={() => setHoveredSegmentId(arc.id)}
                  onMouseLeave={() => setHoveredSegmentId(null)}
                  style={{ cursor: 'pointer', transition: 'all 200ms ease' }}
                >
                  <path
                    d={arc.path}
                    fill={arc.color}
                    stroke="var(--surface-elevated)"
                    strokeWidth={isSelected ? '3' : '1.5'}
                    opacity={isSelected || isHovered ? 1 : 0.82}
                    style={{
                      transformOrigin: '200px 200px',
                      transform: isSelected || isHovered ? 'scale(1.03)' : 'scale(1)',
                      transition: 'transform 200ms ease, opacity 200ms ease',
                      filter: isSelected ? 'url(#sunburstGlow)' : 'none'
                    }}
                  />
                  {/* Arc Label */}
                  <text
                    x={arc.labelPos.x}
                    y={arc.labelPos.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#ffffff"
                    fontSize="9.5"
                    fontWeight="900"
                    pointerEvents="none"
                    style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}
                  >
                    {arc.label}
                  </text>
                </g>
              );
            })}

            {/* LEVEL 2: OUTER RING ARCS */}
            {sunburstArcs.outerArcs.map(arc => {
              if (!arc) return null;
              const isSelected = selectedSegmentId === arc.id;
              const isHovered = hoveredSegmentId === arc.id;

              return (
                <g
                  key={arc.id}
                  onClick={() => setSelectedSegmentId(arc.id)}
                  onMouseEnter={() => setHoveredSegmentId(arc.id)}
                  onMouseLeave={() => setHoveredSegmentId(null)}
                  style={{ cursor: 'pointer', transition: 'all 200ms ease' }}
                >
                  <path
                    d={arc.path}
                    fill={arc.color}
                    stroke="var(--surface-elevated)"
                    strokeWidth={isSelected ? '2.5' : '1'}
                    opacity={isSelected || isHovered ? 1 : 0.75}
                    style={{
                      transformOrigin: '200px 200px',
                      transform: isSelected || isHovered ? 'scale(1.04)' : 'scale(1)',
                      transition: 'transform 200ms ease, opacity 200ms ease',
                      filter: isSelected ? 'url(#sunburstGlow)' : 'none'
                    }}
                  />
                  {/* Outer Wedge Label */}
                  <text
                    x={arc.labelPos.x}
                    y={arc.labelPos.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#ffffff"
                    fontSize="7.5"
                    fontWeight="800"
                    pointerEvents="none"
                    style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
                  >
                    {arc.label.split(' ')[0]}
                  </text>
                </g>
              );
            })}
          </svg>

          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: '0.4rem' }}>
            💡 Click any inner or outer wedge segment to inspect deep criminal intelligence dossier.
          </span>
        </div>

        {/* RIGHT: SELECTED SUNBURST SEGMENT INTELLIGENCE DOSSIER */}
        <div style={{
          backgroundColor: 'var(--surface-elevated)',
          border: '1px solid var(--border-accent)',
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <span className="badge badge-success" style={{ fontSize: '0.68rem' }}>
                {activeSegment.level === 1 ? 'INNER RING: AGE GROUP' : `OUTER RING: ${activeSegment.parentAgeGroup}`}
              </span>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent)' }}>
                SHARE: {activeSegment.percentage}%
              </span>
            </div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-primary)' }}>
              {activeSegment.label}
            </h3>
          </div>

          {/* Accused vs Victim Ratio Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.65rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.2rem'
            }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--critical)', textTransform: 'uppercase' }}>
                ACCUSED SHARE
              </span>
              <strong style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--critical)' }}>
                {activeSegment.accusedShare}%
              </strong>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Offender Ratio</span>
            </div>

            <div style={{
              backgroundColor: 'rgba(217, 119, 6, 0.12)',
              border: '1px solid rgba(217, 119, 6, 0.3)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.65rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.2rem'
            }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase' }}>
                VICTIM SHARE
              </span>
              <strong style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent)' }}>
                {activeSegment.victimShare}%
              </strong>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Defrauded Target Ratio</span>
            </div>
          </div>

          {/* Primary Vulnerability Risk Factor */}
          <div style={{
            padding: '0.8rem 0.9rem',
            backgroundColor: 'var(--surface-muted)',
            borderRadius: 'var(--radius-sm)',
            borderLeft: '4px solid var(--accent)',
            fontSize: '0.78rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.45
          }}>
            <strong style={{ color: 'var(--text-primary)' }}>Primary Risk Factor:</strong>
            <div style={{ marginTop: '0.15rem' }}>"{activeSegment.primaryRiskFactor}"</div>
          </div>

          {/* Top Offense Types */}
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Associated Offenses ({activeSegment.topOffenses.length}):
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.35rem' }}>
              {activeSegment.topOffenses.map((offense, idx) => (
                <div key={idx} style={{
                  padding: '0.4rem 0.65rem',
                  backgroundColor: 'var(--surface-muted)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.74rem',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}>
                  <ChevronRight size={13} color="var(--accent)" />
                  <span>{offense}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recommended Strategy */}
          <div style={{
            padding: '0.8rem 0.9rem',
            backgroundColor: 'var(--surface-muted)',
            borderRadius: 'var(--radius-sm)',
            borderLeft: '4px solid var(--success)',
            fontSize: '0.76rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.4
          }}>
            <strong style={{ color: 'var(--success)' }}>🛡️ Recommended Police Strategy:</strong>
            <div style={{ marginTop: '0.15rem' }}>{activeSegment.recommendedStrategy}</div>
          </div>

        </div>

      </div>
    </div>
  );
};
