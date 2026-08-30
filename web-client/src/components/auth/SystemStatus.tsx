import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

export const SystemStatus: React.FC = () => {
  const { translations } = useLanguage();

  return (
    <footer className="system-status">
      <div className="system-status__left">
        <span>{translations.platformTitle || 'KARNATAKA STATE POLICE INTELLIGENCE PLATFORM'}</span>
      </div>

      <div className="system-status__right">
        <span className="system-status__page">GOVERNMENT OF KARNATAKA OFFICIAL PORTAL</span>
      </div>
    </footer>
  );
};
