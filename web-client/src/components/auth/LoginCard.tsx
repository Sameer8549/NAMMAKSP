import React, { useState } from 'react';
import { useRole } from '../../context/RoleContext';
import { useLanguage } from '../../context/LanguageContext';
import kspOfficialLogo from '../../assets/ksp.jpg';
import { apiClient, toAppRole } from '../../services/apiClient';
import { dataService } from '../../services/mockDataService';

import {
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
} from 'lucide-react';

interface LoginCardProps {
  onLoginSuccess: () => void;
}

export const LoginCard: React.FC<LoginCardProps> = ({ onLoginSuccess }) => {
  const { setRole } = useRole();
  const { translations, language } = useLanguage();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [authStatus, setAuthStatus] = useState<'IDLE' | 'AUTHENTICATING' | 'VERIFYING' | 'GRANTED'>('IDLE');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setAuthStatus('AUTHENTICATING');
    try {
      const session = await apiClient.login(username.trim(), password);
      setAuthStatus('VERIFYING');
      await dataService.hydrate();
      setRole(toAppRole(session.role));
      setAuthStatus('GRANTED');
      window.setTimeout(onLoginSuccess, 250);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Sign-in failed');
      setAuthStatus('IDLE');
    }
  };

  const getButtonText = () => {
    switch (authStatus) {
      case 'AUTHENTICATING': return translations.authenticating;
      case 'VERIFYING': return translations.verifyingAccess;
      case 'GRANTED': return translations.accessGranted;
      default: return translations.signIn;
    }
  };

  return (
    <div className="login-card">
      
      {/* Clean Official KSP Logo Rendering */}
      <div className="login-card__crest">
        <img
          src={kspOfficialLogo}
          alt="Official KSP Logo"
        />
      </div>

      <span className="login-card__agency">
        {translations.agencyName}
      </span>

      <h3 className="login-card__title">
        {translations.welcomeBack}
      </h3>

      <p className="login-card__subtitle">
        {translations.signInSubtitle}
      </p>

      {/* Login Form */}
      <form onSubmit={handleLogin} className="login-card__form">
        
        {/* Username / Employee ID Input */}
        <div className="login-field">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={translations.usernamePlaceholder}
            required
            className="login-field__control"
            aria-label={translations.usernamePlaceholder}
          />
          <User size={18} className="login-field__icon" aria-hidden="true" />
        </div>

        {/* Password Input */}
        <div className="login-field">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={translations.passwordPlaceholder}
            required
            className="login-field__control login-field__control--password"
            aria-label={translations.passwordPlaceholder}
          />
          <Lock size={18} className="login-field__icon" aria-hidden="true" />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="login-field__visibility"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {/* Remember Me & Forgot Password */}
        <div className="login-options">
          <label className="login-options__remember">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span>{translations.rememberMe}</span>
          </label>
          <a href="#forgot" onClick={(e) => e.preventDefault()} className="login-options__forgot">
            {translations.forgotPassword}
          </a>
        </div>

        {/* Primary SIGN IN Button */}
        <button
          type="submit"
          disabled={authStatus !== 'IDLE'}
          className="login-submit"
          data-status={authStatus}
        >
          <span>{getButtonText()}</span>
          <ArrowRight size={18} style={{ transform: language === 'kn' ? 'none' : 'none' }} />
        </button>

      </form>

      {/* Security Message */}
      <p className="login-card__warning">
        {error || translations.unauthorizedWarning}
      </p>

    </div>
  );
};

