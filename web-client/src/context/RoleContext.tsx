import React, { createContext, useCallback, useContext, useState } from 'react';
import type { AppRole, RoleConfig } from '../types/role';
import { ROLE_CONFIGS } from '../types/role';

interface RoleContextType {
  activeRole: AppRole;
  roleConfig: RoleConfig;
  setRole: (role: AppRole) => void;
  showRoleFlip: boolean;
  setShowRoleFlip: (show: boolean) => void;
  activeView: string;
  setActiveView: (view: string) => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeRole, setActiveRole] = useState<AppRole>('ANALYST');
  const [showRoleFlip, setShowRoleFlip] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<string>('Overview');

  const setRole = useCallback((newRole: AppRole) => {
    setActiveRole(newRole);
    const config = ROLE_CONFIGS[newRole];
    if (config && config.visibleViews.length > 0) {
      setActiveView(config.visibleViews[0]);
    }
  }, []);

  return (
    <RoleContext.Provider
      value={{
        activeRole,
        roleConfig: ROLE_CONFIGS[activeRole],
        setRole,
        showRoleFlip,
        setShowRoleFlip,
        activeView,
        setActiveView
      }}
    >
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used within a RoleProvider');
  return ctx;
};
