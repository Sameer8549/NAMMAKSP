import React, { useState } from 'react';
import { useRole } from '../../context/RoleContext';
import type { AppRole } from '../../types/role';
import { ROLE_CONFIGS } from '../../types/role';
import {
  ShieldAlert,
  Search,
  MapPin,
  Users,
  Building2,
  ArrowRight,
  RotateCw,
  CheckCircle2,
  X
} from 'lucide-react';

export const RoleFlipScreen: React.FC = () => {
  const { setRole, setShowRoleFlip, activeRole } = useRole();
  const [flippedRoles, setFlippedRoles] = useState<Record<string, boolean>>({});

  const toggleFlip = (roleKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFlippedRoles(prev => ({ ...prev, [roleKey]: !prev[roleKey] }));
  };

  const handleSelectRole = (roleKey: AppRole) => {
    setRole(roleKey);
    setShowRoleFlip(false);
  };

  const getRoleIcon = (roleKey: AppRole) => {
    switch (roleKey) {
      case 'ADMIN': return <ShieldAlert size={28} color="var(--critical)" />;
      case 'INVESTIGATOR': return <Search size={28} color="var(--info)" />;
      case 'ANALYST': return <MapPin size={28} color="var(--accent)" />;
      case 'SUPERVISOR': return <Users size={28} color="var(--warning)" />;
      case 'POLICYMAKER': return <Building2 size={28} color="var(--success)" />;
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 200,
      backgroundColor: 'rgba(10, 14, 21, 0.94)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      overflowY: 'auto'
    }}>
      <div style={{ textAlign: 'center', maxWidth: '840px', marginBottom: '2rem', position: 'relative', width: '100%' }}>
        <button
          onClick={() => setShowRoleFlip(false)}
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            padding: '0.5rem',
            borderRadius: '50%',
            backgroundColor: 'var(--surface-elevated)',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)'
          }}
          title="Close Selector"
        >
          <X size={20} />
        </button>

        <span className="badge badge-warning" style={{ marginBottom: '0.75rem' }}>
          ONE DATABASE • ONE ENGINE • FIVE INTELLIGENCE VIEWS
        </span>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Namma KSP — Role-Adaptive Platform
        </h1>
        <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          Select your operational role to access a customized intelligence hierarchy, analytical tools, and system workspace.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '1.25rem',
        maxWidth: '1380px',
        width: '100%'
      }}>
        {(Object.keys(ROLE_CONFIGS) as AppRole[]).map((roleKey) => {
          const cfg = ROLE_CONFIGS[roleKey];
          const isFlipped = !!flippedRoles[roleKey];
          const isSelected = activeRole === roleKey;

          return (
            <div
              key={roleKey}
              className="flip-card-container"
              style={{ height: '420px', cursor: 'pointer' }}
              onClick={() => handleSelectRole(roleKey)}
            >
              <div className={`flip-card-inner ${isFlipped ? 'is-flipped' : ''}`}>

                <div
                  className="flip-card-front"
                  style={{
                    backgroundColor: 'var(--surface-elevated)',
                    border: isSelected ? `2px solid ${cfg.badgeColor}` : '1px solid var(--border)',
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: 'var(--shadow-md)',
                    position: 'relative'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        color: cfg.badgeColor,
                        letterSpacing: '0.08em'
                      }}>
                        {cfg.identity}
                      </span>
                      <button
                        onClick={(e) => toggleFlip(roleKey, e)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          fontSize: '0.72rem',
                          color: 'var(--text-muted)',
                          padding: '0.2rem 0.5rem',
                          backgroundColor: 'var(--surface-muted)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border)'
                        }}
                      >
                        <RotateCw size={12} />
                        Flip Info
                      </button>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--surface-muted)',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '0.75rem'
                      }}>
                        {getRoleIcon(roleKey)}
                      </div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {cfg.title}
                      </h3>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                        {cfg.subtitle}
                      </p>
                    </div>

                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                      {cfg.mission}
                    </p>
                  </div>

                  <div>
                    <div style={{
                      padding: '0.6rem 0.75rem',
                      backgroundColor: 'var(--surface-muted)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.74rem',
                      color: 'var(--text-secondary)',
                      marginBottom: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}>
                      <span style={{ fontSize: '0.9rem', color: 'var(--accent)', fontWeight: 900 }}>•</span>
                      <span><strong>Assistant Mode:</strong> {cfg.aiPersona}</span>
                    </div>

                    <button
                      style={{
                        width: '100%',
                        padding: '0.65rem',
                        backgroundColor: isSelected ? cfg.badgeColor : 'var(--accent)',
                        color: 'var(--text-inverse)',
                        borderRadius: 'var(--radius-md)',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <span>{isSelected ? 'Active View' : 'Launch View'}</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>

                <div
                  className="flip-card-back"
                  style={{
                    backgroundColor: 'var(--surface-card)',
                    border: '1px solid var(--border-accent)',
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: 'var(--shadow-md)'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent)' }}>
                        CAPABILITIES & SPECS
                      </span>
                      <button
                        onClick={(e) => toggleFlip(roleKey, e)}
                        style={{
                          fontSize: '0.72rem',
                          color: 'var(--text-muted)',
                          padding: '0.2rem 0.5rem',
                          backgroundColor: 'var(--surface-muted)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border)'
                        }}
                      >
                        Flip Front
                      </button>
                    </div>

                    <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                      {cfg.backSideSummary.primaryFocus}
                    </h4>

                    <div style={{ marginBottom: '0.75rem' }}>
                      <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        Visible Dashboard Data
                      </p>
                      <ul style={{ listStyle: 'none', marginTop: '0.3rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {cfg.backSideSummary.visibleInformation.slice(0, 3).map((item, idx) => (
                          <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                            <CheckCircle2 size={12} color="var(--success)" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div style={{ marginBottom: '0.75rem' }}>
                      <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        System Capabilities
                      </p>
                      <ul style={{ listStyle: 'none', marginTop: '0.3rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {cfg.backSideSummary.aiCapabilities.slice(0, 2).map((item, idx) => (
                          <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 900 }}>•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div>
                    <p style={{ fontSize: '0.72rem', fontStyle: 'italic', color: 'var(--text-muted)', marginBottom: '0.75rem', lineHeight: 1.3 }}>
                      "{cfg.primaryQuestion}"
                    </p>
                    <button
                      onClick={() => handleSelectRole(roleKey)}
                      style={{
                        width: '100%',
                        padding: '0.66rem',
                        backgroundColor: 'var(--surface-hover)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        fontWeight: 600,
                        fontSize: '0.82rem'
                      }}
                    >
                      Select {cfg.title}
                    </button>
                  </div>
                </div>

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
