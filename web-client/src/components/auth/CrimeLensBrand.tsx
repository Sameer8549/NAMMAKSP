import React from 'react';
export const CrimeLensBrand: React.FC = () => {
  return (
    <div className="crimelens-brand">
      <h1 className="crimelens-brand__title">
        NAMMA <span className="crimelens-brand__accent">KSP</span>
      </h1>

      <p className="crimelens-brand__tagline">
        Karnataka State Police • Command Portal
      </p>

      {/* Gold Divider Line */}
      <div className="crimelens-brand__rule" />

      <p className="crimelens-brand__copy">
        Karnataka State Police Intelligence Platform
      </p>
    </div>
  );
};
