import React, { useState, useMemo } from 'react';
import { MasterObservatoryBarChart } from './MasterObservatoryBarChart';
import {
  GitCompare,
  Search
} from 'lucide-react';
import { useRole } from '../../context/RoleContext';

// Re-export MasterObservatoryBarChart as MovingCrimeTrendsGraph for backward compatibility
export const MovingCrimeTrendsGraph: React.FC = () => {
  return <MasterObservatoryBarChart />;
};

export interface CorrelationCaseItem {
  id: string;
  title: string;
  category: 'Cybercrime' | 'Property Burglary' | 'Extortion' | 'Narcotics' | 'Gambling' | 'Rural / Highway';
  correlationPercentage: number;
  district: string;
  triggerFactor: string;
  evidenceText: string;
  associatedFIR: string;
  primarySuspect: string;
  suspectRiskScore: number;
  policeActionStep: string;
  status: 'HIGH_CORRELATION' | 'EMERGING_PATTERN' | 'VALIDATED';
}

const EXTENDED_CORRELATION_CASES: CorrelationCaseItem[] = [
  {
    id: 'CORR-01',
    title: 'Heavy Rainfall vs. Commercial Gas-Cutter Heists',
    category: 'Property Burglary',
    correlationPercentage: 92,
    district: 'Mysuru & Hassan Division',
    triggerFactor: 'Monsoon Rainstorms & High Wind Acoustics',
    evidenceText: 'Burglaries using oxy-acetylene cutters spike by 92% during heavy rainstorms. The sound of rain dampens alarm sirens and cutter noise while optical fiber lines are pre-severed.',
    associatedFIR: 'FIR-0389/2026/MYS-CC',
    primarySuspect: 'Manjunath "Cutter" Shetty (Shetty Mama)',
    suspectRiskScore: 92,
    policeActionStep: 'Increase stationary night beats and CCTV optical fiber line monitoring near standalone jeweler clusters during heavy rainfall warnings.',
    status: 'HIGH_CORRELATION'
  },
  {
    id: 'CORR-02',
    title: 'KEB Bill Due Dates vs. Banking Trojan APK Surge',
    category: 'Cybercrime',
    correlationPercentage: 89,
    district: 'Bengaluru Urban & Shivamogga',
    triggerFactor: 'Monthly Utility Bill Deadline Dates',
    evidenceText: 'Fake KEB electricity bill update APK SMS messages surge 4 days prior to monthly electricity bill payment deadlines, intercepting banking OTP PUSH notifications.',
    associatedFIR: 'FIR-0421/2026/BLR-CYBER',
    primarySuspect: 'Suresh "Cyber" Gowda (Viper_09)',
    suspectRiskScore: 88,
    policeActionStep: 'Issue public safety advisory via KSP Twitter/WhatsApp 5 days before bill due dates and issue bank freeze orders to ICICI Kalaburagi mule accounts.',
    status: 'HIGH_CORRELATION'
  },
  {
    id: 'CORR-03',
    title: 'New Real Estate Approvals vs. Protection Tax Extortion',
    category: 'Extortion',
    correlationPercentage: 94,
    district: 'Hubballi-Dharwad & Belagavi',
    triggerFactor: 'Municipal Board Plan Sanction Notifications',
    evidenceText: 'Extortion demand calls served via UK VoIP relays (+44 7911) spike within 48 hours of new commercial building plan approval notifications, demanding 2% per sq yard.',
    associatedFIR: 'FIR-0192/2026/HBD-NC',
    primarySuspect: 'Ganesh "Don" Kulkarni (GK Hubballi)',
    suspectRiskScore: 96,
    policeActionStep: 'Audit Municipal Planning Board internal file access logs for leak points and deploy armed PCR vans near Gokul Road construction sites.',
    status: 'HIGH_CORRELATION'
  },
  {
    id: 'CORR-04',
    title: 'College Re-Opening Dates vs. Coastal Synthetic Drug Consignments',
    category: 'Narcotics',
    correlationPercentage: 87,
    district: 'Dakshina Kannada (Mangaluru)',
    triggerFactor: 'Academic Semester Start & Hostel Admissions',
    evidenceText: 'Interstate drug trafficking rings smuggle synthetic MDMA via motorized fishing boats 3 days prior to university hostel admissions, deploying dead-drops near Panambur harbor.',
    associatedFIR: 'FIR-0511/2026/DK-NARCO',
    primarySuspect: 'Mohammed "Sea" Althaf (Sea Althaf)',
    suspectRiskScore: 78,
    policeActionStep: 'Coordinate Coastal Security Police speedboats for nocturnal harbor sweeps near Panambur jetties and inspect college hostel dead-letter drop boxes.',
    status: 'EMERGING_PATTERN'
  },
  {
    id: 'CORR-05',
    title: 'State Border Festival Days vs. Mobile Matka Hawala Payouts',
    category: 'Gambling',
    correlationPercentage: 83,
    district: 'Belagavi & Goa Border Corridor',
    triggerFactor: 'Interstate Holiday Long Weekends',
    evidenceText: 'Interstate gamblers cross border resorts on weekend holidays, utilizing mobile hawala terminals for instant matka cash settlements across NH-4A.',
    associatedFIR: 'FIR-0112/2026/BLG-CR',
    primarySuspect: 'Ramesh "Goa" Patil (Patil Matka)',
    suspectRiskScore: 71,
    policeActionStep: 'Deploy border checkpost vehicle inspections along NH-4A Goa road to intercept weekend cash couriers.',
    status: 'VALIDATED'
  },
  {
    id: 'CORR-06',
    title: 'Agricultural Harvest Season vs. Fertilizer Warehouse Raids',
    category: 'Rural / Highway',
    correlationPercentage: 81,
    district: 'Kalaburagi & Raichur District',
    triggerFactor: 'Crop Harvest Window & DAP Fertilizer Shortage',
    evidenceText: 'Demand for subsidized DAP fertilizers and tractor batteries spikes during crop harvest, leading to night break-ins at APMC government storage warehouses.',
    associatedFIR: 'FIR-0204/2026/KLB-AGRI',
    primarySuspect: 'Shankar "Raitu" Pujari',
    suspectRiskScore: 74,
    policeActionStep: 'Set up APMC yard night patrols and verify interstate fertilizer transport permits at district border checkposts.',
    status: 'VALIDATED'
  },
  {
    id: 'CORR-07',
    title: 'High-Speed Toll Passages vs. Interstate Gold Chain Snatching',
    category: 'Rural / Highway',
    correlationPercentage: 86,
    district: 'Tumakuru & Kolar Highway Corridors',
    triggerFactor: 'Suburban Highway Junctions & Peak Evening Toll Traffic',
    evidenceText: 'Out-of-state motorcycle gangs use stolen 390cc sports bikes, snatching gold chains at suburban highway junctions and escaping across toll plazas within 20 minutes.',
    associatedFIR: 'FIR-0098/2026/TUM-HWY',
    primarySuspect: 'Vikram "Rider" Singh',
    suspectRiskScore: 82,
    policeActionStep: 'Integrate FASTag automated toll barrier locks with ANPR (Automatic Number Plate Recognition) cameras at Tumakuru and Kolar toll gates.',
    status: 'HIGH_CORRELATION'
  }
];

