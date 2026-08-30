import React, { useState, useEffect } from 'react';
import { useRole } from '../../context/RoleContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { LanguageToggle } from './LanguageToggle';
import kspEmblemImg from '../../assets/ksp.jpg';
import { Sun, Moon, LogOut, Clock } from 'lucide-react';
import { dataService } from '../../services/mockDataService';

interface HeaderProps {
  onSignOut?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onSignOut }) => {
  const { activeRole, roleConfig } = useRole();
  const { theme, toggleTheme } = useTheme();
  const { language, translations } = useLanguage();
  const [currentTime, setCurrentTime] = useState<string>('');
  const identity = dataService.getWorkspace()?.identity;

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString(language === 'kn' ? 'kn-IN' : 'en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      const dateStr = now.toLocaleDateString(language === 'kn' ? 'kn-IN' : 'en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
      setCurrentTime(`${dateStr} • ${timeStr}`);
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [language]);

  return (
    <>
      <header className="app-header" style={{
        height: '56px',
        backgroundColor: 'var(--surface-elevated)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.25rem',
        position: 'sticky',
        top: 0,
        zIndex: 40
      }}>
        {/* 1. Web Name & KSP Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            padding: '2px',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}>
            <img src={kspEmblemImg} alt="KSP Emblem" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              {translations.nammaKsp.split(' ')[0]} <span style={{ color: 'var(--accent)' }}>{translations.nammaKsp.split(' ')[1] || 'KSP'}</span>
            </span>
          </div>
        </div>

        {/* Right Controls: Real-time Live Clock, Download Report, User Info, Language Toggle, Theme Toggle & Logout */}
        <div className="app-header-controls" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>

          {/* Real-time Live Clock Badge */}
          <div className="app-header-clock" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.35rem 0.75rem',
            backgroundColor: 'var(--surface-muted)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.78rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            letterSpacing: '0.02em'
          }}>
            <Clock size={14} color="var(--accent)" />
            <span>{currentTime}</span>
          </div>

          {/* 3. User's Information */}
          <div className="app-header-identity" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.3rem 0.65rem',
            backgroundColor: 'var(--surface-muted)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)'
          }}>
            <div style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent)',
              color: '#000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.72rem',
              fontWeight: 800
            }}>
              {activeRole.slice(0, 2)}
            </div>
            <div style={{ lineHeight: 1.1 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {identity?.username || `${translations.officer} ${translations.roles[activeRole]?.identity || roleConfig.identity}`}
              </div>
              <div style={{ fontSize: '0.66rem', color: 'var(--accent)', fontWeight: 600 }}>
                {identity?.role || roleConfig.title}
              </div>
            </div>
          </div>

          {/* 4. Multi-Language Switcher */}
          <LanguageToggle variant="pill" />

          {/* 5. Light / Dark Theme Toggle */}
          <button
            onClick={toggleTheme}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--surface-muted)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)',
              cursor: 'pointer'
            }}
            title={theme === 'dark' ? translations.switchToLight : translations.switchToDark}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* 6. Logout / Sign Out Button */}
          {onSignOut && (
            <button
              className="app-header-logout"
              onClick={onSignOut}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.35rem 0.65rem',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--critical)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
              title="Sign out to Login Screen"
            >
              <LogOut size={13} />
              <span>{translations.logout}</span>
            </button>
          )}

        </div>
      </header>

    </>
  );
};
