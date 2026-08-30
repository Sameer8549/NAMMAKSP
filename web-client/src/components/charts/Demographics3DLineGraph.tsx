import React, { useState, useMemo, useRef } from 'react';
import {
  Users,
  Box,
  RotateCcw,
  Activity,
  ChevronRight
} from 'lucide-react';

export interface Demographic3DPoint {
  ageGroup: string;
  accusedPercentage: number;
  victimPercentage: number;
  primaryRiskFactor: string;
  topOffenses: string[];
  recommendedStrategy: string;
}

const EXTENDED_DEMOGRAPHIC_DATA: Demographic3DPoint[] = [
  {
    ageGroup: '18 - 25 yrs',
    accusedPercentage: 42.6,
    victimPercentage: 18.2,
    primaryRiskFactor: 'Telegram Money Mule Recruitment & Fast-Money APK Distribution',
    topOffenses: ['KEB Bill APK Phishing', 'SIM Card Forgery', 'High-Speed Bike Chain Snatching'],
    recommendedStrategy: 'Campus Cyber Awareness drives & Telegram Mule Account Interception.'
  },
  {
    ageGroup: '26 - 35 yrs',
    accusedPercentage: 34.1,
    victimPercentage: 24.5,
    primaryRiskFactor: 'Commercial Site Extortion & Hawala Wire Laundering',
    topOffenses: ['Gokul Road Extortion Threats', 'Gold Showroom Safe Cutting', 'USDT Crypto Transfers'],
    recommendedStrategy: 'Industrial zone armed PCR patrols & Builders Association sting ops.'
  },
  {
    ageGroup: '36 - 50 yrs',
    accusedPercentage: 16.4,
    victimPercentage: 32.8,
    primaryRiskFactor: 'Middle-Management Savings Fraud & Utility Bill APK Scams',
    topOffenses: ['Fake Electricity Bill Drops', 'Property Title Extortion', 'Fake Investment Schemes'],
    recommendedStrategy: 'Public advisories 5 days prior to utility bill due dates.'
  },
  {
    ageGroup: '51 - 65 yrs',
    accusedPercentage: 5.5,
    victimPercentage: 16.4,
    primaryRiskFactor: 'Retirement Savings Extraction & Pension Bank Hijacking',
    topOffenses: ['Pension Account OTP Interception', 'Senior Citizen Home Intrusion'],
    recommendedStrategy: 'Bank branch OTP push verification alerts & senior citizen beat visits.'
  },
  {
    ageGroup: '65+ yrs',
    accusedPercentage: 1.4,
    victimPercentage: 8.1,
    primaryRiskFactor: 'Vulnerable Isolated Living & Impersonation Scams',
    topOffenses: ['Police Impersonation Cash Demands', 'Daylight Doorstep Theft'],
    recommendedStrategy: 'Station Elderly Care Officer registry & emergency panic button installation.'
  }
];

