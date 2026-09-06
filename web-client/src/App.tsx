import React, { useEffect, useState } from 'react';
import { LanguageProvider } from './context/LanguageContext';
import { RoleProvider, useRole } from './context/RoleContext';
import { SimulationProvider } from './context/SimulationContext';
import { ThemeProvider } from './context/ThemeContext';

import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { AnalyticsLoading } from './components/common/AnalyticsLoading';
import { LoginPage } from './components/auth/LoginPage';
import { AuthLoadingOverlay } from './components/auth/AuthLoadingOverlay';
import type { AuthTransitionStage } from './components/auth/AuthLoadingOverlay';

import { AIChatDrawer } from './components/ai/AIChatDrawer';
import { AIExplainModal } from './components/ai/AIExplainModal';

import { AdminDashboard } from './components/dashboards/AdminDashboard';
import { InvestigatorDashboard } from './components/dashboards/InvestigatorDashboard';
import { AnalystDashboard } from './components/dashboards/AnalystDashboard';
import { SupervisorDashboard } from './components/dashboards/SupervisorDashboard';
import { PolicymakerDashboard } from './components/dashboards/PolicymakerDashboard';

import { Menu, X } from './components/common/icons';
import './styles/global.css';
import { apiClient, SESSION_IDLE_MS, toAppRole } from './services/apiClient';
import { dataService } from './services/mockDataService';

const DashboardViewManager: React.FC<{
  isChatOpen: boolean;
  onOpenExplainModal: () => void;
  onOpenChatDrawer: (prompt?: string) => void;
}> = ({ isChatOpen, onOpenExplainModal, onOpenChatDrawer }) => {
  const { activeRole } = useRole();

  switch (activeRole) {
    case 'ADMIN':
      return <AdminDashboard isChatOpen={isChatOpen} onOpenExplainModal={onOpenExplainModal} onOpenChatDrawer={onOpenChatDrawer} />;
    case 'INVESTIGATOR':
      return <InvestigatorDashboard onOpenExplainModal={onOpenExplainModal} onOpenChatDrawer={onOpenChatDrawer} />;
    case 'ANALYST':
      return <AnalystDashboard onOpenExplainModal={onOpenExplainModal} onOpenChatDrawer={onOpenChatDrawer} />;
    case 'SUPERVISOR':
      return <SupervisorDashboard onOpenExplainModal={onOpenExplainModal} onOpenChatDrawer={onOpenChatDrawer} />;
    case 'POLICYMAKER':
      return <PolicymakerDashboard onOpenExplainModal={onOpenExplainModal} onOpenChatDrawer={onOpenChatDrawer} />;
    default:
      return <AnalystDashboard onOpenExplainModal={onOpenExplainModal} onOpenChatDrawer={onOpenChatDrawer} />;
  }
};

