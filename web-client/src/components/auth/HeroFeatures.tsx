import React from 'react';
import { Shield, Sparkles, Users } from 'lucide-react';

export const HeroFeatures: React.FC = () => {
  const features = [
    { icon: Shield, label: 'REAL-TIME INTELLIGENCE' },
    { icon: Sparkles, label: 'DATA-DRIVEN DECISIONS' },
    { icon: Users, label: 'SAFER COMMUNITIES' },
  ];

  return (
    <div className="hero-features">
      {features.map(({ icon: Icon, label }) => (
        <div className="hero-feature" key={label}>
          <div className="hero-feature__icon">
            <Icon size={16} />
          </div>
          <span className="hero-feature__label">{label}</span>
        </div>
      ))}
    </div>
  );
};