export const Demographics3DLineGraph: React.FC = () => {
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>('18 - 25 yrs');
  const [is3DMode, setIs3DMode] = useState<boolean>(true);
  const [rotX, setRotX] = useState<number>(28); // 3D Pitch
  const [rotY, setRotY] = useState<number>(-14); // 3D Yaw
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [crimeFilter, setCrimeFilter] = useState<string>('ALL');

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Mouse Drag Handlers for 3D Orbit Perspective Rotation
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    setRotY(prev => Math.max(-45, Math.min(45, prev + deltaX * 0.25)));
    setRotX(prev => Math.max(5, Math.min(60, prev - deltaY * 0.25)));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetPerspective = () => {
    setRotX(28);
    setRotY(-14);
    setIs3DMode(true);
  };

  // Selected Item details
  const activeDemographic = useMemo(() => {
    return EXTENDED_DEMOGRAPHIC_DATA.find(d => d.ageGroup === selectedAgeGroup) || EXTENDED_DEMOGRAPHIC_DATA[0];
  }, [selectedAgeGroup]);

  // Compute SVG Line Paths for Accused and Victims
  const graphPoints = useMemo(() => {
    const width = 640;
    const height = 240;
    const paddingX = 70;
    const paddingY = 40;

    const usableWidth = width - paddingX * 2;
    const usableHeight = height - paddingY * 2;

    const data = EXTENDED_DEMOGRAPHIC_DATA;

    const accusedPoints = data.map((d, idx) => {
      const x = paddingX + (idx / (data.length - 1)) * usableWidth;
      const y = height - paddingY - (d.accusedPercentage / 50) * usableHeight;
      return { x, y, ageGroup: d.ageGroup, val: d.accusedPercentage };
    });

    const victimPoints = data.map((d, idx) => {
      const x = paddingX + (idx / (data.length - 1)) * usableWidth;
      const y = height - paddingY - (d.victimPercentage / 50) * usableHeight;
      return { x, y, ageGroup: d.ageGroup, val: d.victimPercentage };
    });

    // Generate smooth SVG Cubic Bezier path string
    const createBezierPath = (pts: { x: number; y: number }[]) => {
      if (pts.length === 0) return '';
      let path = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const curr = pts[i];
        const next = pts[i + 1];
        const cp1x = curr.x + (next.x - curr.x) / 2;
        const cp1y = curr.y;
        const cp2x = curr.x + (next.x - curr.x) / 2;
        const cp2y = next.y;
        path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
      }
      return path;
    };

    const accusedPath = createBezierPath(accusedPoints);
    const victimPath = createBezierPath(victimPoints);

    const accusedAreaPath = `${accusedPath} L ${accusedPoints[accusedPoints.length - 1].x} ${height - paddingY} L ${accusedPoints[0].x} ${height - paddingY} Z`;
    const victimAreaPath = `${victimPath} L ${victimPoints[victimPoints.length - 1].x} ${height - paddingY} L ${victimPoints[0].x} ${height - paddingY} Z`;

    return { accusedPoints, victimPoints, accusedPath, victimPath, accusedAreaPath, victimAreaPath };
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
            <Users size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              3D Interactive Demographic Distribution Line Stream
            </h3>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              Drag mouse to rotate 3D graph plane. Compare Accused Recidivism Curves vs Victim Vulnerability Streams.
            </p>
          </div>
        </div>

        {/* 3D Mode & Mouse Tilt Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setIs3DMode(!is3DMode)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.76rem',
              fontWeight: 800,
              cursor: 'pointer',
              border: is3DMode ? '1.5px solid var(--accent)' : '1px solid var(--border)',
              backgroundColor: is3DMode ? 'var(--accent)' : 'var(--surface-muted)',
              color: is3DMode ? '#000000' : 'var(--text-secondary)'
            }}
          >
            <Box size={15} />
            <span>{is3DMode ? '3D PERSPECTIVE ON' : '2D FLAT VIEW'}</span>
          </button>

          <button
            onClick={resetPerspective}
            title="Reset Mouse Drag Rotation"
            style={{
              padding: '0.45rem 0.65rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface-muted)',
              color: 'var(--text-primary)',
              cursor: 'pointer'
            }}
          >
            <RotateCcw size={15} />
          </button>

          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)' }}>
            🖐️ Drag Mouse on Canvas to Rotate 3D Tilt
          </span>
        </div>
      </div>

      {/* Legend & Category Filter Bar */}
      <div style={{
        backgroundColor: 'var(--surface-muted)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '0.65rem 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        {/* Color Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--critical)', boxShadow: '0 0 8px rgba(239, 68, 68, 0.5)' }} />
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              🔴 Accused Persons Stream Curve
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--accent)', boxShadow: '0 0 8px rgba(217, 119, 6, 0.5)' }} />
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              🟡 Impacted Victim Group Curve
            </span>
          </div>
        </div>

        {/* Offense Category Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>Filter Offenses:</span>
          {['ALL', 'Cybercrime', 'Property Burglary', 'Extortion', 'Narcotics'].map(cat => (
            <button
              key={cat}
              onClick={() => setCrimeFilter(cat)}
              style={{
                fontSize: '0.68rem',
                fontWeight: 800,
                padding: '0.25rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                backgroundColor: crimeFilter === cat ? 'var(--accent)' : 'var(--surface-card)',
                color: crimeFilter === cat ? '#000000' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split View: Left 3D Perspective Line Canvas | Right Age Demographic Inspector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 1.4fr) minmax(320px, 1fr)', gap: '1.25rem' }}>
        
        {/* LEFT: INTERACTIVE 3D PERSPECTIVE SVG LINE CANVAS */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            backgroundColor: 'var(--surface-elevated)',
            border: '1px solid var(--border-accent)',
            borderRadius: 'var(--radius-md)',
            position: 'relative',
            height: '320px',
            overflow: 'hidden',
            perspective: '1000px',
            cursor: isDragging ? 'grabbing' : 'grab',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          {/* Active Hover Guide Tag */}
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
            <Activity size={14} color="var(--accent)" />
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Active Focus: <span style={{ color: 'var(--accent)' }}>{selectedAgeGroup}</span>
            </span>
          </div>

          {/* 3D Hardware-Accelerated Perspective Transform Canvas */}
          <div style={{
            width: '100%',
            height: '100%',
            transform: is3DMode ? `rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(0.96, 0.96, 0.96)` : 'none',
            transformStyle: 'preserve-3d',
            transition: isDragging ? 'none' : 'transform 400ms cubic-bezier(0.4, 0, 0.2, 1)',
            willChange: 'transform'
          }}>
            <svg viewBox="0 0 640 240" style={{ width: '100%', height: '100%' }}>
              <defs>
                {/* Linear Gradients for Line Area Fills */}
                <linearGradient id="accusedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
                </linearGradient>

                <linearGradient id="victimGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#d97706" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#d97706" stopOpacity="0.0" />
                </linearGradient>

                <pattern id="grid3DPattern" width="40" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 20" fill="none" stroke="var(--border)" strokeWidth="0.4" opacity="0.3" />
                </pattern>

                <style>{`
                  @keyframes dashMoveStream {
                    to { stroke-dashoffset: -30; }
                  }
                  .flowing-line-dash {
                    animation: dashMoveStream 1.4s linear infinite;
                  }
                `}</style>
              </defs>

              <rect width="100%" height="100%" fill="url(#grid3DPattern)" />

              {/* Horizontal Reference Lines (10%, 20%, 30%, 40%) */}
              {[40, 80, 120, 160, 200].map((yVal, i) => (
                <g key={i}>
                  <line x1="50" y1={yVal} x2="590" y2={yVal} stroke="var(--border-subtle)" strokeWidth="0.6" strokeDasharray="3 3" opacity="0.4" />
                  <text x="35" y={yVal + 4} fill="var(--text-muted)" fontSize="9" fontWeight="700">
                    {50 - i * 10}%
                  </text>
                </g>
              ))}

              {/* Area Fills under curves */}
              <path d={graphPoints.accusedAreaPath} fill="url(#accusedGrad)" />
              <path d={graphPoints.victimAreaPath} fill="url(#victimGrad)" />

              {/* ACCUSED LINE CURVE (🔴 RED) */}
              <path
                d={graphPoints.accusedPath}
                fill="none"
                stroke="var(--critical)"
                strokeWidth="3.5"
                style={{ filter: 'drop-shadow(0 4px 8px rgba(239, 68, 68, 0.4))' }}
              />

              {/* Moving Pulse Flow Line over Accused Path */}
              <path
                d={graphPoints.accusedPath}
                fill="none"
                stroke="#ffffff"
                strokeWidth="2.5"
                strokeDasharray="6 12"
                className="flowing-line-dash"
                opacity="0.8"
              />

              {/* VICTIM LINE CURVE (🟡 GOLD) */}
              <path
                d={graphPoints.victimPath}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="3.5"
                style={{ filter: 'drop-shadow(0 4px 8px rgba(217, 119, 6, 0.4))' }}
              />

              {/* Moving Pulse Flow Line over Victim Path */}
              <path
                d={graphPoints.victimPath}
                fill="none"
                stroke="#ffffff"
                strokeWidth="2"
                strokeDasharray="4 10"
                className="flowing-line-dash"
                opacity="0.75"
              />

              {/* INTERACTIVE DATA POINTS & LABELS */}
              {graphPoints.accusedPoints.map((pt, idx) => {
                const isSelected = selectedAgeGroup === pt.ageGroup;
                const vPt = graphPoints.victimPoints[idx];

                return (
                  <g key={idx} onClick={() => setSelectedAgeGroup(pt.ageGroup)} style={{ cursor: 'pointer' }}>
                    {/* Vertical Connecting Line between Accused & Victim Points */}
                    <line
                      x1={pt.x}
                      y1={pt.y}
                      x2={vPt.x}
                      y2={vPt.y}
                      stroke={isSelected ? 'var(--accent)' : 'var(--border)'}
                      strokeWidth={isSelected ? '2' : '1'}
                      strokeDasharray="2 2"
                      opacity={isSelected ? 1 : 0.5}
                    />

                    {/* Accused Dot (Red) */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isSelected ? '7' : '5'}
                      fill="var(--surface-card)"
                      stroke="var(--critical)"
                      strokeWidth={isSelected ? '3.5' : '2'}
                    />
                    <text x={pt.x} y={pt.y - 12} textAnchor="middle" fill="var(--critical)" fontSize="10" fontWeight="900">
                      {pt.val}%
                    </text>

                    {/* Victim Dot (Gold) */}
                    <circle
                      cx={vPt.x}
                      cy={vPt.y}
                      r={isSelected ? '7' : '5'}
                      fill="var(--surface-card)"
                      stroke="var(--accent)"
                      strokeWidth={isSelected ? '3.5' : '2'}
                    />
                    <text x={vPt.x} y={vPt.y + 16} textAnchor="middle" fill="var(--accent)" fontSize="10" fontWeight="900">
                      {vPt.val}%
                    </text>

                    {/* X-Axis Age Group Labels */}
                    <text x={pt.x} y="222" textAnchor="middle" fill={isSelected ? 'var(--accent)' : 'var(--text-primary)'} fontSize="10" fontWeight={isSelected ? '900' : '700'}>
                      {pt.ageGroup}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* RIGHT: SELECTED AGE DEMOGRAPHIC DEEP INSPECTOR CARD */}
        <div style={{
          backgroundColor: 'var(--surface-elevated)',
          border: '1px solid var(--border-accent)',
          borderRadius: 'var(--radius-md)',
          padding: '1.15rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.9rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <span className="badge badge-accent" style={{ fontSize: '0.68rem' }}>
                SELECTED AGE DEMOGRAPHIC
              </span>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent)' }}>
                AGE GROUP: {activeDemographic.ageGroup}
              </span>
            </div>

            <h4 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-primary)' }}>
              Demographic Profile: {activeDemographic.ageGroup}
            </h4>
          </div>

          {/* Accused vs Victim Metrics Split */}
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
                {activeDemographic.accusedPercentage}%
              </strong>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Offender Group Ratio</span>
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
                {activeDemographic.victimPercentage}%
              </strong>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Defrauded / Target Ratio</span>
            </div>
          </div>

          {/* Primary Vulnerability Risk Factor */}
          <div style={{
            padding: '0.75rem 0.85rem',
            backgroundColor: 'var(--surface-muted)',
            borderRadius: 'var(--radius-sm)',
            borderLeft: '3px solid var(--accent)',
            fontSize: '0.78rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.45
          }}>
            <strong style={{ color: 'var(--text-primary)' }}>Primary Risk Factor:</strong>
            <div style={{ marginTop: '0.15rem' }}>"{activeDemographic.primaryRiskFactor}"</div>
          </div>

          {/* Top Offense Types */}
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Associated Offenses ({activeDemographic.topOffenses.length}):
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.35rem' }}>
              {activeDemographic.topOffenses.map((offense, idx) => (
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

          {/* Police Action Plan */}
          <div style={{
            padding: '0.75rem 0.85rem',
            backgroundColor: 'var(--surface-muted)',
            borderRadius: 'var(--radius-sm)',
            borderLeft: '3px solid var(--success)',
            fontSize: '0.76rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.4
          }}>
            <strong style={{ color: 'var(--success)' }}>🛡️ Police Mitigation Action:</strong>
            <div style={{ marginTop: '0.15rem' }}>{activeDemographic.recommendedStrategy}</div>
          </div>
        </div>

      </div>
    </div>
  );
};
