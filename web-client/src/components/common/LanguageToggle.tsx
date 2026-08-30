import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Languages } from 'lucide-react';

interface LanguageToggleProps {
  variant?: 'pill' | 'button' | 'dropdown';
  className?: string;
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({ variant = 'pill', className }) => {
  const { language, setLanguage } = useLanguage();

  if (variant === 'pill') {
    return (
      <div
        className={`language-toggle-pill ${className || ''}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          backgroundColor: 'var(--surface-muted)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-full, 9999px)',
          padding: '2px',
          gap: '2px',
          boxShadow: 'var(--shadow-xs)'
        }}
      >
        <button
          type="button"
          onClick={() => setLanguage('en')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            borderRadius: 'var(--radius-full, 9999px)',
            border: 'none',
            fontSize: '0.72rem',
            fontWeight: language === 'en' ? 800 : 600,
            backgroundColor: language === 'en' ? 'var(--accent)' : 'transparent',
            color: language === 'en' ? '#000000' : 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 180ms ease'
          }}
          title="Switch to English"
        >
          <span>EN</span>
        </button>

        <button
          type="button"
          onClick={() => setLanguage('kn')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            borderRadius: 'var(--radius-full, 9999px)',
            border: 'none',
            fontSize: '0.72rem',
            fontWeight: language === 'kn' ? 800 : 600,
            backgroundColor: language === 'kn' ? 'var(--accent)' : 'transparent',
            color: language === 'kn' ? '#000000' : 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 180ms ease'
          }}
          title="ಕನ್ನಡಕ್ಕೆ ಬದಲಾಯಿಸಿ"
        >
          <span>ಕನ್ನಡ</span>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setLanguage(language === 'en' ? 'kn' : 'en')}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '0.35rem 0.65rem',
        backgroundColor: 'var(--surface-muted)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        fontSize: '0.76rem',
        fontWeight: 700,
        color: 'var(--accent)',
        cursor: 'pointer',
        transition: 'all 180ms ease'
      }}
      className={className}
      title={language === 'en' ? 'Switch to Kannada' : 'ಇಂಗ್ಲಿಷ್‌ಗೆ ಬದಲಾಯಿಸಿ'}
    >
      <Languages size={15} />
      <span>{language === 'en' ? 'ಕನ್ನಡ' : 'English'}</span>
    </button>
  );
};
