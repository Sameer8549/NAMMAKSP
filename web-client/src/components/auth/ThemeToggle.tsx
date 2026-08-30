import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className="theme-toggle"
    >
      {theme === 'dark' ? (
        <>
          <Sun size={14} color="var(--accent)" />
          <span>Light</span>
        </>
      ) : (
        <>
          <Moon size={14} color="var(--text-primary)" />
          <span>Dark</span>
        </>
      )}
    </button>
  );
};
