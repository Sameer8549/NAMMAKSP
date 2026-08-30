import React from 'react';
import type { CasePriority, CaseStatus } from '../../types/crime';

interface StatusBadgeProps {
  type: 'priority' | 'status' | 'risk';
  value: CasePriority | CaseStatus | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ type, value }) => {
  let badgeClass = 'badge-info';
  let label = String(value);

  if (type === 'priority') {
    switch (value) {
      case 'CRITICAL': badgeClass = 'badge-critical'; break;
      case 'HIGH': badgeClass = 'badge-warning'; break;
      case 'MEDIUM': badgeClass = 'badge-info'; break;
      case 'LOW': badgeClass = 'badge-success'; break;
    }
  } else if (type === 'status') {
    switch (value) {
      case 'UNDER_INVESTIGATION': badgeClass = 'badge-warning'; label = 'UNDER INVESTIGATION'; break;
      case 'OPEN': badgeClass = 'badge-critical'; label = 'OPEN'; break;
      case 'PENDING_REVIEW': badgeClass = 'badge-warning'; label = 'PENDING REVIEW'; break;
      case 'CHARGE_SHEETED': badgeClass = 'badge-success'; label = 'CHARGE SHEETED'; break;
      case 'CLOSED': badgeClass = 'badge-info'; label = 'CLOSED'; break;
    }
  } else if (type === 'risk') {
    if (value === 'CRITICAL' || value === 'HIGH_ALERT') badgeClass = 'badge-critical';
    else if (value === 'HIGH' || value === 'MODERATE') badgeClass = 'badge-warning';
    else badgeClass = 'badge-success';
  }

  return (
    <span className={`badge ${badgeClass}`}>
      {label}
    </span>
  );
};
