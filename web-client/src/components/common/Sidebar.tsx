import React, { useState } from 'react';
import { useRole } from '../../context/RoleContext';
import { useLanguage } from '../../context/LanguageContext';
import { dataService } from '../../services/mockDataService';
import {
  MapPin,
  Users,
  Building2,
  FileText,
  Activity,
  Cpu,
  BarChart3,
  Sparkles,
  Lock,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  PanelLeftClose,
  PanelLeftOpen,
  FolderOpen,
  Search,
  Share2,
  GitCompare,
  Target,
  Clock
} from 'lucide-react';

interface SidebarProps {
  onOpenChatDrawer?: () => void;
  onNavigate?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenChatDrawer, onNavigate }) => {
  const { roleConfig, activeRole, activeView, setActiveView } = useRole();
  const assistantPrompt = dataService.getSuggestedPromptsForRole(activeRole)[0];
  const { translations } = useLanguage();

  // Horizontal Collapse State: Toggles entire sidebar width between 250px and 64px
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const getIcon = (viewName: string) => {
    const name = viewName.toLowerCase();
    if (name.includes('my cases') || name.includes('assigned cases')) return <FolderOpen size={18} />;
    if (name.includes('fir') || name.includes('report')) return <Search size={18} />;
    if (name.includes('suspect') || name.includes('network') || name.includes('accused')) return <Share2 size={18} />;
    if (name.includes('similar') || name.includes('method') || name.includes('pattern') || name.includes('mo')) return <GitCompare size={18} />;
    if (name.includes('lead') || name.includes('evidence')) return <Target size={18} />;
    if (name.includes('timeline') || name.includes('time') || name.includes('aging')) return <Clock size={18} />;
    if (name.includes('overview') || name.includes('chart') || name.includes('matrix')) return <BarChart3 size={18} />;
    if (name.includes('user')) return <Users size={18} />;
    if (name.includes('security') || name.includes('audit')) return <Lock size={18} />;
    if (name.includes('health') || name.includes('activity')) return <Activity size={18} />;
    if (name.includes('ai') || name.includes('cpu')) return <Cpu size={18} />;
    if (name.includes('map') || name.includes('district') || name.includes('hotspot')) return <MapPin size={18} />;
    if (name.includes('station') || name.includes('state')) return <Building2 size={18} />;
    return <FileText size={18} />;
  };

  const translatedRole = translations.roles[activeRole] || {
    title: roleConfig.title,
    subtitle: roleConfig.subtitle,
    identity: roleConfig.identity
  };

  return (
    <aside className="app-sidebar" style={{
      width: isCollapsed ? '64px' : '250px',
      backgroundColor: 'var(--surface-elevated)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: isCollapsed ? '0.85rem 0.4rem' : '0.85rem',
      flexShrink: 0,
      gap: '0.85rem',
      transition: 'background-color 180ms ease-out, border-color 180ms ease-out',
      overflow: 'hidden'
    }}>
      <div className="sidebar-primary" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        
        {/* HORIZONTAL TOGGLE CONTROL BUTTON AT THE VERY TOP */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="admin-btn-primary"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'space-between',
            padding: isCollapsed ? '0.5rem' : '0.45rem 0.75rem',
            backgroundColor: isCollapsed ? 'var(--accent)' : 'var(--surface-muted)',
            color: isCollapsed ? '#000000' : 'var(--accent)',
            border: '1.5px solid var(--accent)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.74rem',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: 'var(--shadow-xs)',
            transition: 'all 200ms ease'
          }}
          title={isCollapsed ? translations.showSidebar : translations.hideSidebar}
        >
          {isCollapsed ? (
            <PanelLeftOpen size={18} color="#000000" />
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <PanelLeftClose size={15} />
                <span>{translations.hideSidebar}</span>
              </div>
              <ChevronLeft size={14} />
            </>
          )}
        </button>

        {!isCollapsed ? (
          /* EXPANDED VIEW: FULL 3 COMPONENT CARDS */
          <>
            {/* COMPONENT 1: ROLE IDENTITY & COMMAND CENTER HEADER CARD */}
            <div style={{
              padding: '0.85rem 0.9rem',
              backgroundColor: 'var(--surface-card)',
              border: '1.5px solid var(--border-accent)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  color: roleConfig.badgeColor || 'var(--accent)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em'
                }}>
                  {translatedRole.identity}
                </span>
                <ShieldCheck size={14} color="var(--accent)" />
              </div>

              <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.25, margin: 0 }}>
                {translatedRole.title}
              </h3>

              <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.35rem', lineHeight: 1.35, margin: 0 }}>
                {translatedRole.subtitle}
              </p>
            </div>

            {/* COMPONENT 2: INTELLIGENCE NAVIGATION VIEWS CARD */}
            <div style={{
              padding: '0.85rem 0.65rem',
              backgroundColor: 'var(--surface-muted)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 0.4rem',
                marginBottom: '0.6rem'
              }}>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em'
                }}>
                  {translations.caseViews}
                </span>
                <span style={{ fontSize: '0.65rem', color: 'var(--accent)', fontWeight: 700 }}>
                  {roleConfig.visibleViews.length} {translations.views}
                </span>
              </div>

              <nav className="sidebar-role-nav" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {roleConfig.visibleViews.map(view => {
                  const isActive = activeView.toLowerCase() === view.toLowerCase();
                  const translatedViewName = translations.viewNames[view] || view;
                  return (
                    <button
                      key={view}
              onClick={() => { setActiveView(view); onNavigate?.(); }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.55rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: isActive ? 'var(--surface-hover)' : 'transparent',
                        color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                        borderLeft: isActive ? '3.5px solid var(--accent)' : '3.5px solid transparent',
                        fontWeight: isActive ? 700 : 500,
                        fontSize: '0.82rem',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'background-color 150ms ease-out, color 150ms ease-out, border-color 150ms ease-out'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        {getIcon(view)}
                        <span>{translatedViewName}</span>
                      </div>
                      {isActive && <ChevronRight size={14} color="var(--accent)" />}
                    </button>
                  );
                })}
              </nav>
            </div>
          </>
        ) : (
          /* COLLAPSED VIEW: SLIM ICON BAR */
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
            {roleConfig.visibleViews.map(view => {
              const isActive = activeView.toLowerCase() === view.toLowerCase();
              const translatedViewName = translations.viewNames[view] || view;
              return (
                <button
                  key={view}
                  onClick={() => setActiveView(view)}
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: 'var(--radius-md)',
                    display: 'grid',
                    placeItems: 'center',
                    backgroundColor: isActive ? 'rgba(217, 119, 6, 0.2)' : 'var(--surface-muted)',
                    border: `1.5px solid ${isActive ? 'var(--accent)' : 'var(--border-subtle)'}`,
                    color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 180ms ease'
                  }}
                  title={`Switch view to ${translatedViewName}`}
                >
                  {getIcon(view)}
                </button>
              );
            })}
          </nav>
        )}

      </div>

      {/* COMPONENT 3: CASE ASSISTANT FOOTER CARD */}
      {!isCollapsed ? (
        <div style={{
          padding: '0.85rem 0.9rem',
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <ShieldCheck size={16} color="var(--accent)" />
              <strong style={{ fontSize: '0.78rem', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {roleConfig.aiPersona}
              </strong>
            </div>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.62rem', color: 'var(--success)', fontWeight: 800 }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: 'var(--success)' }} />
              {translations.online}
            </span>
          </div>

          <div style={{
            padding: '0.45rem 0',
            marginBottom: '0.65rem'
          }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.35 }}>
              {assistantPrompt}
            </p>
          </div>

          <button
            onClick={onOpenChatDrawer}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.6rem',
              backgroundColor: 'var(--accent)',
              color: 'var(--text-inverse)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.74rem',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 180ms ease'
            }}
            title={translations.openKspAssistant}
          >
            <span>{isCollapsed ? '' : `Open ${roleConfig.aiPersona}`}</span>
            <ChevronRight size={13} />
          </button>
        </div>
      ) : (
        <button
          onClick={onOpenChatDrawer}
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            backgroundColor: 'var(--surface-card)',
            border: '2px solid var(--accent)',
            color: 'var(--accent)',
            display: 'grid',
            placeItems: 'center',
            alignSelf: 'center',
            cursor: 'pointer',
            boxShadow: '0 0 12px rgba(217, 119, 6, 0.3)'
          }}
          title={translations.openKspAssistant}
        >
          <Sparkles size={18} color="var(--accent)" />
        </button>
      )}
    </aside>
  );
};
