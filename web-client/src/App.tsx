import React, { useEffect, useState } from 'react';
import { LanguageProvider } from './context/LanguageContext';
import { RoleProvider, useRole } from './context/RoleContext';
import { SimulationProvider } from './context/SimulationContext';
import { ThemeProvider } from './context/ThemeContext';

import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { LoginPage } from './components/auth/LoginPage';

import { AIChatDrawer } from './components/ai/AIChatDrawer';
import { AIExplainModal } from './components/ai/AIExplainModal';

import { AdminDashboard } from './components/dashboards/AdminDashboard';
import { InvestigatorDashboard } from './components/dashboards/InvestigatorDashboard';
import { AnalystDashboard } from './components/dashboards/AnalystDashboard';
import { SupervisorDashboard } from './components/dashboards/SupervisorDashboard';
import { PolicymakerDashboard } from './components/dashboards/PolicymakerDashboard';

import { Menu, X } from 'lucide-react';
import './styles/global.css';
import { apiClient, toAppRole } from './services/apiClient';
import { dataService } from './services/mockDataService';

const DashboardViewManager: React.FC<{
  isChatOpen: boolean;
  onOpenExplainModal: () => void;
  onOpenChatDrawer: () => void;
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
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isExplainOpen, setIsExplainOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!apiClient.hasSession()) return;
    Promise.all([apiClient.restore(), dataService.hydrate()])
      .then(([session]) => {
        setRole(toAppRole(session.role));
        setIsAuthenticated(true);
      })
      .catch(() => dataService.clear())
      .finally(() => setIsRestoring(false));
  }, [setRole]);

  const signOut = async () => {
    setIsAuthenticated(false);
    try {
      await apiClient.logout();
    } finally {
      dataService.clear();
    }
  };

  if (isRestoring) {
    return <div className="login-page" aria-live="polite"><div className="login-atmosphere" /></div>;
  }

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden', position: 'relative' }}>
      
      {/* Top Header */}
      <Header onSignOut={signOut} />

      {/* Body Content */}
      <div className="app-body" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div className={`mobile-sidebar-shell ${isMobileNavOpen ? 'is-open' : ''}`}>
          <Sidebar onOpenChatDrawer={() => setIsChatOpen(true)} onNavigate={() => setIsMobileNavOpen(false)} />
        </div>
        {isMobileNavOpen && <button className="mobile-sidebar-backdrop" aria-label="Close navigation" onClick={() => setIsMobileNavOpen(false)} />}

        <main className="app-main" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', backgroundColor: 'var(--surface)' }}>
          <DashboardViewManager
            isChatOpen={isChatOpen}
            onOpenExplainModal={() => setIsExplainOpen(true)}
            onOpenChatDrawer={() => setIsChatOpen(true)}
          />
        </main>
      </div>

      <button className="mobile-nav-toggle" aria-label={isMobileNavOpen ? 'Close navigation' : 'Open navigation'} onClick={() => setIsMobileNavOpen(value => !value)}>{isMobileNavOpen ? <X size={20}/> : <Menu size={20}/>}</button>

      {/* AI Persona Drawer */}
      <AIChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
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
