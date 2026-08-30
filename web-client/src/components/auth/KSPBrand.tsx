import React from 'react';
import kspOfficialLogo from '../../assets/ksp.jpg';

export const KSPBrand: React.FC = () => {
  return (
    <div className="ksp-brand">
      <div className="ksp-brand__logo">
        <img
          src={kspOfficialLogo}
          alt="Karnataka State Police Logo"
        />
      </div>
      <div>
        <h2 className="ksp-brand__title">
          KARNATAKA<br />
          STATE POLICE
        </h2>
      </div>
    </div>
  );
};
