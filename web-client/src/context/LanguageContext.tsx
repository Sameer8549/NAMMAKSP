import React, { createContext, useContext, useState } from 'react';

export type Language = 'en' | 'kn';

export interface Translations {
  // Brand & Motto
  agencyName: string;
  agencySubtitle: string;
  mottoTop: string;
  mottoBottom: string;
  heroTagline: string;

  // Login Card
  welcomeBack: string;
  signInSubtitle: string;
  usernamePlaceholder: string;
  passwordPlaceholder: string;
  roleSelectAria: string;
  rememberMe: string;
  forgotPassword: string;
  signIn: string;
  authenticating: string;
  verifyingAccess: string;
  accessGranted: string;
  orDivider: string;
  secureLogin: string;
  unauthorizedWarning: string;

  // System Status
  systemOnline: string;
  platformTitle: string;
  lastUpdated: string;

  // App Header
  nammaKsp: string;
  kspHq: string;
  live: string;
  paused: string;
  officer: string;
  stateAdmin: string;
  logout: string;
  switchToLight: string;
  switchToDark: string;

  // Sidebar
  hideSidebar: string;
  showSidebar: string;
  caseViews: string;
  views: string;
  kspAssistant: string;
  online: string;
  systemInsightTitle: string;
  systemInsightText: string;
  openKspAssistant: string;

  // Simulation Banner
  simulatedDemoMode: string;
  simulatedDemoSub: string;
  streamTicks: string;
  queriesPerSec: string;
  incidentsStreamed: string;

  // Views & Roles
  roles: {
    ADMIN: { title: string; subtitle: string; identity: string };
    INVESTIGATOR: { title: string; subtitle: string; identity: string };
    ANALYST: { title: string; subtitle: string; identity: string };
    SUPERVISOR: { title: string; subtitle: string; identity: string };
    POLICYMAKER: { title: string; subtitle: string; identity: string };
  };

  viewNames: Record<string, string>;

  // Download & White Sheet Report Translations
  whiteSheet: {
    downloadReport: string;
    downloadPdf: string;
    exportCsv: string;
    whiteSheetHeader: string;
    officialDocument: string;
    confidential: string;
    refNo: string;
    generatedOn: string;
    authorizedOfficer: string;
    signatureBlock: string;
    sealText: string;
    summaryMetrics: string;
    detailedBreakdown: string;
    aiIntelligenceSummary: string;
    kspWatermarkNotice: string;
  };
}

