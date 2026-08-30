import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useRole } from '../../context/RoleContext';
import { generateReportData, exportDashboardToCSV } from '../../services/reportExportService';
import kspEmblemImg from '../../assets/ksp.jpg';
import type { CaseRecord } from '../../types/crime';
import { Download, X, ShieldCheck, QrCode, Archive } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { dataService } from '../../services/mockDataService';

interface WhiteSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseRecord?: CaseRecord | null;
}

export const WhiteSheetModal: React.FC<WhiteSheetModalProps> = ({ isOpen, onClose, caseRecord }) => {
  const { language, translations } = useLanguage();
  const { activeRole, activeView } = useRole();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [archivedReports, setArchivedReports] = useState<Array<Record<string, unknown>>>([]);
  const [selectedArchive, setSelectedArchive] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    apiClient.listReports().then(reports => {
      setArchivedReports(reports);
      const first = reports[0];
      setSelectedArchive(first ? String(first.filename || first.name || '') : '');
    }).catch(() => setArchivedReports([]));
  }, [isOpen]);

  if (!isOpen) return null;

  const isKn = language === 'kn';
  let reportData = generateReportData(activeRole, activeView || 'Overview', language);

  if (caseRecord) {
    reportData = {
      title: isKn
        ? `ಪ್ರಕರಣ ಎಫ್‌ಐಆರ್ ವೈಟ್ ಶೀಟ್ ವರದಿ: ${caseRecord.firNumber}`
        : `Official Case FIR Dossier White Sheet: ${caseRecord.firNumber}`,
      subtitle: caseRecord.title,
      refNo: `FIR-${caseRecord.firNumber}`,
      generatedDate: new Date().toLocaleDateString(isKn ? 'kn-IN' : 'en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      officerName: caseRecord.assignedOfficer?.name || (isKn ? 'ತನಿಖಾಧಿಕಾರಿ' : 'Investigating Officer'),
      stationName: caseRecord.assignedOfficer?.station || caseRecord.location?.station || 'Karnataka Police',
      summaryMetrics: [
        { label: isKn ? 'ಎಫ್‌ಐಆರ್ ಸಂಖ್ಯೆ' : 'FIR Number', value: caseRecord.firNumber },
        { label: isKn ? 'ಪ್ರಕರಣದ ಸ್ಥಿತಿ' : 'Case Status', value: caseRecord.status },
        { label: isKn ? 'ಅಪರಾಧ ವಿಭಾಗ' : 'Crime Category', value: caseRecord.category },
        { label: isKn ? 'ಆದ್ಯತೆ ಮಟ್ಟ' : 'Priority Level', value: caseRecord.priority }
      ],
      tableHeaders: isKn
        ? ['ಕಾಯಿದೆ ವಿಭಾಗಗಳು', 'ಜಿಲ್ಲೆ', 'ಅಪರಾಧ ವಿಧಾನ', 'ಶಂಕಿತರ ವಿವರಗಳು', 'ದಾಖಲಾದ ದಿನಾಂಕ']
        : ['IPC Sections', 'District', 'Primary MO Method', 'Identified Suspects', 'Filed Date'],
      tableRows: [
        [
          caseRecord.ipcSections.join(', '),
          caseRecord.location?.district || 'Karnataka',
          caseRecord.modusOperandi.primaryMethod,
          caseRecord.accused.map(a => a.name).join(', ') || (isKn ? 'ತನಿಖೆಯಲ್ಲಿದೆ' : 'Under Investigation'),
          caseRecord.filedDate
        ]
      ],
      aiInsights: [
        `Case Synopsis: ${caseRecord.summary}`,
        `MO Target Profile: ${caseRecord.modusOperandi.targetProfile}`,
        `Tools & Evidence: ${caseRecord.modusOperandi.toolsUsed.join(', ')}`
      ]
    };
  }

  const handlePdfExport = async () => {
    setGenerationError('');
    setIsGenerating(true);
    try {
      if (caseRecord) {
        await apiClient.generateReport('case', { fir_id: caseRecord.firNumber });
      } else if (activeRole === 'ADMIN') {
        exportDashboardToCSV(activeRole, activeView || 'Overview', language);
      } else if (activeRole === 'SUPERVISOR') {
        const firstCase = dataService.getAllCases()[0];
        if (!firstCase) throw new Error('No command-scoped FIR is available for report generation.');
        await apiClient.generateReport('case', { fir_id: firstCase.firNumber });
      } else {
        const district = dataService.getDistricts()[0]?.name;
        if (!district) throw new Error('No verified district data is available for report generation.');
        await apiClient.generateReport('district', { district });
      }
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : 'Report generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        overflowY: 'auto'
      }}
    >
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #ksp-printable-white-sheet, #ksp-printable-white-sheet * {
            visibility: visible !important;
          }
          #ksp-printable-white-sheet {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 1.5cm !important;
            box-shadow: none !important;
            border: none !important;
            background-color: #ffffff !important;
            color: #0f172a !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div
        style={{
          width: '940px',
          maxWidth: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--surface-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden'
        }}
      >
        {/* Modal Action Controls Bar (Screen Only) */}
        <div
          className="no-print"
          style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid var(--border)',
            backgroundColor: 'var(--surface-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <img src={kspEmblemImg} alt="KSP Logo" style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                {translations.whiteSheet.downloadReport}
              </h3>
            </div>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0 0' }}>
              {isKn
                ? 'ಕರ್ನಾಟಕ ರಾಜ್ಯ ಪೊಲೀಸ್ ಅಧಿಕೃತ ವೈಟ್ ಶೀಟ್ ವರದಿ (ಕನ್ನಡ ಭಾಷೆಯಲ್ಲಿ)'
                : 'Official KSP White Sheet Document with Emblem Logo & Background Watermark'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {archivedReports.length > 0 && (
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.72rem' }}>
                <Archive size={15} />
                <select value={selectedArchive} onChange={event => setSelectedArchive(event.target.value)} aria-label="Archived report" style={{ maxWidth: 210, padding: '0.42rem', color: 'var(--text-primary)', background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                  {archivedReports.map((report, index) => {
                    const filename = String(report.filename || report.name || '');
                    return <option key={filename || index} value={filename}>{filename || `Report ${index + 1}`}</option>;
                  })}
                </select>
              </label>
            )}
            {selectedArchive && <button title="Download selected archived report" aria-label="Download selected archived report" onClick={() => void apiClient.downloadReport(selectedArchive)} style={{ padding: '0.45rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--surface-card)', color: 'var(--text-primary)', border: '1px solid var(--border)', cursor: 'pointer' }}><Download size={16} /></button>}
            {selectedArchive && <button title="Open report QR link" aria-label="Open report QR link" onClick={() => window.open(apiClient.reportQrUrl(selectedArchive), '_blank', 'noopener,noreferrer')} style={{ padding: '0.45rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--surface-card)', color: 'var(--text-primary)', border: '1px solid var(--border)', cursor: 'pointer' }}><QrCode size={16} /></button>}
            <button
              onClick={handlePdfExport}
              disabled={isGenerating}
              className="btn btn-primary"
            >
              <Download size={15} />
              {isGenerating ? 'Generating PDF...' : 'Download PDF'}
            </button>

            <button
              onClick={onClose}
              style={{
                padding: '0.45rem',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--surface-card)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border)',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>
        {generationError && (
          <div className="no-print" role="alert" style={{ padding: '0.65rem 1rem', color: 'var(--critical)', background: 'var(--surface-muted)' }}>
            {generationError}
          </div>
        )}

        {/* Modal Printable White Sheet Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, backgroundColor: '#334155' }}>
          <div
            id="ksp-printable-white-sheet"
            style={{
              backgroundColor: '#ffffff',
              color: '#0f172a',
              padding: '2.75rem 2.5rem',
              borderRadius: '6px',
              position: 'relative',
              overflow: 'hidden',
              minHeight: '960px',
              fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.25)',
              border: '1px solid #cbd5e1'
            }}
          >
            {/* KSP Emblem Watermark Background Symbol */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                opacity: 0.14,
                pointerEvents: 'none',
                zIndex: 0,
                backgroundImage: `url(${kspEmblemImg})`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center center',
                backgroundSize: '520px auto'
              }}
            />

            {/* Content Container (Layer 1 above Watermark) */}
            <div style={{ position: 'relative', zIndex: 1 }}>
              {/* Header Crest & Metadata */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '3px solid #1e3a8a',
                  paddingBottom: '1.2rem',
                  marginBottom: '1.5rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <img
                    src={kspEmblemImg}
                    alt="KSP Crest Logo"
                    style={{
                      width: '72px',
                      height: '72px',
                      objectFit: 'contain',
                      borderRadius: '4px'
                    }}
                  />
                  <div>
                    <h1
                      style={{
                        fontSize: '1.45rem',
                        fontWeight: 900,
                        color: '#1e3a8a',
                        margin: 0,
                        letterSpacing: '0.02em',
                        textTransform: 'uppercase'
                      }}
                    >
                      {isKn ? 'ಕರ್ನಾಟಕ ರಾಜ್ಯ ಪೊಲೀಸ್' : 'KARNATAKA STATE POLICE'}
                    </h1>
                    <h2 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#334155', margin: '3px 0 0 0' }}>
                      {isKn ? 'ಬುದ್ಧಿಮತ್ತೆ ವೇದಿಕೆ • ಅಧಿಕೃತ ವೈಟ್ ಶೀಟ್ ವರದಿ' : 'INTELLIGENCE PLATFORM • OFFICIAL WHITE SHEET REPORT'}
                    </h2>
                    <p style={{ fontSize: '0.74rem', color: '#64748b', margin: '3px 0 0 0', fontWeight: 600 }}>
                      {translations.whiteSheet.officialDocument}
                    </p>
                  </div>
                </div>

                <div style={{ textAlign: 'right', borderLeft: '1px solid #e2e8f0', paddingLeft: '1.25rem' }}>
                  <div
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 900,
                      color: '#dc2626',
                      border: '1.5px solid #f87171',
                      padding: '3px 9px',
                      borderRadius: '4px',
                      backgroundColor: '#fef2f2',
                      display: 'inline-block',
                      letterSpacing: '0.05em'
                    }}
                  >
                    {translations.whiteSheet.confidential}
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b', marginTop: '6px' }}>
                    {reportData.refNo}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>
                    {reportData.generatedDate}
                  </div>
                </div>
              </div>

              {/* Document Overview Strip */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '0.9rem 1.25rem',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.85rem'
                }}
              >
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                    {reportData.title}
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: '#475569', margin: '2px 0 0 0' }}>
                    {reportData.subtitle}
                  </p>
                </div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e3a8a', textAlign: 'right' }}>
                  <div>{reportData.officerName}</div>
                  <div style={{ color: '#64748b', fontSize: '0.72rem' }}>{reportData.stationName}</div>
                </div>
              </div>

              {/* Summary Metrics Cards */}
              <div style={{ marginBottom: '1.75rem' }}>
                <h3
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 900,
                    color: '#1e3a8a',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '0.75rem',
                    borderBottom: '1px solid #cbd5e1',
                    paddingBottom: '0.35rem'
                  }}
                >
                  {translations.whiteSheet.summaryMetrics}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                  {reportData.summaryMetrics.map((m, idx) => (
                    <div
                      key={idx}
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '0.85rem',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                      }}
                    >
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                        {m.label}
                      </div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', marginTop: '0.2rem' }}>
                        {m.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Data Table */}
              <div style={{ marginBottom: '1.75rem' }}>
                <h3
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 900,
                    color: '#1e3a8a',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '0.75rem',
                    borderBottom: '1px solid #cbd5e1',
                    paddingBottom: '0.35rem'
                  }}
                >
                  {translations.whiteSheet.detailedBreakdown}
                </h3>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '0.78rem',
                    border: '1px solid #cbd5e1'
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #94a3b8' }}>
                      {reportData.tableHeaders.map((header, idx) => (
                        <th
                          key={idx}
                          style={{
                            padding: '0.6rem 0.75rem',
                            textAlign: 'left',
                            fontWeight: 800,
                            color: '#1e293b'
                          }}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.tableRows.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        style={{
                          borderBottom: '1px solid #e2e8f0',
                          backgroundColor: rIdx % 2 === 0 ? '#ffffff' : '#f8fafc'
                        }}
                      >
                        {row.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            style={{
                              padding: '0.55rem 0.75rem',
                              color: cIdx === 0 ? '#1e3a8a' : '#334155',
                              fontWeight: cIdx === 0 ? 800 : 500
                            }}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* AI Synthesis & Insights */}
              <div
                style={{
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '6px',
                  padding: '1rem 1.25rem',
                  marginBottom: '2rem'
                }}
              >
                <h3 style={{ fontSize: '0.85rem', fontWeight: 900, color: '#1e40af', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <ShieldCheck size={16} />
                  <span>{translations.whiteSheet.aiIntelligenceSummary}</span>
                </h3>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.78rem', color: '#1e293b', lineHeight: 1.5 }}>
                  {reportData.aiInsights.map((insight, idx) => (
                    <li key={idx} style={{ marginBottom: '0.35rem' }}>
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Footer Signature & KSP Seal Block */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  marginTop: '2.5rem',
                  paddingTop: '1.5rem',
                  borderTop: '2px dashed #cbd5e1'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      border: '2px double #1e3a8a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#1e3a8a',
                      fontWeight: 900,
                      fontSize: '0.55rem',
                      textAlign: 'center',
                      padding: '4px'
                    }}
                  >
                    {translations.whiteSheet.sealText}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#1e293b' }}>
                      {reportData.officerName}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      {reportData.stationName}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '2px' }}>
                      {translations.whiteSheet.kspWatermarkNotice}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'center', minWidth: '220px' }}>
                  <div style={{ borderBottom: '1.5px solid #0f172a', paddingBottom: '0.25rem', marginBottom: '0.35rem', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.82rem', color: '#1e3a8a' }}>
                    [DIGITAL SEAL SIGNATURE]
                  </div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0f172a' }}>
                    {translations.whiteSheet.signatureBlock}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                    Government of Karnataka
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
