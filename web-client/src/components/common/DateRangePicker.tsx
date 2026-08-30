import React from 'react';
import { Calendar, Filter, MapPin, Tag } from 'lucide-react';
import { MOCK_KARNATAKA_DISTRICTS } from '../../mock/mockDistricts';

interface FilterBarProps {
  selectedDistrict: string;
  onSelectDistrict: (district: string) => void;
  selectedCrimeType: string;
  onSelectCrimeType: (crimeType: string) => void;
  selectedTimeRange: string;
  onSelectTimeRange: (range: string) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  selectedDistrict,
  onSelectDistrict,
  selectedCrimeType,
  onSelectCrimeType,
  selectedTimeRange,
  onSelectTimeRange
}) => {
  return (
    <div style={{
      backgroundColor: 'var(--surface-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '0.75rem 1.25rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1rem',
      flexWrap: 'wrap',
      marginBottom: '1.25rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent)', fontWeight: 700, fontSize: '0.85rem' }}>
        <Filter size={16} />
        <span>INTELLIGENCE FILTERS</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        {/* District Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <MapPin size={14} color="var(--text-muted)" />
          <select
            value={selectedDistrict}
            onChange={(e) => onSelectDistrict(e.target.value)}
            style={{
              padding: '0.4rem 0.75rem',
              backgroundColor: 'var(--surface-muted)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8rem',
              fontWeight: 500
            }}
          >
            <option value="ALL">All Districts (Karnataka)</option>
            {MOCK_KARNATAKA_DISTRICTS.map(d => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>
        </div>

        {/* Crime Type Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Tag size={14} color="var(--text-muted)" />
          <select
            value={selectedCrimeType}
            onChange={(e) => onSelectCrimeType(e.target.value)}
            style={{
              padding: '0.4rem 0.75rem',
              backgroundColor: 'var(--surface-muted)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8rem',
              fontWeight: 500
            }}
          >
            <option value="ALL">All Categories</option>
            <option value="Cybercrime">Cybercrime</option>
            <option value="Property Theft">Property Theft</option>
            <option value="Financial Fraud">Financial Fraud</option>
            <option value="Violent Crime">Violent Crime</option>
            <option value="Narcotics">Narcotics</option>
            <option value="Organized Syndicate">Organized Syndicate</option>
          </select>
        </div>

        {/* Date Range Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Calendar size={14} color="var(--text-muted)" />
          <select
            value={selectedTimeRange}
            onChange={(e) => onSelectTimeRange(e.target.value)}
            style={{
              padding: '0.4rem 0.75rem',
              backgroundColor: 'var(--surface-muted)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8rem',
              fontWeight: 500
            }}
          >
            <option value="30D">Last 30 Days</option>
            <option value="90D">Last Quarter (90 Days)</option>
            <option value="YTD">Year To Date (2026)</option>
            <option value="1Y">Past 12 Months</option>
          </select>
        </div>
      </div>
    </div>
  );
};