const TRANSLATIONS: Record<Language, Translations> = {
  en: {
    agencyName: 'KARNATAKA STATE POLICE',
    agencySubtitle: 'Intelligence Platform',
    mottoTop: 'SAFER KARNATAKA',
    mottoBottom: 'STRONGER TOMORROW',
    heroTagline: 'Namma KSP • Intelligence Platform',

    welcomeBack: 'Welcome Back',
    signInSubtitle: 'Sign in to continue to Namma KSP',
    usernamePlaceholder: 'Username / Employee ID',
    passwordPlaceholder: 'Password',
    roleSelectAria: 'Role or module selector',
    rememberMe: 'Remember me',
    forgotPassword: 'Forgot Password?',
    signIn: 'SIGN IN',
    authenticating: 'AUTHENTICATING...',
    verifyingAccess: 'VERIFYING ACCESS...',
    accessGranted: 'ACCESS GRANTED',
    orDivider: 'OR',
    secureLogin: 'Secure Login with KSP Network',
    unauthorizedWarning: 'Unauthorized access is a punishable offense',

    systemOnline: 'SYSTEM ONLINE',
    platformTitle: 'Karnataka State Police Intelligence Platform',
    lastUpdated: 'Last updated: 09:42 AM',

    nammaKsp: 'NAMMA KSP',
    kspHq: 'KSP HQ',
    live: '🟢 LIVE',
    paused: 'PAUSED',
    officer: 'Officer',
    stateAdmin: 'ADM-004 • KSP State Admin',
    logout: 'Logout',
    switchToLight: 'Switch to Light Mode',
    switchToDark: 'Switch to Dark Mode',

    hideSidebar: 'HIDE SIDEBAR',
    showSidebar: 'SHOW SIDEBAR',
    caseViews: 'CASE VIEWS',
    views: 'VIEWS',
    kspAssistant: 'KSP ASSISTANT',
    online: 'ONLINE',
    systemInsightTitle: '💡 System Insight:',
    systemInsightText: '3 pattern matches found in Mysuru & Bengaluru today.',
    openKspAssistant: 'OPEN KSP ASSISTANT',

    simulatedDemoMode: 'SIMULATED LIVE DEMO MODE — FRONTEND ONLY',
    simulatedDemoSub: 'No Catalyst/External APIs connected. Mock data layer architecture active.',
    streamTicks: 'Stream Ticks:',
    queriesPerSec: 'Queries/sec:',
    incidentsStreamed: 'Incidents Streamed:',

    roles: {
      ADMIN: {
        title: 'ADMIN',
        subtitle: 'System Administration & Security Audits',
        identity: 'THE COMMAND CENTER'
      },
      INVESTIGATOR: {
        title: 'INVESTIGATOR',
        subtitle: 'View active cases, suspects, and crime reports',
        identity: 'CASE DESK'
      },
      ANALYST: {
        title: 'ANALYST',
        subtitle: 'Discover patterns behind numbers across districts and time',
        identity: 'OBSERVATORY'
      },
      SUPERVISOR: {
        title: 'SUPERVISOR',
        subtitle: 'Investigation Progress, Workload & Team Bottlenecks',
        identity: 'THE OPERATIONS BOARD'
      },
      POLICYMAKER: {
        title: 'POLICYMAKER',
        subtitle: 'Strategic Macro Trends, District Benchmarks & Prevention',
        identity: 'THE STATE INTELLIGENCE VIEW'
      }
    },

    viewNames: {
      'Overview': 'Overview',
      'User Management': 'User Management',
      'Security Audit': 'Security Audit',
      'System Health': 'System Health',
      'AI Usage': 'AI Usage',
      'My Cases': 'My Cases',
      'FIR Search': 'FIR Search',
      'Suspect Networks': 'Suspect Networks',
      'Similar Crime Methods': 'Similar Crime Methods',
      'Case Leads': 'Case Leads',
      'Case Timeline': 'Case Timeline',
      'Crime Trends': 'Crime Trends',
      'Hotspots': 'Hotspots',
      'Demographics': 'Demographics',
      'Network Analysis': 'Network Analysis',
      'Workload Matrix': 'Workload Matrix',
      'Station Performance': 'Station Performance',
      'Aging Cases': 'Aging Cases',
      'Case Delay Tracker': 'Case Delay Tracker',
      'Officer Review': 'Officer Review',
      'State Overview': 'State Overview',
      'District Comparison': 'District Comparison',
      'Seasonal Patterns': 'Seasonal Patterns',
      'Resource Priorities': 'Resource Priorities',
      'Prevention Intelligence': 'Prevention Intelligence',
      'Demographic Insights': 'Demographic Insights'
    },

    whiteSheet: {
      downloadReport: 'Download White Sheet Report',
      downloadPdf: 'Print / Save PDF Report',
      exportCsv: 'Export CSV Spreadsheet',
      whiteSheetHeader: 'KARNATAKA STATE POLICE • OFFICIAL WHITE SHEET REPORT',
      officialDocument: 'GOVERNMENT OF KARNATAKA OFFICIAL RECORD',
      confidential: 'CONFIDENTIAL',
      refNo: 'DOCUMENT REF NO:',
      generatedOn: 'GENERATED ON:',
      authorizedOfficer: 'ISSUED BY OFFICERS:',
      signatureBlock: 'DIRECTOR GENERAL & INSPECTOR GENERAL OF POLICE, KARNATAKA STATE',
      sealText: 'OFFICIAL KSP SEAL & EMBLEM',
      summaryMetrics: 'EXECUTIVE SUMMARY & CORE METRICS',
      detailedBreakdown: 'DETAILED OPERATIONAL BREAKDOWN TABLE',
      aiIntelligenceSummary: 'POLICE HEADQUARTERS DIRECTIVES & SPECIAL ACTION ITEMS',
      kspWatermarkNotice: 'PROPRIETARY KSP EMBLEM • STRICTLY FOR AUTHORIZED LAW ENFORCEMENT USE ONLY'
    }
  },

  kn: {
    agencyName: 'ಕರ್ನಾಟಕ ರಾಜ್ಯ ಪೊಲೀಸ್',
    agencySubtitle: 'ಬುದ್ಧಿಮತ್ತೆ ವೇದಿಕೆ',
    mottoTop: 'ಸುರಕ್ಷಿತ ಕರ್ನಾಟಕ',
    mottoBottom: 'ಬಲವಾದ ನಾಳೆ',
    heroTagline: 'ನಮ್ಮ KSP • ಬುದ್ಧಿಮತ್ತೆ ವೇದಿಕೆ',

    welcomeBack: 'ಮತ್ತೆ ಸ್ವಾಗತ',
    signInSubtitle: 'ನಮ್ಮ KSP ಗೆ ಮುಂದುವರೆಯಲು ಸೈನ್ ಇನ್ ಮಾಡಿ',
    usernamePlaceholder: 'ಬಳಕೆದಾರರ ಹೆಸರು / ಉದ್ಯೋಗಿ ಐಡಿ',
    passwordPlaceholder: 'ಪಾಸ್‌ವರ್ಡ್',
    roleSelectAria: 'ಪಾತ್ರ ಅಥವಾ ಮಾಡ್ಯೂಲ್ ಆಯ್ಕೆ',
    rememberMe: 'ನನ್ನನ್ನು ನೆನಪಿಡಿ',
    forgotPassword: 'ಪಾಸ್‌ವರ್ಡ್ ಮರೆತಿದ್ದೀರಾ?',
    signIn: 'ಸೈನ್ ಇನ್',
    authenticating: 'ದೃಢೀಕರಿಸಲಾಗುತ್ತಿದೆ...',
    verifyingAccess: 'ಪ್ರವೇಶವನ್ನು ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ...',
    accessGranted: 'ಪ್ರವೇಶವನ್ನು ಅನುಮೋದಿಸಲಾಗಿದೆ',
    orDivider: 'ಅಥವಾ',
    secureLogin: 'KSP ನೆಟ್‌ವರ್ಕ್‌ನೊಂದಿಗೆ ಸುರಕ್ಷಿತ ಲಾಗಿನ್',
    unauthorizedWarning: 'ಅನಧಿಕೃತ ಪ್ರವೇಶವು ಶಿಕ್ಷಾರ್ಹ ಅಪರಾಧವಾಗಿದೆ',

    systemOnline: 'ಸಿಸ್ಟಮ್ ಆನ್‌ಲೈನ್‌ನಲ್ಲಿದೆ',
    platformTitle: 'ಕರ್ನಾಟಕ ರಾಜ್ಯ ಪೊಲೀಸ್ ಬುದ್ಧಿಮತ್ತೆ ವೇದಿಕೆ',
    lastUpdated: 'ಕೊನೆಯದಾಗಿ ನವೀಕರಿಸಲಾಗಿದೆ: 09:42 AM',

    nammaKsp: 'ನಮ್ಮ KSP',
    kspHq: 'KSP ಪ್ರಧಾನ ಕಛೇರಿ',
    live: '🟢 ಲೈವ್',
    paused: 'ವಿರಾಮಗೊಳಿಸಲಾಗಿದೆ',
    officer: 'ಅಧಿಕಾರಿ',
    stateAdmin: 'ADM-004 • KSP ರಾಜ್ಯ ಆಡಳಿತಾಧಿಕಾರಿ',
    logout: 'ನಿರ್ಗಮಿಸಿ',
    switchToLight: 'ಬೆಳಕಿನ ಮೋಡ್‌ಗೆ ಬದಲಾಯಿಸಿ',
    switchToDark: 'ಡಾರ್ಕ್ ಮೋಡ್‌ಗೆ ಬದಲಾಯಿಸಿ',

    hideSidebar: 'ಸೈಡ್‌ಬಾರ್ ಮರೆಸಿ',
    showSidebar: 'ಸೈಡ್‌ಬಾರ್ ತೋರಿಸಿ',
    caseViews: 'ಪ್ರಕರಣದ ನೋಟಗಳು',
    views: 'ನೋಟಗಳು',
    kspAssistant: 'KSP ಸಹಾಯಕ',
    online: 'ಆನ್‌ಲೈನ್',
    systemInsightTitle: '💡 ಸಿಸ್ಟಮ್ ಒಳನೋಟ:',
    systemInsightText: 'ಮೈಸೂರು ಮತ್ತು ಬೆಂಗಳೂರಿನಲ್ಲಿ ಇಂದು 3 ಮಾದರಿ ಹೋಲಿಕೆಗಳು ಕಂಡುಬಂದಿವೆ.',
    openKspAssistant: 'KSP ಸಹಾಯಕ ತೆರೆಯಿರಿ',

    simulatedDemoMode: 'ಸಿಮ್ಯುಲೇಟೆಡ್ ಲೈವ್ ಡೆಮೊ ಮೋಡ್ — ಫ್ರಂಟ್‌ಎಂಡ್ ಮಾತ್ರ',
    simulatedDemoSub: 'ಬಾಹ್ಯ API ಗಳು ಸಂಪರ್ಕಗೊಂಡಿಲ್ಲ. ಮಾಕ್ ಡೇಟಾ ಲೇಯರ್ ಸಕ್ರಿಯವಾಗಿದೆ.',
    streamTicks: 'ಸ್ಟ್ರೀಮ್ ಟಿಕ್‌ಗಳು:',
    queriesPerSec: 'ಪ್ರಶ್ನೆಗಳು/ಸೆಕೆಂಡ್:',
    incidentsStreamed: 'ಪ್ರಸಾರವಾದ ಘಟನೆಗಳು:',

    roles: {
      ADMIN: {
        title: 'ಆಡಳಿತಾಧಿಕಾರಿ (ADMIN)',
        subtitle: 'ಸಿಸ್ಟಮ್ ಆಡಳಿತ ಮತ್ತು ಭದ್ರತಾ ಪರಿಶೋಧನೆಗಳು',
        identity: 'ಕಮಾಂಡ್ ಸೆಂಟರ್'
      },
      INVESTIGATOR: {
        title: 'ತನಿಖಾಧಿಕಾರಿ (INVESTIGATOR)',
        subtitle: 'ಸಕ್ರಿಯ ಪ್ರಕರಣಗಳು, ಶಂಕಿತರು ಮತ್ತು ಅಪರಾಧ ವರದಿಗಳನ್ನು ವೀಕ್ಷಿಸಿ',
        identity: 'ತನಿಖಾ ವಿಭಾಗ'
      },
      ANALYST: {
        title: 'ವಿಶ್ಲೇಷಕರು (ANALYST)',
        subtitle: 'ಜಿಲ್ಲೆಗಳು ಮತ್ತು ಸಮಯದಾದ್ಯಂತ ಅಂಕಿಅಂಶಗಳ ಮಾದರಿಗಳನ್ನು ಕಂಡುಕೊಳ್ಳಿ',
        identity: 'ವಿಶ್ಲೇಷಣಾ ವಿಭಾಗ'
      },
      SUPERVISOR: {
        title: 'ಮೇಲ್ವಿಚಾರಕರು (SUPERVISOR)',
        subtitle: 'ತನಿಖೆಯ ಪ್ರಗತಿ, ಕೆಲಸದ ಹೊರೆ ಮತ್ತು ತಂಡದ ಕಾರ್ಯಕ್ಷಮತೆ',
        identity: 'ಕಾರ್ಯಾಚರಣೆಗಳ ಮಂಡಳಿ'
      },
      POLICYMAKER: {
        title: 'ನೀತಿ ನಿರೂಪಕರು (POLICYMAKER)',
        subtitle: 'ಕಾರ್ಯತಂತ್ರದ ಪ್ರವೃತ್ತಿಗಳು, ಜಿಲ್ಲಾ ಮಾನದಂಡಗಳು ಮತ್ತು ತಡೆಗಟ್ಟುವಿಕೆ',
        identity: 'ರಾಜ್ಯ ಬುದ್ಧಿಮತ್ತೆ ನೋಟ'
      }
    },

    viewNames: {
      'Overview': 'ಅವಲೋಕನ',
      'User Management': 'ಬಳಕೆದಾರರ ನಿರ್ವಹಣೆ',
      'Security Audit': 'ಭದ್ರತಾ ಪರಿಶೋಧನೆ',
      'System Health': 'ಸಿಸ್ಟಮ್ ಆರೋಗ್ಯ',
      'AI Usage': 'AI ಬಳಕೆ',
      'My Cases': 'ನನ್ನ ಪ್ರಕರಣಗಳು',
      'FIR Search': 'ಎಫ್‌ಐಆರ್ ಹುಡುಕಾಟ',
      'Suspect Networks': 'ಶಂಕಿತರ ಜಾಲಗಳು',
      'Similar Crime Methods': 'ಇಂತಹುದೇ ಅಪರಾಧ ವಿಧಾನಗಳು',
      'Case Leads': 'ಪ್ರಕರಣದ ಸುಳಿವುಗಳು',
      'Case Timeline': 'ಪ್ರಕರಣದ ಕಾಲಾವಧಿ',
      'Crime Trends': 'ಅಪರಾಧ ಪ್ರವೃತ್ತಿಗಳು',
      'Hotspots': 'ಹಾಟ್‌ಸ್ಪಾಟ್‌ಗಳು (ಸಂವೇದನಶೀಲ ಪ್ರದೇಶಗಳು)',
      'Demographics': 'ಜನಸಂಖ್ಯಾಶಾಸ್ತ್ರ',
      'Network Analysis': 'ನೆಟ್‌ವರ್ಕ್ ವಿಶ್ಲೇಷಣೆ',
      'Workload Matrix': 'ಕೆಲಸದ ಹೊರೆ ಮ್ಯಾಟ್ರಿಕ್ಸ್',
      'Station Performance': 'ಠಾಣೆ ಕಾರ್ಯಕ್ಷಮತೆ',
      'Aging Cases': 'ಬಾಕಿ ಉಳಿದ ಪ್ರಕರಣಗಳು',
      'Case Delay Tracker': 'ಪ್ರಕರಣ ವಿಳಂಬ ಟ್ರ್ಯಾಕರ್',
      'Officer Review': 'ಅಧಿಕಾರಿ ಪರಿಶೀಲನೆ',
      'State Overview': 'ರಾಜ್ಯದ ಅವಲೋಕನ',
      'District Comparison': 'ಜಿಲ್ಲಾ ಹೋಲಿಕೆ',
      'Seasonal Patterns': 'ಋತುಮಾನದ ಮಾದರಿಗಳು',
      'Resource Priorities': 'ಸಂಪನ್ಮೂಲ ಆದ್ಯತೆಗಳು',
      'Prevention Intelligence': 'ತಡೆಗಟ್ಟುವ ಬುದ್ಧಿಮತ್ತೆ',
      'Demographic Insights': 'ಜನಸಂಖ್ಯಾ ಒಳನೋಟಗಳು'
    },

    whiteSheet: {
      downloadReport: 'ವೈಟ್ ಶೀಟ್ ವರದಿ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ',
      downloadPdf: 'ಮುದ್ರಿಸಿ / PDF ವರದಿ ಉಳಿಸಿ',
      exportCsv: 'CSV ಸ್ಪ್ರೆಡ್‌ಶೀಟ್ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ',
      whiteSheetHeader: 'ಕರ್ನಾಟಕ ರಾಜ್ಯ ಪೊಲೀಸ್ • ಅಧಿಕೃತ ವೈಟ್ ಶೀಟ್ ವರದಿ',
      officialDocument: 'ಕರ್ನಾಟಕ ಸರ್ಕಾರದ ಅಧಿಕೃತ ಸಾರ್ವಜನಿಕ ದಾಖಲೆ',
      confidential: 'ರಹಸ್ಯ (CONFIDENTIAL)',
      refNo: 'ದಾಖಲೆ ಸಂಖ್ಯೆ:',
      generatedOn: 'ರಚಿಸಿದ ದಿನಾಂಕ:',
      authorizedOfficer: 'ವಿಲೇವಾರಿ ಮಾಡಿದ ಅಧಿಕಾರಿಗಳು:',
      signatureBlock: 'ಮಹಾನಿರ್ದೇಶಕರು ಮತ್ತು ಆರಕ್ಷಕ ಮಹಾನಿರೀಕ್ಷಕರು, ಕರ್ನಾಟಕ ರಾಜ್ಯ',
      sealText: 'ಕರ್ನಾಟಕ ರಾಜ್ಯ ಪೊಲೀಸ್ ಅಧಿಕೃತ ಮುದ್ರೆ ಹಾಗೂ ಲಾಂಛನ',
      summaryMetrics: 'ಕಾರ್ಯನಿರ್ವಾಹಕ ಸಾರಾಂಶ ಮತ್ತು ಪ್ರಮುಖ ಅಂಕಿಅಂಶಗಳು',
      detailedBreakdown: 'ವಿವರವಾದ ಕಾರ್ಯಾಚರಣೆಯ ಕೋಷ್ಟಕ ವಿವರಣೆ',
      aiIntelligenceSummary: 'KSP AI ಬುದ್ಧಿಮತ್ತೆ ವಿಶ್ಲೇಷಣೆ ಹಾಗೂ ಶಿಫಾರಸುಗಳು',
      kspWatermarkNotice: 'ಕರ್ನಾಟಕ ರಾಜ್ಯ ಪೊಲೀಸ್ ಲಾಂಛನ • ಅಧಿಕೃತ ಕಾನೂನು ಜಾರಿ ಬಳಕೆಗೆ ಮಾತ್ರ'
    }
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, fallback?: string) => string;
  translations: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'namma_ksp_language';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved === 'kn' || saved === 'en') ? saved : 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'kn' : 'en');
  };

  const t = (key: string, fallback?: string): string => {
    const keys = key.split('.');
    let current: any = TRANSLATIONS[language];
    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        // Fallback to English if missing in current language
        let fallbackVal: any = TRANSLATIONS['en'];
        for (const fk of keys) {
          if (fallbackVal && typeof fallbackVal === 'object' && fk in fallbackVal) {
            fallbackVal = fallbackVal[fk];
          } else {
            return fallback || key;
          }
        }
        return typeof fallbackVal === 'string' ? fallbackVal : (fallback || key);
      }
    }
    return typeof current === 'string' ? current : (fallback || key);
  };

  const currentTranslations = TRANSLATIONS[language];

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t,
        translations: currentTranslations
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
};
