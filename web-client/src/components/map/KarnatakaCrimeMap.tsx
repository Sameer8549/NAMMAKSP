import React from 'react';
import { Karnataka3DMap } from './Karnataka3DMap';
import type { DistrictStats } from '../../types/analytics';

interface KarnatakaCrimeMapProps {
  selectedDistrictName?: string;
  onSelectDistrict?: (district: DistrictStats) => void;
  selectedCrimeCategory?: string;
}

export const KarnatakaCrimeMap: React.FC<KarnatakaCrimeMapProps> = ({
  selectedDistrictName,
  onSelectDistrict,
  selectedCrimeCategory
}) => {
  return (
    <Karnataka3DMap
      selectedDistrictName={selectedDistrictName}
      onSelectDistrict={onSelectDistrict}
      selectedCrimeCategory={selectedCrimeCategory}
    />
  );
};
