import React from 'react';
import { LoginCard } from './LoginCard';
import { ThemeToggle } from './ThemeToggle';
import { LanguageToggle } from '../common/LanguageToggle';
import { SystemStatus } from './SystemStatus';
import { useLanguage } from '../../context/LanguageContext';
import './auth.css';

import vidhanaSoudhaDayImg from '../../assets/vidhana_soudha_day.jpg';
import vidhanaSoudhaNightImg from '../../assets/vidhana_soudha_night.jpg';
import kspEmblemImg from '../../assets/ksp.jpg';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { translations } = useLanguage();

  return (
    <div className="login-page">

      {/* LAYER 1: DUAL-BACKGROUND LANDMARK CROSSFADE (Morning Day vs Evening Night) */}
      <div className="login-bg login-bg--day" style={{ backgroundImage: `url(${vidhanaSoudhaDayImg})` }} />

      <div className="login-bg login-bg--night" style={{ backgroundImage: `url(${vidhanaSoudhaNightImg})` }} />

      {/* LAYER 2: ATMOSPHERIC LIGHT/DARK OVERLAY */}
      <div className="login-atmosphere" />

      {/* SOFT TRANSLUCENT BACKDROP FOR LOGIN AREA */}
      <div className="login-panel-backdrop" />

      {/* TOP HEADER BAR */}
      <header className="login-header">
        {/* Top Left Institutional Brand */}
        <div className="login-header-brand">
          <img src={kspEmblemImg} alt="KSP Crest" className="login-header-brand__crest" />
          <div className="login-header-brand__text">
            {translations.agencyName}
          </div>
        </div>

        {/* Top Center Institutional Motto */}
        <div className="login-motto">
          {translations.mottoTop}<br />
          <span>{translations.mottoBottom}</span>
        </div>

        {/* Top Right Controls: Language Switcher & Theme Toggle */}
        <div className="login-toggle-wrap" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <LanguageToggle variant="pill" />
          <ThemeToggle />
        </div>
      </header>

      {/* LAYER 5 & 6: MAIN CONTENT & AUTHENTICATION GRID */}
      <main className="login-main">
        {/* Sky Background Watermark Logo */}
        <div className="login-sky-watermark" aria-label="Namma KSP sky watermark logo">
          <div className="login-hero-brand">
            <h1 className="login-hero-brand__title">
              <span className="login-hero-brand__namma">ನಮ್ಮ</span>
              <span className="login-hero-brand__ksp">KSP</span>
            </h1>
            <p className="login-hero-brand__tagline">
              {translations.heroTagline}
            </p>
          </div>
        </div>

        {/* LAYER 6: Login Card */}
        <div className="login-card-wrap">
          <LoginCard onLoginSuccess={onLoginSuccess} />
        </div>
      </main>

      {/* BOTTOM SYSTEM STATUS BAR */}
      <SystemStatus />

    </div>
  );
};