const MainLayout: React.FC = () => {
  const { setRole } = useRole();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRestoring, setIsRestoring] = useState(apiClient.hasSession());
  const [authStage, setAuthStage] = useState<AuthTransitionStage>(apiClient.hasSession() ? 'preparing' : 'idle');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [assistantPrompt, setAssistantPrompt] = useState('');
  const [isExplainOpen, setIsExplainOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!apiClient.hasSession()) return;
    let active = true;
    apiClient.restore()
      .then(async session => {
        if (!active) return;
        await dataService.hydrate();
        if (!active) return;
        setRole(toAppRole(session.role));
        setIsAuthenticated(true);
      })
      .catch(() => { if (active) dataService.clear(); })
      .finally(() => {
        if (!active) return;
        setAuthStage('revealing');
        window.setTimeout(() => { if (active) setIsRestoring(false); }, 450);
      });
    return () => { active = false; };
  }, [setRole]);

  useEffect(() => {
    const expireSession = () => {
      dataService.clear();
      setIsAuthenticated(false);
      setIsRestoring(false);
      setIsChatOpen(false);
      setAssistantPrompt('');
      setIsExplainOpen(false);
      setAuthStage('idle');
    };
    window.addEventListener('namma-session-expired', expireSession);
    return () => window.removeEventListener('namma-session-expired', expireSession);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let lastRecorded = 0;
    const recordActivity = () => {
      const now = Date.now();
      if (now - lastRecorded < 30_000) return;
      lastRecorded = now;
      apiClient.markActivity();
    };
    const events: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(event => window.addEventListener(event, recordActivity, { passive: true }));
    const expiryCheck = window.setInterval(() => {
      if (apiClient.isIdleExpired()) {
        apiClient.clearSession();
        window.dispatchEvent(new Event('namma-session-expired'));
      }
    }, Math.min(60_000, SESSION_IDLE_MS));
    return () => {
      events.forEach(event => window.removeEventListener(event, recordActivity));
      window.clearInterval(expiryCheck);
    };
  }, [isAuthenticated]);

  const signOut = async () => {
    setIsAuthenticated(false);
    setAssistantPrompt('');
    try {
      await apiClient.logout();
    } finally {
      dataService.clear();
    }
  };

  const completeLogin = () => {
    setAuthStage('preparing');
    setIsAuthenticated(true);
    window.setTimeout(() => setAuthStage('revealing'), 800);
  };

  if (isRestoring) {
    return <div style={{ minHeight: '100vh', display: 'grid', placeContent: 'center', background: 'var(--surface)', color: 'var(--text-primary)' }}><AnalyticsLoading label="Restoring your workspace..." /><AuthLoadingOverlay stage={authStage} onExited={() => setAuthStage('idle')} /></div>;
  }

  if (!isAuthenticated) {
    return <><LoginPage onLoginSuccess={completeLogin} authStage={authStage} onAuthStageChange={setAuthStage} /><AuthLoadingOverlay stage={authStage} onExited={() => setAuthStage('idle')} /></>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden', position: 'relative' }}>
      <AuthLoadingOverlay stage={authStage} onExited={() => setAuthStage('idle')} />
      
      {/* Top Header */}
      <Header onSignOut={signOut} />

      {/* Body Content */}
      <div className="app-body" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div className={`mobile-sidebar-shell ${isMobileNavOpen ? 'is-open' : ''}`}>
          <Sidebar onOpenChatDrawer={(prompt?: string) => { setAssistantPrompt(prompt || ''); setIsChatOpen(true); }} onNavigate={() => setIsMobileNavOpen(false)} />
        </div>
        {isMobileNavOpen && <button className="mobile-sidebar-backdrop" aria-label="Close navigation" onClick={() => setIsMobileNavOpen(false)} />}

        <main className="app-main" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', backgroundColor: 'var(--surface)' }}>
          <DashboardViewManager
            isChatOpen={isChatOpen}
            onOpenExplainModal={() => setIsExplainOpen(true)}
            onOpenChatDrawer={(prompt?: string) => { setAssistantPrompt(prompt || ''); setIsChatOpen(true); }}
          />
        </main>
      </div>

      <button className={`mobile-nav-toggle${isMobileNavOpen ? ' is-open' : ''}`} aria-label={isMobileNavOpen ? 'Close navigation' : 'Open navigation'} onClick={() => setIsMobileNavOpen(value => !value)}>{isMobileNavOpen ? <X size={20}/> : <Menu size={20}/>}</button>

      {/* AI Persona Drawer */}
      <AIChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        initialPrompt={assistantPrompt}
        onPromptConsumed={() => setAssistantPrompt('')}
      />

      {/* AI Reasoning & Evidence Modal */}
      <AIExplainModal
        isOpen={isExplainOpen}
        onClose={() => setIsExplainOpen(false)}
      />

    </div>
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <RoleProvider>
          <SimulationProvider>
            <MainLayout />
          </SimulationProvider>
        </RoleProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