export const MovingCorrelationsGraph: React.FC = () => {
  const { setActiveView } = useRole();

  const [selectedCaseId, setSelectedCaseId] = useState<string>('CORR-01');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Filtered correlation items
  const filteredCases = useMemo(() => {
    return EXTENDED_CORRELATION_CASES.filter(item => {
      const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;
      const matchesSearch =
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.evidenceText.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [categoryFilter, searchTerm]);

  // Active selected item
  const activeCase = useMemo(() => {
    return EXTENDED_CORRELATION_CASES.find(c => c.id === selectedCaseId) || EXTENDED_CORRELATION_CASES[0];
  }, [selectedCaseId]);

  return (
    <div style={{
      backgroundColor: 'var(--surface-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '1.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.2rem',
      boxShadow: 'var(--shadow-md)'
    }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(217, 119, 6, 0.15)',
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <GitCompare size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              Crime Pattern Correlations & AI Evidence Explanations
            </h3>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              Statistical correlation analysis linking weather, timelines, financial channels, and suspect modus operandi across Karnataka.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{
            fontSize: '0.76rem',
            fontWeight: 800,
            color: 'var(--accent)',
            backgroundColor: 'rgba(217, 119, 6, 0.12)',
            padding: '0.35rem 0.75rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(217, 119, 6, 0.3)'
          }}>
            ⚡ AI PATTERN ENGINE: 7 CASE SCENARIOS LOADED
          </span>
        </div>
      </div>

      {/* Search & Category Filter Bar */}
      <div style={{
        backgroundColor: 'var(--surface-muted)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '0.75rem 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search correlation case title, district, trigger factor, or FIR..."
            style={{
              width: '100%',
              padding: '0.5rem 0.85rem 0.5rem 2.2rem',
              backgroundColor: 'var(--surface-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: '0.82rem',
              outline: 'none'
            }}
          />
          <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>Category:</span>
          {['ALL', 'Cybercrime', 'Property Burglary', 'Extortion', 'Narcotics', 'Gambling', 'Rural / Highway'].map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                padding: '0.28rem 0.65rem',
                borderRadius: 'var(--radius-sm)',
                border: categoryFilter === cat ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                backgroundColor: categoryFilter === cat ? 'rgba(234, 179, 8, 0.2)' : 'var(--surface-card)',
                color: categoryFilter === cat ? 'var(--accent)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'var(--transition-fast)'
              }}
            >
              {cat === 'ALL' ? 'All Categories' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split Grid Layout: Left List Cards | Right Detailed Inspection Dossier */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.2fr) minmax(360px, 1.3fr)', gap: '1.25rem' }}>
        
        {/* LEFT COLUMN: LIST OF CORRELATION CASES */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Identified Correlation Scenarios ({filteredCases.length}):
          </span>

          {filteredCases.map(item => {
            const isSelected = item.id === selectedCaseId;

            return (
              <div
                key={item.id}
                onClick={() => setSelectedCaseId(item.id)}
                style={{
                  backgroundColor: isSelected ? 'var(--surface-hover)' : 'var(--surface-elevated)',
                  border: isSelected ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                  borderLeft: isSelected ? '5px solid var(--accent)' : '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  cursor: 'pointer',
                  transition: 'all 200ms ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.55rem',
                  boxShadow: isSelected ? '0 0 14px rgba(234, 179, 8, 0.2)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                    {item.correlationPercentage}% STATISTICAL CORRELATION
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                    {item.district}
                  </span>
                </div>

                <h4 style={{ fontSize: '0.96rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3 }}>
                  {item.title}
                </h4>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                  <span>Category: <strong>{item.category}</strong></span>
                  <span style={{ color: 'var(--accent)', fontWeight: 700 }}>FIR Ref: {item.associatedFIR.split('/')[0]}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* RIGHT COLUMN: DETAILED AI EVIDENCE DOSSIER */}
        <div style={{
          backgroundColor: 'var(--surface-elevated)',
          border: '1px solid var(--border-accent)',
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.1rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          {/* Header */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                {activeCase.correlationPercentage}% HIGH STATISTICAL MATCH
              </span>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent)' }}>
                DISTRICT: {activeCase.district}
              </span>
            </div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.35 }}>
              {activeCase.title}
            </h3>

            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontWeight: 600 }}>
              Primary Trigger Factor: <strong style={{ color: 'var(--critical)' }}>"{activeCase.triggerFactor}"</strong>
            </div>
          </div>

          {/* Statistical Correlation Gauge */}
          <div style={{
            padding: '0.85rem 1rem',
            backgroundColor: 'var(--surface-muted)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
              <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>Pattern Confidence Metric:</span>
              <strong style={{ color: 'var(--accent)', fontSize: '0.9rem' }}>{activeCase.correlationPercentage}% Match Strength</strong>
            </div>
            <div style={{ height: '8px', backgroundColor: 'var(--surface-card)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${activeCase.correlationPercentage}%`, height: '100%', backgroundColor: 'var(--accent)', borderRadius: '4px' }} />
            </div>
          </div>

          {/* Evidence Explanation Box */}
          <div style={{
            padding: '0.85rem 1rem',
            backgroundColor: 'var(--surface-muted)',
            borderRadius: 'var(--radius-sm)',
            borderLeft: '4px solid var(--accent)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem'
          }}>
            <strong style={{ fontSize: '0.86rem', color: 'var(--accent)', display: 'block' }}>
              🧠 Why This Pattern Occurs (AI Forensic Evidence):
            </strong>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: 1.5, margin: 0 }}>
              "{activeCase.evidenceText}"
            </p>
          </div>

          {/* FIR & Suspect Quick Info */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.75rem',
            fontSize: '0.76rem',
            color: 'var(--text-secondary)'
          }}>
            <div style={{ backgroundColor: 'var(--surface-muted)', padding: '0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>PRIMARY FIR RECORD</span>
              <strong style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>{activeCase.associatedFIR}</strong>
            </div>

            <div style={{ backgroundColor: 'var(--surface-muted)', padding: '0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>PRIMARY SUSPECT</span>
              <strong style={{ color: 'var(--critical)', fontSize: '0.82rem' }}>{activeCase.primarySuspect}</strong>
            </div>
          </div>

          {/* Tactical Action Step */}
          <div style={{
            padding: '0.85rem 1rem',
            backgroundColor: 'var(--surface-muted)',
            borderRadius: 'var(--radius-sm)',
            borderLeft: '4px solid var(--success)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem'
          }}>
            <strong style={{ fontSize: '0.86rem', color: 'var(--success)', display: 'block' }}>
              🛡️ Recommended Police Actionable Strategy:
            </strong>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: 1.45, margin: 0 }}>
              {activeCase.policeActionStep}
            </p>
          </div>

          {/* Direct Navigation Button */}
          <button
            onClick={() => setActiveView('Network Analysis')}
            style={{
              width: '100%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1rem',
              backgroundColor: 'var(--accent)',
              color: '#000000',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.82rem',
              fontWeight: 900,
              cursor: 'pointer'
            }}
          >
            <span>View Suspect Network Analysis →</span>
          </button>
        </div>
      </div>
    </div>
  );
};
