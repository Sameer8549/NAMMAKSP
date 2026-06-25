/**
 * app.js — NAMMA KSP
 * ─────────────────────
 * Full backend-wired application logic.
 * Every page calls the FastAPI server at API_BASE.
 */

// TTS is handled server-side via gTTS (/api/tts) — no browser voice packs needed

// ─── Config ───────────────────────────────────────────────────────────────────
const LOCAL_API_BASE = 'http://127.0.0.1:8000';
const CATALYST_APPSAIL_BASE = 'https://namma-ksp-50043229029.development.catalystappsail.in';
const API_BASE = (window.location.protocol === 'file:' || ['127.0.0.1', 'localhost'].includes(window.location.hostname))
  ? LOCAL_API_BASE
  : (window.location.hostname.endsWith('catalystappsail.in') ? window.location.origin : CATALYST_APPSAIL_BASE);

// ─── Bilingual Translation Engine ─────────────────────────────────────────────
const TRANSLATIONS = {
  // Brand & Navigation
  "Dashboard": "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
  "AI Chat": "AI ಚಾಟ್",
  "Network Analysis": "ನೆಟ್‌ವರ್ಕ್ ವಿಶ್ಲೇಷಣೆ",
  "Crime Heatmap": "ಅಪರಾಧ ಹೀಟ್‌ಮ್ಯಾಪ್",
  "Offender Profiles": "ಅಪರಾಧಿಗಳ ಪ್ರೊಫೈಲ್",
  "Reports": "ವರದಿಗಳು",
  "User Management": "ಬಳಕೆದಾರರ ನಿರ್ವಹಣೆ",
  "Logout": "ನಿರ್ಗಮಿಸಿ",
  "Navigation": "ನ್ಯಾವಿಗೇಷನ್",
  "NAMMA KSP": "ನಮ್ಮ KSP",
  "Karnataka State Police": "ಕರ್ನಾಟಕ ರಾಜ್ಯ ಪೊಲೀಸ್",

  // Common UI Actions
  "Refresh": "ಮರುಲೋಡ್ ಮಾಡಿ",
  "Generate Report": "ವರದಿ ರಚಿಸಿ",
  "View All": "ಎಲ್ಲವನ್ನೂ ವೀಕ್ಷಿಸಿ",
  "View Heatmap": "ಹೀಟ್‌ಮ್ಯಾಪ್ ವೀಕ್ಷಿಸಿ",
  "Download": "ಡೌನ್‌ಲೋಡ್",
  "Ready": "ಸಿದ್ಧವಾಗಿದೆ",
  "Status": "ಸ್ಥಿತಿ",
  "Action": "ಕ್ರಿಯೆ",
  "View": "ವೀಕ್ಷಿಸಿ",
  "Open": "ಮುಕ್ತವಾಗಿದೆ",
  "Closed": "ಮುಕ್ತಾಯಗೊಂಡಿದೆ",
  "Under Investigation": "ತನಿಖೆಯಲ್ಲಿದೆ",

  // Dashboard KPIs & Chart Titles
  "Intelligence Dashboard": "ಬುದ್ಧಿಮತ್ತೆ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
  "Overview — Karnataka State": "ಅವಲೋಕನ — ಕರ್ನಾಟಕ ರಾಜ್ಯ",
  "Total FIRs": "ಒಟ್ಟು ಎಫ್‌ಐಆರ್‌ಗಳು",
  "Active Cases": "ಸಕ್ರಿಯ ಪ್ರಕರಣಗಳು",
  "Repeat Offenders": "ಮರು ಅಪರಾಧಿಗಳು",
  "Active Districts": "ಸಕ್ರಿಯ ಜಿಲ್ಲೆಗಳು",
  "All districts monitored": "ಎಲ್ಲಾ ಜಿಲ್ಲೆಗಳ ಮೇಲ್ವಿಚಾರಣೆ",
  "Crime Trends — Last 12 Months": "ಅಪರಾಧ ಪ್ರವೃತ್ತಿಗಳು — ಕಳೆದ 12 ತಿಂಗಳುಗಳು",
  "FIRs registered": "ನೋಂದಾಯಿತ ಎಫ್‌ಐಆರ್‌ಗಳು",
  "Crime Type Distribution": "ಅಪರಾಧ ಪ್ರಕಾರದ ವಿತರಣೆ",
  "All districts": "ಎಲ್ಲಾ ಜಿಲ್ಲೆಗಳು",
  "Recent FIRs": "ಇತ್ತೀಚಿನ ಎಫ್‌ಐಆರ್‌ಗಳು",
  "District Overview — Karnataka": "ಜಿಲ್ಲಾ ಅವಲೋಕನ — ಕರ್ನಾಟಕ",
  "FIR ID": "ಎಫ್‌ಐಆರ್ ಐಡಿ",
  "Crime Type": "ಅಪರಾಧ ಪ್ರಕಾರ",
  "District": "ಜಿಲ್ಲೆ",
  "Date": "ದಿನಾಂಕ",
  "Accused": "ಆರೋಪಿ",

  // Heatmap Page
  "Crime Heatmap & Analytics": "ಅಪರಾಧ ಹೀಟ್‌ಮ್ಯಾಪ್ ಮತ್ತು ವಿಶ್ಲೇಷಣೆ",
  "Real-time geographic density & crime hotspots": "ನೈಜ-ಸಮಯದ ಭೌಗೋಳಿಕ ಸಾಂದ್ರತೆ ಮತ್ತು ಅಪರಾಧದ ಹಾಟ್‌ಸ್ಪಾಟ್‌ಗಳು",
  "Search District...": "ಜಿಲ್ಲೆಯನ್ನು ಹುಡುಕಿ...",
  "All Crime Types": "ಎಲ್ಲಾ ಅಪರಾಧ ಪ್ರಕಾರಗಳು",
  "Patrol Window:": "ಗಸ್ತು ಸಮಯ:",
  "Top Crime Type:": "ಪ್ರಮುಖ ಅಪರಾಧ ಪ್ರಕಾರ:",
  "Est. Hotspots:": "ಅಂದಾಜು ಹಾಟ್‌ಸ್ಪಾಟ್‌ಗಳು:",
  "Threat Level:": "ಬೆದರಿಕೆ ಮಟ್ಟ:",
  "Risk Assessment & Patrol Guidance": "ಅಪಾಯದ ಮೌಲ್ಯಮಾಪನ ಮತ್ತು ಗಸ್ತು ಮಾರ್ಗದರ್ಶನ",
  "Strategic Guidance:": "ಕಾರ್ಯತಂತ್ರದ ಮಾರ್ಗದರ್ಶನ:",
  "crimes across all districts": "ಎಲ್ಲಾ ಜಿಲ್ಲೆಗಳ ಒಟ್ಟು ಅಪರಾಧಗಳು",
  "crimes in selected district": "ಆಯ್ದ ಜಿಲ್ಲೆಯ ಅಪರಾಧಗಳು",
  "Total Karnataka": "ಒಟ್ಟು ಕರ್ನಾಟಕ",
  "Intensity Filter": "ತೀವ್ರತೆ ಫಿಲ್ಟರ್",
  "Show All": "ಎಲ್ಲವನ್ನೂ ತೋರಿಸು",

  // Network Page
  "Criminal Network Graph": "ಅಪರಾಧ ನೆಟ್‌ವರ್ಕ್ ಗ್ರಾಫ್",
  "Interactive association map of offenders, victims, and FIRs": "ಅಪರಾಧಿಗಳು, ಬಲಿಪಶುಗಳು ಮತ್ತು ಎಫ್‌ಐಆರ್‌ಗಳ ಪರಸ್ಪರ ಸಂಬಂಧದ ನಕ್ಷೆ",
  "Search Entity...": "ಹುಡುಕಿ...",
  "Highlight Connections": "ಸಂಪರ್ಕಗಳನ್ನು ಹೈಲೈಟ್ ಮಾಡಿ",
  "Layout": "ವಿನ್ಯಾಸ",
  "Force": "ಫೋರ್ಸ್",
  "Circle": "ವೃತ್ತಾಕಾರ",
  "Grid": "ಗ್ರಿಡ್",
  "Breadthfirst": "ಟ್ರೀ",
  "Total Nodes": "ಒಟ್ಟು ನೋಡ್‌ಗಳು",
  "Total Edges": "ಒಟ್ಟು ಅಂಚುಗಳು",
  "High-Risk": "ಹೆಚ್ಚಿನ ಅಪಾಯ",
  "Most Connected": "ಹೆಚ್ಚು ಸಂಪರ್ಕಿತ",
  "Criminal Network Analysis": "ಅಪರಾಧ ಜಾಲದ ವಿಶ್ಲೇಷಣೆ",
  "Double click nodes to focus. Drag to reposition. Hover edges for relationship info.": "ಕೇಂದ್ರೀಕರಿಸಲು ನೋಡ್‌ಗಳನ್ನು ಡಬಲ್ ಕ್ಲಿಕ್ ಮಾಡಿ. ಮರುಸ್ಥಾಪಿಸಲು ಎಳೆಯಿರಿ. ಸಂಬಂಧದ ಮಾಹಿತಿಗಾಗಿ ಮೌಸ್ ಅನ್ನು ಅಂಚುಗಳ ಮೇಲಕ್ಕೆ ತನ್ನಿ.",

  // Offenders Page
  "Offender Profiles & Risk Intelligence": "ಅಪರಾಧಿಗಳ ಪ್ರೊಫೈಲ್ ಮತ್ತು ಅಪಾಯದ ಬುದ್ಧಿಮತ್ತೆ",
  "Comprehensive database and AI recidivism risk assessment": "ಸಮಗ್ರ ಡೇಟಾಬೇಸ್ ಮತ್ತು ಎಐ ಪುನರಾವರ್ತಿತ ಅಪಾಯದ ಮೌಲ್ಯಮಾಪನ",
  "Search Offender...": "ಅಪರಾಧಿಯನ್ನು ಹುಡುಕಿ...",
  "Identity": "ಗುರುತು",
  "Risk Category": "ಅಪಾಯದ ವರ್ಗ",
  "Previous FIRs": "ಹಿಂದಿನ ಎಫ್‌ಐಆರ್‌ಗಳು",
  "Primary Crime": "ಪ್ರಾಥಮಿಕ ಅಪರಾಧ",
  "Active Cases": "ಸಕ್ರಿಯ ಪ್ರಕರಣಗಳು",
  "Timeline": "ಟೈಮ್‌ಲೈನ್",
  "Table": "ಕೋಷ್ಟಕ",
  "Radar Assessment": "ರಾಡಾರ್ ಮೌಲ್ಯಮಾಪನ",

  // Reports Page
  "Investigation Reports": "ತನಿಖಾ ವರದಿಗಳು",
  "Intelligence summaries, offender profiles, and crime analysis reports": "ಬುದ್ಧಿಮತ್ತೆ ಸಾರಾಂಶಗಳು, ಅಪರಾಧಿಗಳ ಪ್ರೊಫೈಲ್‌ಗಳು ಮತ್ತು ಅಪರಾಧ ವಿಶ್ಲೇಷಣೆ ವರದಿಗಳು",
  "Case Investigation Report": "ಪ್ರಕರಣದ ತನಿಖಾ ವರದಿ",
  "District Crime Report": "ಜಿಲ್ಲಾ ಅಪರಾಧ ವರದಿ",
  "AI Recommendations Report": "AI ಶಿಫಾರಸುಗಳ ವರದಿ",
  "Download Report": "ವರದಿ ಡೌನ್‌ಲೋಡ್",
  "Generated Report Archive": "ರಚಿಸಲಾದ ವರದಿಗಳ ಆರ್ಕೈವ್",
  "Priority": "ಆದ್ಯತೆ",
  "Notes": "ಟಿಪ್ಪಣಿಗಳು",
  "Generate Intelligence Report": "ಬುದ್ಧಿಮತ್ತೆ ವರದಿ ರಚಿಸಿ",
  "Standard": "ಸಾಮಾನ್ಯ",
  "Urgent": "ತುರ್ತು",
  "Classified": "ವರ್ಗೀಕರಿಸಲಾಗಿದೆ",
  "No reports generated yet. Use “Generate New Report” to create one.": "ಯಾವುದೇ ವರದಿಗಳು ಇನ್ನೂ ರಚನೆಯಾಗಿಲ್ಲ. ಹೊಸ ವರದಿಯನ್ನು ರಚಿಸಲು \"ಬುದ್ಧಿಮತ್ತೆ ವರದಿ ರಚಿಸಿ\" ಬಳಸಿ.",

  // Users Page
  "User Management Portal": "ಬಳಕೆದಾರ ನಿರ್ವಹಣಾ ಪೋರ್ಟಲ್",
  "Manage system access, roles, and investigator accounts": "ಸಿಸ್ಟಮ್ ಪ್ರವೇಶ, ಪಾತ್ರಗಳು ಮತ್ತು ತನಿಖಾಧಿಕಾರಿ ಖಾತೆಗಳನ್ನು ನಿರ್ವಹಿಸಿ",
  "Create User": "ಬಳಕೆದಾರರನ್ನು ರಚಿಸಿ",
  "Username": "ಬಳಕೆದಾರ ಹೆಸರು",
  "Role": "ಪಾತ್ರ",
  "Email": "ಇಮೇಲ್",
  "Password": "ಪಾಸ್‌ವರ್ಡ್",
  "Admin": "ನಿರ್ವಾಹಕರು",
  "Investigator": "ತನಿಖಾಧಿಕಾರಿ",
  "Active Users": "ಸಕ್ರಿಯ ಬಳಕೆದಾರರು",

  // Chat Page
  "AI Chat Assistant": "AI ಚಾಟ್ ಸಹಾಯಕ",
  "Crime intelligence analysis & report drafting assistant": "ಅಪರಾಧ ಬುದ್ಧಿಮತ್ತೆ ವಿಶ್ಲೇಷಣೆ ಮತ್ತು ವರದಿ ಡ್ರಾಫ್ಟಿಂಗ್ ಸಹಾಯಕ",
  "Ask anything...": "ಏನನ್ನಾದರೂ ಕೇಳಿ...",
  "Send": "ಕಳುಹಿಸಿ",
  "Clear Chat": "ಚಾಟ್ ತೆರವುಗೊಳಿಸಿ",
  "Export PDF": "PDF ರಫ್ತು ಮಾಡಿ",
  "Chat Bookmarks": "ಚಾಟ್ ಬುಕ್‌ಮಾರ್ಕ್‌ಗಳು"
};

function translatePageUI() {
  const lang = localStorage.getItem('cl_lang') || 'en';
  
  // Update header language button if present
  const headerBtn = document.getElementById('header-lang-toggle');
  if (headerBtn) {
    headerBtn.textContent = lang === 'en' ? 'ಕನ್ನಡ' : 'English';
  }

  const walk = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const trimmed = node.nodeValue.trim();
      if (!trimmed) return;
      
      if (lang === 'kn') {
        if (TRANSLATIONS[trimmed]) {
          if (node.parentElement && node.parentElement.dataset.origText === undefined) {
            node.parentElement.dataset.origText = node.nodeValue;
          }
          node.nodeValue = node.nodeValue.replace(trimmed, TRANSLATIONS[trimmed]);
        }
      } else {
        // Restoring English
        if (node.parentElement && node.parentElement.dataset.origText !== undefined) {
          const origRaw = node.parentElement.dataset.origText;
          const origTrimmed = origRaw.trim();
          const expectedTranslation = TRANSLATIONS[origTrimmed];
          
          if (expectedTranslation && trimmed === expectedTranslation) {
            node.nodeValue = origRaw;
          } else {
            // API has updated the element, discard stale cache
            delete node.parentElement.dataset.origText;
          }
        }
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = node.tagName.toLowerCase();
      if (tag !== 'script' && tag !== 'style' && tag !== 'svg') {
        node.childNodes.forEach(walk);
      }
    }
  };
  
  document.body.childNodes.forEach(walk);

  // Translate placeholders
  document.querySelectorAll('[placeholder]').forEach(el => {
    const ph = el.getAttribute('placeholder').trim();
    if (lang === 'kn') {
      if (TRANSLATIONS[ph]) {
        if (!el.dataset.origPlaceholder) {
          el.dataset.origPlaceholder = ph;
        }
        el.setAttribute('placeholder', TRANSLATIONS[ph]);
      }
    } else {
      if (el.dataset.origPlaceholder !== undefined) {
        const origPh = el.dataset.origPlaceholder;
        if (TRANSLATIONS[origPh] && ph === TRANSLATIONS[origPh]) {
          el.setAttribute('placeholder', origPh);
        } else {
          delete el.dataset.origPlaceholder;
        }
      }
    }
  });

  // Translate options
  document.querySelectorAll('option').forEach(el => {
    const txt = el.textContent.trim();
    if (lang === 'kn') {
      if (TRANSLATIONS[txt]) {
        if (!el.dataset.origText) {
          el.dataset.origText = el.textContent;
        }
        el.textContent = TRANSLATIONS[txt];
      }
    } else {
      if (el.dataset.origText !== undefined) {
        const origTrimmed = el.dataset.origText.trim();
        if (TRANSLATIONS[origTrimmed] && txt === TRANSLATIONS[origTrimmed]) {
          el.textContent = el.dataset.origText;
        } else {
          delete el.dataset.origText;
        }
      }
    }
  });
}

function injectHeaderLanguageToggle() {
  const headerRight = document.querySelector('.header-right');
  if (!headerRight || document.getElementById('header-lang-toggle')) return;

  const savedLang = localStorage.getItem('cl_lang') || 'en';
  
  const btn = document.createElement('button');
  btn.id = 'header-lang-toggle';
  btn.style.cssText = `
    display: inline-flex;
    align-items: center;
    font-size: 11px;
    font-weight: 600;
    padding: 5px 12px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 20px;
    margin-left: 10px;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.12);
    color: #FFFFFF !important;
    transition: all 0.2s ease;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    box-shadow: none;
    user-select: none;
    pointer-events: auto !important;
    position: relative;
    z-index: 1000;
  `;
  
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("width", "13");
  icon.setAttribute("height", "13");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("fill", "none");
  icon.setAttribute("stroke", "currentColor");
  icon.setAttribute("stroke-width", "2.5");
  icon.style.marginRight = "6px";
  icon.style.verticalAlign = "middle";
  icon.innerHTML = `
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  `;
  
  const textNode = document.createTextNode(savedLang === 'en' ? 'ಕನ್ನಡ' : 'English');
  btn.appendChild(icon);
  btn.appendChild(textNode);
  
  btn.addEventListener('mouseenter', () => {
    btn.style.background = 'rgba(255, 255, 255, 0.22)';
    btn.style.borderColor = 'rgba(255, 255, 255, 0.35)';
    btn.style.transform = 'translateY(-1px)';
  });
  
  btn.addEventListener('mouseleave', () => {
    btn.style.background = 'rgba(255, 255, 255, 0.12)';
    btn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
    btn.style.transform = 'translateY(0)';
  });
  
  btn.addEventListener('click', () => {
    const newLang = localStorage.getItem('cl_lang') === 'en' ? 'kn' : 'en';
    localStorage.setItem('cl_lang', newLang);
    textNode.textContent = newLang === 'en' ? 'ಕನ್ನಡ' : 'English';
    translatePageUI();
    showToast(newLang === 'en' ? 'Switched to English' : 'ಕನ್ನಡ ಭಾಷೆಗೆ ಬದಲಾಯಿಸಲಾಗಿದೆ', 'success');
    if (typeof setLanguage === 'function') {
      setLanguage(newLang);
    }
  });
  
  const logoutBtn = headerRight.querySelector('[data-action="logout"]');
  if (logoutBtn) {
    headerRight.insertBefore(btn, logoutBtn);
  } else {
    headerRight.appendChild(btn);
  }
}

// ─── Auth Helpers ─────────────────────────────────────────────────────────────
function getToken()    { return sessionStorage.getItem('cl_token'); }
function getUsername() { return sessionStorage.getItem('cl_username'); }
function getRole()     { return sessionStorage.getItem('cl_role'); }

function setSession(token, username, role) {
  sessionStorage.setItem('cl_token',    token);
  sessionStorage.setItem('cl_username', username);
  sessionStorage.setItem('cl_role',     role);
}

function clearSession() {
  ['cl_token','cl_username','cl_role'].forEach(k => {
    sessionStorage.removeItem(k);
    // Remove credentials created by older deployments.
    localStorage.removeItem(k);
  });
}

/** Authenticated fetch — auto-attaches Bearer token */
async function apiFetch(path, opts = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  if (res.status === 401) {
    clearSession();
    location.replace('index.html');
    return null;
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || res.statusText);
  }
  return res.json();
}

// ─── Auth Guard ───────────────────────────────────────────────────────────────
let _authGuardPromise = null;

async function validateStoredSession(token) {
  try {
    const response = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` },
      cache: 'no-store'
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (_) {
    return null;
  }
}

function authGuard() {
  if (_authGuardPromise) return _authGuardPromise;

  _authGuardPromise = (async () => {
  const page = location.pathname.split('/').pop() || 'index.html';
  const isLogin = page === 'index.html' || page === '';
    const token = getToken();

    // Discard persistent credentials left by previous versions.
    ['cl_token','cl_username','cl_role'].forEach(k => localStorage.removeItem(k));

    if (!token) {
      if (!isLogin) location.replace('index.html');
      return isLogin;
    }

    const user = await validateStoredSession(token);
    if (!user) {
      clearSession();
      if (!isLogin) location.replace('index.html');
      return isLogin;
    }

    sessionStorage.setItem('cl_username', user.username);
    sessionStorage.setItem('cl_role', user.role);

    if (isLogin) {
      location.replace('dashboard.html');
      return false;
    }

    applyUserUI();
    initSidebar();
    initHeaderActions();
    highlightActiveNav();
    initAdminGating();
    initPasswordToggle();
    initModals();
    document.documentElement.classList.remove('auth-pending');
    return true;
  })();

  return _authGuardPromise;
}

// ─── Login ────────────────────────────────────────────────────────────────────
async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  const errEl = document.getElementById('login-error');
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  if (!username || !password) {
    showLoginError('Please fill in all fields.'); return;
  }

  btn.disabled = true;
  btn.textContent = 'Signing in…';
  if (errEl) errEl.style.display = 'none';

  try {
    const data = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (!data.ok) {
      const err = await data.json().catch(() => ({}));
      throw new Error(err.detail || 'Invalid credentials');
    }

    const json = await data.json();

    setSession(json.token, json.username, json.role);
    location.href = 'dashboard.html';
  } catch (err) {
    showLoginError(err.message);
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
}

function showLoginError(msg) {
  const el = document.getElementById('login-error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

function fillDemo(type) {
  const creds = {
    admin:       { u: 'admin',   p: 'admin123' },
    investigator:{ u: 'officer', p: 'officer123' }
  };
  const c = creds[type];
  if (!c) return;
  document.getElementById('username').value = c.u;
  document.getElementById('password').value = c.p;
}

// ─── Logout ───────────────────────────────────────────────────────────────────
async function logout() {
  try {
    const token = getToken();
    if (token) {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    }
  } catch(_) {}
  clearSession();
  location.replace('index.html');
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────
function applyUserUI() {
  let username = getUsername() || 'User';
  const role     = getRole()     || 'Investigator';

  if (username === 'admin') {
    username = 'Supt. Kumar';
  } else if (username === 'officer') {
    username = 'Officer Rajesh';
  }

  const initials = username.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();

  const el = id => document.getElementById(id);
  if (el('header-username'))  el('header-username').textContent  = username;
  if (el('header-avatar'))    el('header-avatar').textContent    = initials;
  if (el('header-role-badge')) el('header-role-badge').textContent = role;
}

function initAdminGating() {
  const role = getRole();
  document.querySelectorAll('.nav-admin-only').forEach(el => {
    el.style.display = role === 'Admin' ? '' : 'none';
  });
  // If non-admin lands on users.html, redirect
  const page = location.pathname.split('/').pop();
  if (page === 'users.html' && role !== 'Admin') {
    showToast('Admin access required', 'error');
    setTimeout(() => location.href = 'dashboard.html', 1500);
  }
}

function highlightActiveNav() {
  const page = location.pathname.split('/').pop() || 'dashboard.html';
  document.querySelectorAll('.nav-item[data-page]').forEach(a => {
    a.classList.toggle('active', a.dataset.page === page);
  });
}

function initHeaderActions() {
  document.querySelectorAll('[data-action="logout"]').forEach(el => {
    el.addEventListener('click', e => { e.preventDefault(); logout(); });
  });
}

function initSidebar() {
  const sidebar  = document.getElementById('app-sidebar');
  const overlay  = document.getElementById('sidebar-overlay');
  const hamburger = document.getElementById('hamburger-btn');
  const main = document.getElementById('app-main');
  if (!sidebar || !hamburger) return;

  // Restore collapsed state
  const isCollapsed = localStorage.getItem('cl_sidebar_collapsed') === 'true';
  if (isCollapsed) {
    sidebar.classList.add('collapsed');
    if (main) main.classList.add('sidebar-collapsed');
  }

  hamburger.addEventListener('click', () => {
    // Mobile view toggles
    sidebar.classList.toggle('mobile-open');
    if (overlay) overlay.classList.toggle('active');
    
    // Desktop view toggles
    sidebar.classList.toggle('collapsed');
    if (main) main.classList.toggle('sidebar-collapsed');
    
    // Save collapsed state
    localStorage.setItem('cl_sidebar_collapsed', sidebar.classList.contains('collapsed'));
  });

  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
      overlay.classList.remove('active');
    });
  }
}

// ─── Notifications Panel ──────────────────────────────────────────────────────
function toggleNotifications() {
  showToast('No new notifications', 'info');
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  const colors = { success:'#166534', error:'#991B1B', info:'#1D4ED8', warning:'#92400E' };
  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed;bottom:24px;right:24px;z-index:9999;
    background:${colors[type]||colors.info};color:#fff;
    padding:12px 20px;border-radius:8px;font-size:13px;font-weight:500;
    box-shadow:0 4px 20px rgba(0,0,0,.25);max-width:360px;
    animation:slideUp .3s ease;font-family:Inter,sans-serif;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// ─── Modals ───────────────────────────────────────────────────────────────────
function initModals() {
  document.querySelectorAll('[data-modal-open]').forEach(btn => {
    btn.addEventListener('click', () => {
      const m = document.getElementById(btn.dataset.modalOpen);
      if (m) m.style.display = 'flex';
    });
  });
  document.querySelectorAll('[data-modal-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.modal-overlay').style.display = 'none';
    });
  });
  document.querySelectorAll('.modal-overlay').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m) m.style.display = 'none'; });
  });
}

// ─── Password Toggle ──────────────────────────────────────────────────────────
function initPasswordToggle() {
  document.querySelectorAll('[data-password-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.passwordToggle);
      if (!input) return;
      input.type = input.type === 'password' ? 'text' : 'password';
    });
  });
}

// ─── Particle Network (Login) ─────────────────────────────────────────────────
function initParticleNetwork(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; }
  resize();
  window.addEventListener('resize', resize);

  const PARTICLES = 60;
  const particles = Array.from({ length: PARTICLES }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
    r: Math.random() * 2 + 1
  }));

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width)  p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fill();
    });
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 100) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(255,255,255,${0.15 * (1 - dist/100)})`;
          ctx.lineWidth = 0.6;
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

async function initDashboardCharts() {
  try {
    const [overview, trends, crimeTypes, districts, recentFIRs, advancedIntel] = await Promise.all([
      apiFetch('/api/analytics/overview'),
      apiFetch('/api/analytics/monthly-trends'),
      apiFetch('/api/analytics/crime-types'),
      apiFetch('/api/analytics/districts'),
      apiFetch('/api/firs?limit=10'),
      apiFetch('/api/analytics/advanced-intelligence')
    ]);

    if (overview) renderKPIs(overview);
    if (trends)   renderBarChart(trends);
    if (crimeTypes) renderDonutChart(crimeTypes);
    if (districts)  renderDistrictCards(districts);
    if (recentFIRs) renderFIRTable(recentFIRs);
    if (advancedIntel) renderAdvancedIntelligence(advancedIntel);
    loadDashboardOperations();
  } catch (err) {
    showToast('Failed to load dashboard data: ' + err.message, 'error');
    console.error(err);
  }
}

function renderKPIs(data) {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('kpi-total-firs',      Number(data.total_firs      || 0).toLocaleString());
  set('kpi-active-cases',    Number(data.open_cases       || 0).toLocaleString());
  set('kpi-repeat-offenders',Number(data.total_offenders  || 0).toLocaleString());
  set('kpi-districts',       `${data.districts_covered || 0} / 31`);
}

let _barChartInstance = null;
let _donutChartInstance = null;

function renderBarChart(trends) {
  const canvas = document.getElementById('crime-bar-chart');
  if (!canvas || !trends?.length) return;

  if (_barChartInstance) {
    _barChartInstance.destroy();
    _barChartInstance = null;
  }

  // Show last 12 months
  const last12 = trends.slice(-12);
  const labels  = last12.map(r => {
    const [yr, mo] = r.month.split('-');
    return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+mo-1];
  });
  const counts = last12.map(r => r.count);

  _barChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'FIRs',
        data: counts,
        backgroundColor: 'rgba(28,43,74,0.8)',
        borderColor: '#1C2B4A',
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#6B7280', font: { size: 11 } } },
        y: { grid: { color: '#F3F4F6' }, ticks: { color: '#6B7280', font: { size: 11 } } }
      }
    }
  });
}

function renderDonutChart(crimeTypes) {
  const canvas = document.getElementById('crime-donut-chart');
  if (!canvas || !crimeTypes?.length) return;

  if (_donutChartInstance) {
    _donutChartInstance.destroy();
    _donutChartInstance = null;
  }

  const top6 = crimeTypes.slice(0, 6);
  const COLORS = ['#1C2B4A','#2A7F7F','#D4872A','#B91C1C','#166534','#7C3AED'];

  _donutChartInstance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: top6.map(r => r.crime_type),
      datasets: [{
        data: top6.map(r => r.count),
        backgroundColor: COLORS,
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { font: { size: 11 }, color: '#374151', padding: 12 }
        }
      },
      cutout: '62%'
    }
  });
}


function renderDistrictCards(districts) {
  const grid = document.getElementById('district-grid');
  if (!grid || !districts?.length) return;

  const maxCrimes = districts[0]?.total_crimes || 1;
  grid.innerHTML = districts.slice(0, 6).map(d => {
    const pct  = Math.round((d.total_crimes / maxCrimes) * 100);
    const risk = pct > 70 ? 'HIGH' : pct > 40 ? 'MEDIUM' : 'LOW';
    const riskClass = risk === 'HIGH' ? 'badge-high' : risk === 'MEDIUM' ? 'badge-medium' : 'badge-low';
    const barColor  = risk === 'HIGH' ? '#B91C1C' : risk === 'MEDIUM' ? '#D97706' : '#166534';

    return `
      <div class="district-card">
        <div class="flex-between">
          <span class="district-name">${d.district}</span>
          <span class="badge ${riskClass}">${risk}</span>
        </div>
        <div class="district-count">${Number(d.total_crimes).toLocaleString()}</div>
        <div class="text-muted text-sm mb-sm">crimes registered · ${d.open_cases} open</div>
        <div class="district-sparkline">
          ${[0.4,0.55,0.65,0.75,0.88,1].map((h,i) =>
            `<div class="sparkline-bar" style="height:${Math.round(h*pct)}%;background:${barColor};opacity:${0.4+i*0.12}"></div>`
          ).join('')}
        </div>
      </div>`;
  }).join('');
  translatePageUI();
}

function renderAdvancedIntelligence(data) {
  const grid = document.getElementById('advanced-intel-grid');
  if (!grid) return;

  const forecast = data.forecast?.summary || {};
  const warnings = data.forecast?.early_warnings || [];
  const socio = data.sociological?.summary || {};
  const socialDistricts = data.sociological?.district_social_risk || [];
  const financial = data.financial?.summary || {};
  const clusters = data.financial?.clusters || [];
  const evidence = data.explainable?.evidence_trails || [];
  const governance = data.governance || {};

  const topWarning = warnings[0];
  const topSocial = socialDistricts[0];
  const topCluster = clusters[0];

  grid.innerHTML = `
    <div class="advanced-intel-card">
      <div class="advanced-intel-title">Forecast & Early Warning</div>
      <div class="advanced-intel-metric">${forecast.next_month_forecast || 0}</div>
      <div class="advanced-intel-text">Projected FIRs next month · ${forecast.trend_direction || 'Stable'} trend</div>
      <ul class="advanced-intel-list">
        <li><span>${topWarning?.district || 'No active warning'}</span><strong>${topWarning?.alert_level || 'Stable'}</strong></li>
        <li><span>Method</span><strong>Moving avg</strong></li>
      </ul>
    </div>
    <div class="advanced-intel-card">
      <div class="advanced-intel-title">Socio-Demographic Insight</div>
      <div class="advanced-intel-metric">${socio.dominant_age_band || 'N/A'}</div>
      <div class="advanced-intel-text">Dominant offender age band · ${socio.dominant_gender || 'N/A'}</div>
      <ul class="advanced-intel-list">
        <li><span>${topSocial?.district || 'No district data'}</span><strong>${Math.round(topSocial?.social_risk_index || 0)}</strong></li>
        <li><span>Socio-economic CSV</span><strong>${socio.official_socio_economic_dataset ? 'Loaded' : 'Not uploaded'}</strong></li>
      </ul>
    </div>
    <div class="advanced-intel-card">
      <div class="advanced-intel-title">Financial Link Analysis</div>
      <div class="advanced-intel-metric">${financial.suspicious_clusters || 0}</div>
      <div class="advanced-intel-text">Suspicious cyber/financial-adjacent clusters detected</div>
      <ul class="advanced-intel-list">
        <li><span>${topCluster?.account || topCluster?.offender_id || 'No cluster'}</span><strong>${topCluster?.link_score || 0}</strong></li>
        <li><span>Candidate cases</span><strong>${financial.candidate_cases || 0}</strong></li>
      </ul>
    </div>
    <div class="advanced-intel-card">
      <div class="advanced-intel-title">Explainability & Governance</div>
      <div class="advanced-intel-metric">${evidence.length || 0}</div>
      <div class="advanced-intel-text">Evidence trails available for analytics claims</div>
      <ul class="advanced-intel-list">
        <li><span>Roles</span><strong>${(governance.roles || []).join(', ') || 'Active'}</strong></li>
        <li><span>Audit</span><strong>Prototype</strong></li>
      </ul>
    </div>
  `;
  translatePageUI();
}

async function loadDashboardOperations() {
  const grid = document.getElementById('dashboard-ops-grid');
  if (!grid) return;
  try {
    const status = await apiFetch('/api/system/summary');
    if (!status) return;
    renderOperationsGrid(grid, status);
  } catch (err) {
    grid.innerHTML = `<div class="ops-muted">Operations status could not be loaded.</div>`;
  }
}

function renderOperationsGrid(container, status) {
  const runtime = status.runtime || {};
  const database = status.database || {};
  const alerts = status.alerts || {};
  const reports = status.reports || {};
  const jobs = status.jobs || {};
  const latestReport = reports.latest;
  const latestJob = jobs.latest;

  container.innerHTML = `
    <div class="ops-card">
      <div class="ops-label">Runtime</div>
      <div class="ops-value">${escapeHTML(runtime.platform || 'Local development')}</div>
      <div class="ops-detail">${runtime.catalyst_file_store_configured ? 'Catalyst File Store configured' : 'Local AppSail report storage'}</div>
    </div>
    <div class="ops-card">
      <div class="ops-label">Report Archive</div>
      <div class="ops-value">${Number(runtime.report_archive_rows || 0).toLocaleString()}</div>
      <div class="ops-detail">${escapeHTML(latestReport?.filename || 'No archived report yet')}</div>
    </div>
    <div class="ops-card">
      <div class="ops-label">Open Alerts</div>
      <div class="ops-value">${Number(alerts.open || 0).toLocaleString()}</div>
      <div class="ops-detail">${escapeHTML(alerts.latest?.district || 'No active warning')}</div>
    </div>
    <div class="ops-card">
      <div class="ops-label">Last Job</div>
      <div class="ops-value">${escapeHTML(latestJob?.status || 'Not run')}</div>
      <div class="ops-detail">${escapeHTML(latestJob?.job_name || 'daily-intelligence-refresh')} · ${escapeHTML(formatAuditTimestamp(latestJob?.started_at || ''))}</div>
    </div>
    <div class="ops-card">
      <div class="ops-label">Datasets</div>
      <div class="ops-value">${Number(database.firs || 0).toLocaleString()}</div>
      <div class="ops-detail">FIR rows · ${Number(database.financial_transactions || 0)} financial · ${Number(database.socio_economic_indicators || 0)} socio-economic</div>
    </div>
    <div class="ops-card">
      <div class="ops-label">Audit Events</div>
      <div class="ops-value">${Number(database.audit_logs || 0).toLocaleString()}</div>
      <div class="ops-detail">${escapeHTML(status.audit?.latest?.action || 'No audit event')}</div>
    </div>
  `;
}

function renderFIRTable(firs) {
  const tbody = document.getElementById('fir-table-body');
  if (!tbody || !firs?.length) return;

  _firTableData = firs;

  const statusClass = s => s === 'Open' ? 'badge-open' : s === 'Closed' ? 'badge-closed' : 'badge-investigating';

  tbody.innerHTML = firs.map(f => `
    <tr>
      <td class="fir-id">${f.fir_id}</td>
      <td>${f.crime_type}</td>
      <td>${f.district}</td>
      <td>${f.date}</td>
      <td>${f.offender_name || '—'}</td>
      <td><span class="badge ${statusClass(f.status)}">${f.status}</span></td>
      <td><button class="btn btn-outline btn-sm" onclick="viewFIR('${f.fir_id}')">View</button></td>
    </tr>`).join('');
  translatePageUI();
}

async function viewFIR(firId) {
  // If there is an active drawer on the current page, fetch data and show it instead of redirecting
  const drawer = document.getElementById('fir-drawer');
  if (drawer) {
    try {
      const fir = await apiFetch(`/api/firs/${firId}`);
      if (fir) {
        openFIRDrawer(fir);
        return;
      }
    } catch (e) {
      console.warn('Failed to fetch FIR for drawer, falling back to redirect:', e);
    }
  }
  window.location.href = `offenders.html?fir=${firId}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI CHAT
// ═══════════════════════════════════════════════════════════════════════════════

var _chatLanguage = localStorage.getItem('cl_lang') || 'en'; // default language

function setLanguage(lang) {
  localStorage.setItem('cl_lang', lang);
  _chatLanguage = lang;
  
  // Update translation of the page UI
  translatePageUI();
  
  // Update toggle buttons in UI
  const enBtn = document.getElementById('lang-en');
  const knBtn = document.getElementById('lang-kn');
  if (enBtn && knBtn) {
    if (lang === 'en') {
      enBtn.classList.add('active');
      knBtn.classList.remove('active');
    } else {
      knBtn.classList.add('active');
      enBtn.classList.remove('active');
    }
  }

  // Update panels and placeholder text
  const labelEl = document.getElementById('chat-lang-label');
  const modeDisplay = document.getElementById('lang-mode-display');
  const inputEl = document.getElementById('chat-input');
  
  if (lang === 'en') {
    if (labelEl) labelEl.innerHTML = '<span class="kan">ಅಪರಾಧ ತನಿಖಾ ಸಹಾಯಕ</span> — English mode';
    if (modeDisplay) modeDisplay.textContent = '🇬🇧 English Mode Active';
    if (inputEl) inputEl.placeholder = 'Type in English or ಕನ್ನಡ ನಲ್ಲಿ ಬರೆಯಿರಿ…';
  } else {
    if (labelEl) labelEl.innerHTML = '<span class="kan">ಅಪರಾಧ ತನಿಖಾ ಸಹಾಯಕ</span> — ಕನ್ನಡ ಮೋಡ್';
    if (modeDisplay) modeDisplay.textContent = '💛❤️ Kannada Mode Active';
    if (inputEl) inputEl.placeholder = 'ಕನ್ನಡ ಅಥವಾ ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ಟೈಪ್ ಮಾಡಿ…';
  }

  // Update initial welcome bubble text dynamically to match the chosen language
  const welcomeBubble = document.getElementById('welcome-bubble');
  if (welcomeBubble) {
    if (lang === 'en') {
      welcomeBubble.innerHTML = `<span class="kan">ನಮಸ್ಕಾರ</span>. I am NAMMA KSP, your bilingual crime intelligence assistant for Karnataka State Police. Ask me anything in <strong>English or ಕನ್ನಡ</strong> — I will respond in your chosen language. You can also use the <strong>microphone</strong> for voice input. What would you like to investigate?`;
    } else {
      welcomeBubble.innerHTML = `<span class="kan">ನಮಸ್ಕಾರ</span>. ನಾನು ನಮ್ಮ KSP, ಕರ್ನಾಟಕ ರಾಜ್ಯ ಪೊಲೀಸ್‌ಗಾಗಿ ನಿಮ್ಮ ದ್ವಿಭಾಷಾ ಅಪರಾಧ ಗುಪ್ತಚರ ಸಹಾಯಕ. ಇಂಗ್ಲಿಷ್ ಅಥವಾ ಕನ್ನಡದಲ್ಲಿ ನನ್ನನ್ನು ಏನನ್ನಾದರೂ ಕೇಳಿ — ನಾನು ನಿಮ್ಮ ಆಯ್ಕೆಯ ಭಾಷೆಯಲ್ಲಿ ಉತ್ತರಿಸುತ್ತೇನೆ. ಧ್ವನಿ ಇನ್‌ಪುಟ್‌ಗಾಗಿ ನೀವು ಮೈಕ್ರೊಫೋನ್ ಅನ್ನು ಸಹ ಬಳಸಬಹುದು. ನೀವು ಏನನ್ನು ತನಿಖೆ ಮಾಡಲು ಬಯಸುತ್ತೀರಿ?`;
    }
  }
}

// Global voice variables
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let audioStream = null;

async function toggleVoiceInput() {
  const voiceBtn = document.getElementById('voice-btn');
  const indicator = document.getElementById('voice-indicator');
  const statusText = document.getElementById('voice-status-text');
  const inputEl = document.getElementById('chat-input');

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showToast('Your browser does not support audio recording.', 'error');
    return;
  }

  if (isRecording) {
    // Stop recording
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
    }
    isRecording = false;
    if (voiceBtn) voiceBtn.classList.remove('recording');
    if (indicator) indicator.classList.remove('show');
  } else {
    // Start recording
    try {
      audioChunks = [];
      audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      let options = { mimeType: 'audio/webm' };
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/ogg' };
      }
      if (!MediaRecorder.isTypeSupported('audio/ogg')) {
        options = {}; // default
      }
      
      mediaRecorder = new MediaRecorder(audioStream, options);
      
      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
        if (audioBlob.size === 0) return;
        
        if (statusText) statusText.textContent = 'Transcribing audio...';
        if (indicator) indicator.classList.add('show');
        
        try {
          const formData = new FormData();
          formData.append('file', audioBlob, 'voice.webm');
          
          const response = await fetch(`${API_BASE}/api/audio-transcribe?language=${_chatLanguage}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${getToken()}`
            },
            body: formData
          });
          
          if (!response.ok) {
            const errJson = await response.json().catch(() => ({}));
            throw new Error(errJson.detail || 'Transcription failed');
          }
          
          const result = await response.json();
          if (result.text && result.text.trim()) {
            if (inputEl) {
              inputEl.value = result.text.trim();
              showToast('Speech transcribed successfully', 'success');
              sendChatMessage();
            }
          } else {
            showToast('No speech detected. Please try again.', 'warning');
          }
        } catch (err) {
          showToast('Voice transcription error: ' + err.message, 'error');
        } finally {
          if (indicator) indicator.classList.remove('show');
        }
      };

      mediaRecorder.start();
      isRecording = true;
      if (voiceBtn) voiceBtn.classList.add('recording');
      if (statusText) statusText.textContent = 'Listening... Speak now. Click mic again to finish.';
      if (indicator) indicator.classList.add('show');
      showToast('Recording started. Speak now.', 'info');
    } catch (err) {
      showToast('Could not access microphone: ' + err.message, 'error');
      console.error(err);
    }
  }
}

// Expose functions globally for HTML onclick events
window.setLanguage = setLanguage;
window.toggleVoiceInput = toggleVoiceInput;

let _chatSessionId = null;
let _chatHistory   = [];  // [{role, content}] for export

function initChat() {
  _chatSessionId = _chatSessionId || ('sess_' + Date.now());

  // Initialize toggle buttons based on persisted language state
  setLanguage(_chatLanguage);

  const sendBtn  = document.getElementById('chat-send-btn');
  const inputEl  = document.getElementById('chat-input');
  if (!sendBtn || !inputEl) return;

  sendBtn.addEventListener('click', sendChatMessage);
  inputEl.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) sendChatMessage(); });

  // Export button
  const exportBtn = document.getElementById('chat-export-btn');
  if (exportBtn) exportBtn.addEventListener('click', exportChatLog);

  // Clear button
  const clearBtn = document.getElementById('chat-clear-btn');
  if (clearBtn) clearBtn.addEventListener('click', clearChat);

  // Auto-run query if passed via parameter
  const params = new URLSearchParams(window.location.search);
  const autoQuery = params.get('q');
  const firId = params.get('fir');
  const storedQuery = sessionStorage.getItem('cl_prefill_chat');
  if (storedQuery) sessionStorage.removeItem('cl_prefill_chat');
  
  let queryText = '';
  if (storedQuery) {
    queryText = storedQuery;
  } else if (autoQuery) {
    queryText = autoQuery;
  } else if (firId) {
    queryText = `Summarize FIR case ${firId} and analyze its connections.`;
  }

  if (queryText) {
    inputEl.value = queryText;
    setTimeout(() => {
      sendChatMessage();
    }, 150);
  }
}

async function sendChatMessage() {
  const inputEl  = document.getElementById('chat-input');
  const sendBtn  = document.getElementById('chat-send-btn');
  const messages = document.getElementById('chat-messages');
  const msg      = inputEl.value.trim();
  if (!msg || !messages) return;

  inputEl.value   = '';
  sendBtn.disabled = true;

  // Append user bubble
  appendChatMessage('user', msg, messages);
  _chatHistory.push({ role: 'user', content: msg });

  // Typing indicator
  const typingId = appendTypingIndicator(messages);

  try {
    const langParam = _chatLanguage === 'kn' ? 'kn-IN' : 'en-US';
    const data = await apiFetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: msg, session_id: _chatSessionId, language: langParam })
    });


    removeTypingIndicator(typingId, messages);

    if (data) {
      const reply = data.response || 'No response.';
      appendChatMessage('ai', reply, messages, data.tokens_used);
      _chatHistory.push({ role: 'assistant', content: reply });
      _chatSessionId = data.session_id || _chatSessionId;
    }
  } catch (err) {
    removeTypingIndicator(typingId, messages);
    appendChatMessage('ai', `⚠ Error: ${err.message}`, messages);
  } finally {
    sendBtn.disabled = false;
    inputEl.focus();
  }
}
window.sendChatMessage = sendChatMessage;

function appendChatMessage(role, content, container, tokens) {
  const isAI = role === 'ai' || role === 'assistant';
  const username = getUsername() || 'User';
  const initials = username.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
  const now = new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });

  const div = document.createElement('div');
  div.className = `chat-message ${isAI ? 'ai' : 'user'}`;

  // Format markdown-like content
  const formatted = formatChatContent(content);

  if (isAI) {
    div.innerHTML = `
      <div class="chat-avatar"><span style="font-size:10px;font-weight:700;color:#2A7F7F">AI</span></div>
      <div>
        <div class="chat-bubble">${formatted}</div>
        <div class="chat-timestamp" style="display:flex;align-items:center;gap:6px">
          <span>${now}${tokens ? ` · ${tokens} tokens` : ''}</span>
          <button class="chat-speak-btn" onclick="readAloud(this.closest('.chat-message').querySelector('.chat-bubble').innerText, _chatLanguage, this)">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:2px">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
            </svg>
            Speak
          </button>
        </div>
      </div>`;
  } else {
    div.innerHTML = `
      <div>
        <div class="chat-bubble">${escapeHtml(content)}</div>
        <div class="chat-timestamp">${now}</div>
      </div>
      <div class="chat-avatar user-avatar">${initials}</div>`;
  }

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return div;
}

function formatChatContent(text) {
  if (!text) return '';
  
  // 1. Split into paragraphs
  let paras = text.split(/\n\n+/);
  
  let formattedParas = paras.map(para => {
    para = para.trim();
    if (!para) return '';
    
    // Check if it is a list (numbered or bulleted)
    const lines = para.split('\n');
    if (lines.length > 1 && lines.every(line => /^\s*(\d+\.|[-•*])\s+/.test(line))) {
      const isNumbered = /^\s*\d+\.\s+/.test(lines[0]);
      const listItems = lines.map(line => {
        const cleanLine = line.replace(/^\s*(\d+\.|[-•*])\s+/, '');
        return `<li style="margin-bottom:4px;line-height:1.4">${parseInlineMarkdown(cleanLine)}</li>`;
      }).join('');
      return isNumbered 
        ? `<ol style="margin-left:20px;margin-bottom:12px;list-style-type:decimal">${listItems}</ol>` 
        : `<ul style="margin-left:20px;margin-bottom:12px;list-style-type:disc">${listItems}</ul>`;
    }
    
    // Check if individual lines contain list items (mixed text + list)
    let processedLines = lines.map(line => {
      if (/^\s*(\d+\.|[-•*])\s+/.test(line)) {
        const cleanLine = line.replace(/^\s*(\d+\.|[-•*])\s+/, '');
        return `<div style="margin-left:15px;text-indent:-15px;margin-bottom:4px">&bull; ${parseInlineMarkdown(cleanLine)}</div>`;
      }
      return parseInlineMarkdown(line) + '<br/>';
    });
    
    // Remove trailing <br/>
    let joined = processedLines.join('');
    if (joined.endsWith('<br/>')) {
      joined = joined.slice(0, -5);
    }
    
    return `<p style="margin-bottom:10px;line-height:1.5">${joined}</p>`;
  });
  
  return formattedParas.join('');
}

function parseInlineMarkdown(text) {
  let escaped = escapeHtml(text);
  // Replace double asterisks with strong
  escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Replace single asterisks with em
  escaped = escaped.replace(/\*(.*?)\*/g, '<em>$1</em>');
  return escaped;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function appendTypingIndicator(container) {
  const id = 'typing-' + Date.now();
  const div = document.createElement('div');
  div.id = id;
  div.className = 'chat-message ai';
  div.innerHTML = `
    <div class="chat-avatar"><span style="font-size:10px;font-weight:700;color:#2A7F7F">AI</span></div>
    <div><div class="chat-bubble typing-bubble">
      <span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>
    </div></div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return id;
}

function removeTypingIndicator(id, container) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

async function clearChat() {
  if (!_chatSessionId) return;
  try {
    await apiFetch('/api/chat/clear', {
      method: 'POST',
      body: JSON.stringify({ session_id: _chatSessionId })
    });
  } catch(_) {}
  _chatHistory   = [];
  _chatSessionId = 'sess_' + Date.now();
  const container = document.getElementById('chat-messages');
  if (container) container.innerHTML = '';
  showToast('Conversation cleared', 'success');
}

async function exportChatLog() {
  if (!_chatHistory.length) { showToast('No messages to export', 'warning'); return; }
  try {
    const res = await fetch(`${API_BASE}/api/chat/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
      body: JSON.stringify({ session_id: _chatSessionId, messages: _chatHistory })
    });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    triggerFileDownload(blob, `chat_${_chatSessionId}.pdf`);
    showToast('Chat log exported as PDF', 'success');
  } catch (err) {
    showToast('Export failed: ' + err.message, 'error');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// NETWORK GRAPH (Cytoscape.js)
// ═══════════════════════════════════════════════════════════════════════════════

let _cyInstance = null;

async function initNetworkGraph() {
  await loadNetworkData();
}

async function loadNetworkData(district, crimeType) {
  const container = document.getElementById('network-graph');
  if (!container) return;

  let url = '/api/network?limit=200';
  if (district)  url += `&district=${encodeURIComponent(district)}`;
  if (crimeType) url += `&crime_type=${encodeURIComponent(crimeType)}`;

  container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#6B7280;font-size:13px">Loading network…</div>';

  try {
    const data = await apiFetch(url);
    if (!data?.graph) return;

    renderCytoscapeGraph(data.graph, data.metrics);
    renderNetworkMetrics(data.metrics);
  } catch (err) {
    container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#B91C1C;font-size:13px">Failed to load network: ${err.message}</div>`;
  }
}

function renderCytoscapeGraph(graph, metrics) {
  const container = document.getElementById('network-graph');
  if (!container || typeof cytoscape === 'undefined') return;

  container.innerHTML = '';

  if (_cyInstance) { _cyInstance.destroy(); _cyInstance = null; }

  // Pre-process node labels to inject descriptive emojis and risk flags
  if (graph.nodes) {
    graph.nodes.forEach(node => {
      const d = node.data;
      const type = d.node_type;
      let label = d.label || '';
      
      // Prevent double prefixing if already added
      if (!/^(👤|🛡️|📄|📍|📞)/.test(label)) {
        if (type === 'offender') {
          const riskEmoji = d.risk === 'High' ? '🔴' : '🟡';
          d.label = `${riskEmoji} 👤 ${label}`;
        }
        else if (type === 'victim') d.label = `🛡️ ${label}`;
        else if (type === 'fir') d.label = `📄 ${label}`;
        else if (type === 'location') d.label = `📍 ${label}`;
        else if (type === 'phone') d.label = `📞 ${label}`;
      }
    });
  }

  _cyInstance = cytoscape({
    container,
    elements: [...graph.nodes, ...graph.edges],
    style: [
      {
        selector: 'node',
        style: {
          'background-color': 'data(color)',
          'label': 'data(label)',
          'width': 'data(size)',
          'height': 'data(size)',
          'font-size': '10px',
          'font-family': 'Inter, sans-serif',
          'font-weight': 600,
          'color': '#F8FAFC', // Crisp white labels
          'text-valign': 'bottom',
          'text-halign': 'center',
          'text-margin-y': 6,
          'text-max-width': '90px',
          'text-wrap': 'ellipsis',
          'border-width': 2.5,
          'border-color': 'rgba(255,255,255,0.25)',
          'text-outline-color': '#0F172A', // Glow outline
          'text-outline-width': 2,
          'text-outline-opacity': 1,
          'transition-property': 'background-color, border-color, border-width',
          'transition-duration': '0.2s'
        }
      },
      {
        selector: 'node[node_type="offender"]',
        style: {
          'shape': 'ellipse',
          'border-color': '#FFFFFF',
          'border-width': 3,
          'border-opacity': 0.85
        }
      },
      {
        selector: 'node[node_type="fir"]',
        style: {
          'shape': 'round-rectangle',
          'background-color': '#D97706',
          'border-color': '#F59E0B',
          'border-width': 2
        }
      },
      {
        selector: 'node[node_type="victim"]',
        style: {
          'shape': 'ellipse',
          'background-color': '#2563EB',
          'border-color': '#60A5FA',
          'border-width': 2
        }
      },
      {
        selector: 'edge',
        style: {
          'width': 2,
          'line-color': '#38BDF8', // Electric neon blue line
          'target-arrow-shape': 'triangle',
          'target-arrow-color': '#38BDF8',
          'curve-style': 'bezier',
          'opacity': 0.5,
          'label': 'data(relationship)', // Relation type label on the line
          'font-size': '7px',
          'font-weight': 'bold',
          'color': '#94A3B8', // Muted blue-grey text
          'text-outline-color': '#0F172A',
          'text-outline-width': 1.5,
          'text-rotation': 'autorotate',
          'transition-property': 'line-color, opacity, width',
          'transition-duration': '0.2s'
        }
      },
      {
        selector: ':selected',
        style: {
          'border-width': 4,
          'border-color': '#22D3EE', // Bright cyan active node border
          'background-color': '#0891B2',
          'line-color': '#22D3EE', // Selected edge glows cyan
          'target-arrow-color': '#22D3EE',
          'opacity': 0.9,
          'width': 3
        }
      },
      {
        selector: '.faded',
        style: {
          'opacity': 0.15,
          'events': 'no'
        }
      },
      {
        selector: '.highlighted',
        style: {
          'opacity': 1,
          'border-width': 4,
          'border-color': '#22D3EE',
          'line-color': '#22D3EE',
          'target-arrow-color': '#22D3EE',
          'width': 3
        }
      }
    ],
    layout: {
      name: 'cose',
      animate: true,
      randomize: true,
      nodeRepulsion: 12000, // Spread nodes out nicely
      idealEdgeLength: 90,
      gravity: 0.25
    },
    minZoom: 0.2,
    maxZoom: 3,
    userZoomingEnabled: true,
    userPanningEnabled: true
  });

  _cyInstance.on('tap', 'node', e => {
    const node = e.target;
    showNodeDetail(node.data());
  });

  _cyInstance.on('tap', e => {
    if (e.target === _cyInstance) closeNetworkPanel();
  });

  // Edge hover tooltips
  _cyInstance.on('mouseover', 'edge', e => {
    const edge = e.target;
    const data = edge.data();
    let tooltip = document.getElementById('network-edge-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'network-edge-tooltip';
      tooltip.style.position = 'fixed';
      tooltip.style.background = 'rgba(15,23,42,0.95)';
      tooltip.style.color = '#fff';
      tooltip.style.padding = '6px 12px';
      tooltip.style.borderRadius = '4px';
      tooltip.style.fontSize = '11px';
      tooltip.style.zIndex = '9999';
      tooltip.style.pointerEvents = 'none';
      tooltip.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
      tooltip.style.border = '1px solid var(--color-border)';
      document.body.appendChild(tooltip);
    }
    tooltip.innerHTML = `<strong>Relation:</strong> ${data.relationship || 'Connected'}`;
    tooltip.style.display = 'block';
    tooltip.style.left = (e.originalEvent.clientX + 15) + 'px';
    tooltip.style.top = (e.originalEvent.clientY + 15) + 'px';
  });
  _cyInstance.on('mousemove', 'edge', e => {
    const tooltip = document.getElementById('network-edge-tooltip');
    if (tooltip) {
      tooltip.style.left = (e.originalEvent.clientX + 15) + 'px';
      tooltip.style.top = (e.originalEvent.clientY + 15) + 'px';
    }
  });
  _cyInstance.on('mouseout', 'edge', e => {
    const tooltip = document.getElementById('network-edge-tooltip');
    if (tooltip) tooltip.style.display = 'none';
  });

  // Update stats bar and init minimap
  updateNetworkStatsBar();
  initNetworkMinimap();
}

function updateNetworkStatsBar() {
  if (!_cyInstance) return;
  const totalNodes = _cyInstance.nodes().length;
  const totalEdges = _cyInstance.edges().length;

  const highRiskCount = _cyInstance.nodes().filter(node => {
    return node.data('node_type') === 'offender' && node.data('risk') === 'High';
  }).length;

  let mostConnectedLabel = '-';
  let maxDegree = 0;
  _cyInstance.nodes().forEach(node => {
    const degree = node.degree();
    if (degree > maxDegree) {
      maxDegree = degree;
      mostConnectedLabel = node.data('label') || '-';
    }
  });

  const cleanLabel = mostConnectedLabel.replace(/^(🔴|🟡|🛡️|📄|📍|📞)\s*👤?\s*/, '');
  const displayLabel = maxDegree > 0 ? `${cleanLabel} (${maxDegree} links)` : '-';

  const elNodes1 = document.getElementById('net-val-nodes');
  const elEdges1 = document.getElementById('net-val-edges');
  const elHighRisk1 = document.getElementById('net-val-highrisk');
  const elMostConnected1 = document.getElementById('net-val-mostconnected');

  const elNodes2 = document.getElementById('ns-nodes');
  const elEdges2 = document.getElementById('ns-edges');
  const elHighRisk2 = document.getElementById('ns-high');
  const elMostConnected2 = document.getElementById('ns-top');

  if (elNodes1) elNodes1.textContent = totalNodes;
  if (elEdges1) elEdges1.textContent = totalEdges;
  if (elHighRisk1) elHighRisk1.textContent = highRiskCount;
  if (elMostConnected1) elMostConnected1.textContent = displayLabel;

  if (elNodes2) elNodes2.textContent = totalNodes;
  if (elEdges2) elEdges2.textContent = totalEdges;
  if (elHighRisk2) elHighRisk2.textContent = highRiskCount;
  if (elMostConnected2) elMostConnected2.textContent = displayLabel;
}

function renderNetworkMetrics(metrics) {
  if (!metrics) return;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('net-total-nodes', metrics.total_nodes);
  set('net-total-edges', metrics.total_edges);
  set('net-components',  metrics.connected_components);
}

function showNodeDetail(data) {
  const panel = document.getElementById('network-detail-panel');
  if (!panel) return;

  document.getElementById('detail-name').textContent  = data.label  || data.id;
  document.getElementById('detail-district').textContent = data.district || '—';
  document.getElementById('detail-last-active').textContent = data.date || '—';

  const riskEl = document.getElementById('detail-risk');
  const risk = data.risk || 'Low';
  const riskClass = risk === 'High' ? 'badge-high' : risk === 'Medium' ? 'badge-medium' : 'badge-low';
  if (riskEl) riskEl.innerHTML = `<span class="badge ${riskClass}">${risk}</span>`;

  const badgeEl = document.getElementById('detail-type-badge');
  if (badgeEl) badgeEl.innerHTML = `<span class="badge badge-investigating" style="font-size:10px;text-transform:capitalize">${data.node_type || 'node'}</span>`;

  const firCountEl = document.getElementById('detail-fir-count');
  if (firCountEl) firCountEl.textContent = data.crime_type ? data.crime_type : (data.node_type === 'fir' ? '1' : '—');

  // Dynamically update the Query AI button href with specific question
  const aiBtn = document.getElementById('network-query-ai-btn');
  if (aiBtn) {
    let q = '';
    const cleanLabel = (data.label || data.id).replace(/^(🔴|🟡|🛡️|📄|📍|📞)\s*👤?\s*/, '');
    if (data.node_type === 'offender') {
      q = `Analyze criminal network connections and threat profile of repeat offender ${cleanLabel}.`;
    } else if (data.node_type === 'fir') {
      q = `Analyze case connections and associates for FIR ${cleanLabel}.`;
    } else {
      q = `Analyze connections for entity ${cleanLabel} (${data.node_type || 'Node'}).`;
    }
    aiBtn.href = `chat.html?q=${encodeURIComponent(q)}`;
  }

  // Handle "View Full Profile" button href update
  const profileBtn = panel.querySelector('a[href^="offenders.html"]');
  if (profileBtn) {
    if (data.node_type === 'offender') {
      profileBtn.style.display = '';
      profileBtn.href = `offenders.html?id=${data.id}`;
    } else {
      profileBtn.style.display = 'none';
    }
  }

  panel.classList.add('open');
  renderAssociatesList(data.id);
}

function closeNetworkPanel() {
  const panel = document.getElementById('network-detail-panel');
  if (panel) panel.classList.remove('open');

  const aiBtn = document.getElementById('network-query-ai-btn');
  if (aiBtn) aiBtn.href = 'chat.html';
}

async function applyNetworkFilters() {
  const accused   = document.getElementById('filter-accused')?.value?.trim();
  const district  = document.getElementById('filter-district')?.value;
  const crimeType = document.getElementById('filter-crime')?.value;

  if (accused) {
    // Load offender-centric network
    try {
      const offenders = await apiFetch(`/api/offenders/high-risk?limit=100`);
      const match = offenders?.find(o => o.name.toLowerCase().includes(accused.toLowerCase()));
      if (match) {
        const data = await apiFetch(`/api/network/offender/${match.offender_id}`);
        if (data?.graph) { renderCytoscapeGraph(data.graph, data.metrics); renderNetworkMetrics(data.metrics); return; }
      }
    } catch(_) {}
  }

  loadNetworkData(district, crimeType);
}

function clearNetworkFilters() {
  ['filter-accused','filter-district','filter-crime','filter-date'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  loadNetworkData();
}

// ═══════════════════════════════════════════════════════════════════════════════
// CRIME HEATMAP (Leaflet.js)
// ═══════════════════════════════════════════════════════════════════════════════

let _leafletMap = null;
let _leafletMarkers = [];

// ── State for the new district-click driven heatmap ──────────────────────────
let _selectedDistrict = null;   // currently focused district name (null = all)
let _selectedCrimeType = '';    // crime type dropdown value
let _lastFetchedCrimeType = ''; // track last API-fetched crime type

// Cache of ALL hotspot records fetched once on load
let _allHotspots = [];
let _allDensity  = [];

async function initHeatmap() {
  const mapContainer = document.getElementById('crime-map');
  if (!mapContainer || typeof L === 'undefined') return;

  _leafletMap = L.map('crime-map', { preferCanvas: true }).setView([14.5, 75.7], 7);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 18
  }).addTo(_leafletMap);

  // Wait for layout then invalidate so Leaflet knows the container size
  setTimeout(async () => {
    _leafletMap.invalidateSize();

    // Fetch ALL data once and cache it
    try {
      const [hotspots, density] = await Promise.all([
        apiFetch('/api/hotspots'),
        apiFetch('/api/hotspots/density')
      ]);
      _allHotspots = hotspots || [];
      _allDensity  = density  || [];
      _lastFetchedCrimeType = '';
      renderHeatmapMarkers(null, '');
      updateDistrictPanel(null, '');
    } catch (err) {
      showToast('Failed to load hotspot data: ' + err.message, 'error');
    }
  }, 250);
}

const DISTRICT_CENTERS = {
  'bengaluru': { coords: [12.9716, 77.5946], zoom: 11 },
  'bengaluru urban': { coords: [12.9716, 77.5946], zoom: 11 },
  'bengaluru rural': { coords: [13.0978, 77.5764], zoom: 11 },
  'mysuru': { coords: [12.2958, 76.6394], zoom: 12 },
  'mangaluru': { coords: [12.9141, 74.8560], zoom: 12 },
  'hubballi': { coords: [15.3647, 75.1240], zoom: 12 },
  'hubballi-dharwad': { coords: [15.3647, 75.1240], zoom: 12 },
  'belagavi': { coords: [15.8497, 74.4977], zoom: 12 },
  'kalaburagi': { coords: [17.3291, 76.8343], zoom: 12 },
  'shivamogga': { coords: [13.9299, 75.5681], zoom: 12 },
  'tumakuru': { coords: [13.3392, 77.1140], zoom: 12 },
  'ballari': { coords: [15.1394, 76.9214], zoom: 12 },
  'vijayapura': { coords: [16.8302, 75.7100], zoom: 12 },
  'davanagere': { coords: [14.4644, 75.9218], zoom: 12 },
  'hassan': { coords: [13.0072, 76.1026], zoom: 12 },
  'udupi': { coords: [13.3409, 74.7421], zoom: 12 },
  'chikkamagaluru': { coords: [13.3161, 75.7720], zoom: 12 },
  'raichur': { coords: [16.2120, 77.3566], zoom: 12 },
  'koppal': { coords: [15.3508, 76.1547], zoom: 12 },
  'gadag': { coords: [15.4317, 75.6267], zoom: 12 },
  'dharwad': { coords: [15.4589, 75.0078], zoom: 12 },
  'uttara kannada': { coords: [14.7939, 74.6830], zoom: 11 },
  'dakshina kannada': { coords: [12.8438, 75.2479], zoom: 11 },
  'kodagu': { coords: [12.3375, 75.8069], zoom: 12 },
  'chamarajanagar': { coords: [11.9261, 76.9437], zoom: 12 },
  'mandya': { coords: [12.5218, 76.8951], zoom: 12 },
  'chikkaballapur': { coords: [13.4353, 77.7270], zoom: 12 },
  'ramanagara': { coords: [12.7157, 77.2819], zoom: 12 },
  'kolar': { coords: [13.1357, 78.1296], zoom: 12 },
  'chitradurga': { coords: [14.2251, 76.3980], zoom: 12 },
  'bagalkot': { coords: [16.1691, 75.6969], zoom: 12 },
  'bidar': { coords: [17.9104, 77.5199], zoom: 12 },
  'yadgir': { coords: [16.7700, 77.1300], zoom: 12 },
};

/** Resolve a district name to a DISTRICT_CENTERS key */
function resolveDistrictKey(name) {
  if (!name) return null;
  const n = name.toLowerCase().trim();
  if (DISTRICT_CENTERS[n]) return n;
  // Partial match
  for (const key of Object.keys(DISTRICT_CENTERS)) {
    if (n.includes(key) || key.includes(n)) return key;
  }
  return null;
}

/**
 * Render ONLY map markers — filters _allHotspots client-side.
 */
function renderHeatmapMarkers(district, crimeType) {
  if (!_leafletMap) return;
  _leafletMarkers.forEach(m => m.remove());
  _leafletMarkers = [];

  let hs = _allHotspots;
  if (district) {
    const norm = district.toLowerCase().trim();
    hs = hs.filter(h => (h.district || '').toLowerCase().includes(norm));
  }

  if (typeof _hmIntensityMin === 'number') {
    hs = hs.filter(h => (h.crime_count || 0) >= _hmIntensityMin);
  }

  if (!hs.length) { showToast('No crime data for this selection', 'warning'); return; }

  const maxCount = Math.max(...hs.map(h => h.crime_count || 1));
  const bounds = [];

  hs.forEach(h => {
    if (!h.latitude || !h.longitude) return;
    const ratio  = (h.crime_count || 1) / maxCount;
    const radius = district ? (4000 + ratio * 10000) : (8000 + ratio * 22000);
    const color  = ratio > 0.7 ? '#B91C1C' : ratio > 0.4 ? '#D97706' : '#166534';
    const circle = L.circle([h.latitude, h.longitude], {
      color, fillColor: color, fillOpacity: 0.5, weight: 2, radius
    }).addTo(_leafletMap);
    circle.bindPopup(
      '<div style="font-family:Inter,sans-serif;min-width:160px">' +
      '<div style="font-size:13px;font-weight:700;color:#1A202C;margin-bottom:4px">' + h.district + '</div>' +
      '<div style="font-size:12px;color:#6B7280">' + (h.police_station || '') + '</div>' +
      '<div style="font-size:13px;font-weight:600;color:' + color + ';margin-top:6px">' + h.crime_count + ' crimes</div>' +
      '</div>'
    );
    _leafletMarkers.push(circle);
    bounds.push([h.latitude, h.longitude]);
  });

  if (bounds.length) {
    const lb = L.latLngBounds(bounds);
    const opts = { padding: [40, 40] };
    if (district) opts.maxZoom = 13;
    _leafletMap.fitBounds(lb, opts);
  }
  setTimeout(() => _leafletMap && _leafletMap.invalidateSize(), 80);
}

/**
 * Update District Risk Summary panel + status label + total footer.
 */
function updateDistrictPanel(district, crimeType) {
  let dd = _allDensity;
  if (district) {
    const norm = district.toLowerCase().trim();
    dd = dd.filter(d => (d.district || '').toLowerCase().includes(norm));
  }

  const statusEl = document.getElementById('map-status-label');
  if (statusEl) {
    if (district && crimeType)  statusEl.textContent = district + ' — ' + crimeType;
    else if (district)          statusEl.textContent = 'Showing: ' + district;
    else if (crimeType)         statusEl.textContent = 'All districts — ' + crimeType;
    else                        statusEl.textContent = 'Showing all Karnataka districts';
  }

  const totalEl = document.getElementById('total-crime-count');
  if (totalEl) {
    const src = dd.length ? dd : _allDensity;
    totalEl.textContent = Number(src.reduce((s, d) => s + (d.crime_count || 0), 0)).toLocaleString('en-IN');
  }

  renderDistrictRiskList(dd.length ? dd : _allDensity);
}

/**
 * Main entry — fetches from API on demand if crime type changes, otherwise filters cached data client-side.
 */
async function loadHeatmapData(district, crimeType) {
  if (!_leafletMap) return;

  const normalizedCrimeType = crimeType || '';

  // Fetch from the API if the cache is empty, or the selected crime type is different from what is currently cached
  if (!_allHotspots.length || _lastFetchedCrimeType !== normalizedCrimeType) {
    try {
      const queryParams = normalizedCrimeType ? `?crime_type=${encodeURIComponent(normalizedCrimeType)}` : '';
      const [hotspots, density] = await Promise.all([
        apiFetch(`/api/hotspots${queryParams}`),
        apiFetch(`/api/hotspots/density${queryParams}`)
      ]);
      _allHotspots = hotspots || [];
      _allDensity  = density  || [];
      _lastFetchedCrimeType = normalizedCrimeType;
    } catch (err) {
      showToast('Failed to load hotspot data: ' + err.message, 'error');
      return;
    }
  }

  renderHeatmapMarkers(district, normalizedCrimeType);
  updateDistrictPanel(district, normalizedCrimeType);
}

/**
 * Render the District Risk Summary list.
 * Each row is clickable — clicking it calls selectDistrict().
 */
function renderDistrictRiskList(districts) {
  const list = document.getElementById('district-risk-list');
  if (!list) return;

  if (!districts || !districts.length) {
    list.innerHTML = '<div style="padding:24px;text-align:center;color:var(--color-text-muted);font-size:13px">No district data available</div>';
    return;
  }

  const maxCount = Math.max(...districts.map(d => d.crime_count || 1));

  list.innerHTML = districts.map(d => {
    const pct       = (d.crime_count / maxCount) * 100;
    const risk      = pct > 70 ? 'HIGH' : pct > 35 ? 'MED' : 'LOW';
    const riskClass = risk === 'HIGH' ? 'badge-high' : risk === 'MED' ? 'badge-medium' : 'badge-low';
    const trend     = pct > 50 ? '&#x2191;' : '&#x2193;';
    const trendClass = pct > 50 ? 'trend-up' : 'trend-down';
    const isActive  = _selectedDistrict && d.district &&
                      d.district.toLowerCase().includes(_selectedDistrict.toLowerCase());

    return `
      <div class="district-risk-item${isActive ? ' active' : ''}"
           onclick="selectDistrict('${d.district.replace(/'/g, "\\'")}')"
           title="Click to focus map on ${d.district}">
        <div>
          <div class="district-risk-name">${d.district}</div>
          <div class="district-risk-count">${Number(d.crime_count).toLocaleString('en-IN')} crimes</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="badge ${riskClass}">${risk}</span>
          <span class="${trendClass}">${trend}</span>
        </div>
      </div>`;
  }).join('');
}

/**
 * Called when a district row is clicked.
 * Highlights the row, updates the detail box, loads filtered map data.
 */
async function selectDistrict(districtName) {
  _selectedDistrict = districtName;

  // Show/update the detail box
  const box   = document.getElementById('district-detail-box');
  const nameEl  = document.getElementById('ddb-name');
  const countEl = document.getElementById('ddb-count');
  const badgesEl = document.getElementById('ddb-badges');
  if (box && nameEl && countEl) {
    nameEl.textContent  = districtName;
    countEl.textContent = '…';
    box.classList.add('visible');
  }

  // Show the "✕ Show All" button
  const showAllBtn = document.getElementById('drs-show-all-btn');
  if (showAllBtn) showAllBtn.classList.add('visible');

  // Load filtered data
  await loadHeatmapData(districtName, _selectedCrimeType);

  // Update detail box with the loaded crime count from the density data
  const totalEl = document.getElementById('total-crime-count');
  if (countEl && totalEl) countEl.textContent = totalEl.textContent;

  if (badgesEl) {
    const risk = ['HIGH','MED','LOW'];
    badgesEl.innerHTML = `
      <span class="badge badge-high" style="font-size:10px">Theft</span>
      <span class="badge badge-medium" style="font-size:10px">Robbery</span>
      <span class="badge" style="font-size:10px;background:var(--color-surface-2);color:var(--color-text-muted)">+ more</span>`;
  }

  // Render Risk Assessment and strategic guidance for the clicked district
  renderDistrictRiskGuidance(districtName);

  showToast(`Focused on ${districtName}`, 'info');
}

/**
 * Reset to all-district view.
 */
async function showAllDistricts() {
  _selectedDistrict = null;

  // Hide detail box + Show All button
  document.getElementById('district-detail-box')?.classList.remove('visible');
  document.getElementById('drs-show-all-btn')?.classList.remove('visible');

  const guidancePanel = document.getElementById('district-risk-guidance-panel');
  if (guidancePanel) guidancePanel.style.display = 'none';

  await loadHeatmapData(null, _selectedCrimeType);
  showToast('Showing all Karnataka districts', 'info');
}

/**
 * Called when the crime-type dropdown changes.
 */
async function onCrimeTypeChange() {
  _selectedCrimeType = document.getElementById('drs-crime-type')?.value || '';
  await loadHeatmapData(_selectedDistrict, _selectedCrimeType);
}

// Keep backward-compat aliases (used by old Export PDF button etc.)
async function applyHeatmapFilters() {
  await loadHeatmapData(_selectedDistrict, _selectedCrimeType);
}
async function clearHeatmapFilters() {
  await showAllDistricts();
}

// ═══════════════════════════════════════════════════════════════════════════════
// OFFENDER PROFILES
// ═══════════════════════════════════════════════════════════════════════════════

async function initOffendersPage() {
  // Check if arriving from a FIR or offender link
  const params = new URLSearchParams(location.search);
  const firId  = params.get('fir');
  const offId  = params.get('id') || params.get('offender');

  if (offId) {
    await loadOffenderProfile(offId);
  } else if (firId) {
    await loadProfileByFIR(firId);
  } else {
    // Default: load high-risk offender list
    await loadHighRiskList();
  }
}

async function loadHighRiskList() {
  const grid = document.getElementById('offender-grid');
  if (!grid) return;

  try {
    const data = await apiFetch('/api/offenders/high-risk?limit=20');
    if (!data?.length) { grid.innerHTML = '<p class="text-muted">No offenders found.</p>'; return; }
    renderOffenderGrid(data, grid);
  } catch (err) {
    showToast('Failed to load offenders: ' + err.message, 'error');
  }
}

function renderOffenderGrid(offenders, container) {
  const riskClass = r => r === 'High' ? 'badge-high' : r === 'Medium' ? 'badge-medium' : 'badge-low';
  container.innerHTML = offenders.map(o => {
    const initials = o.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    const score    = o.risk_score || 0;
    return `
      <div class="offender-card" onclick="loadOffenderProfile('${o.offender_id}')" style="cursor:pointer">
        <div class="flex-between mb-sm">
          <div class="offender-avatar" style="width:40px;height:40px;font-size:13px">${initials}</div>
          <span class="badge ${riskClass(o.risk_category)}">${o.risk_category.toUpperCase()}</span>
        </div>
        <div style="font-size:14px;font-weight:700;color:var(--color-text);margin-bottom:2px">${o.name}</div>
        <div class="text-muted text-sm">${o.district}</div>
        <div style="margin-top:8px;display:flex;gap:12px">
          <span class="text-sm"><strong>${o.previous_firs}</strong> prior FIRs</span>
          <span class="text-sm"><strong>${o.active_firs}</strong> active</span>
        </div>
        <div style="margin-top:8px">
          <div style="height:4px;background:#F3F4F6;border-radius:2px">
            <div style="height:4px;background:${o.risk_category==='High'?'#B91C1C':o.risk_category==='Medium'?'#D97706':'#166534'};border-radius:2px;width:${score}%"></div>
          </div>
          <div class="text-sm text-muted" style="margin-top:4px">Risk score: ${score}/100</div>
        </div>
      </div>`;
  }).join('');
}

async function loadOffenderProfile(offenderId) {
  const profileSection = document.getElementById('offender-profile-section');
  const gridSection    = document.getElementById('offender-grid-section');

  if (gridSection)   gridSection.style.display = 'none';
  if (profileSection) profileSection.style.display = '';

  // Update URL parameters
  const newUrl = `${location.pathname}?id=${offenderId}`;
  history.pushState({ offenderId }, '', newUrl);

  try {
    const data = await apiFetch(`/api/offenders/${offenderId}`);
    if (!data) return;
    renderOffenderProfile(data);
  } catch (err) {
    showToast('Failed to load offender: ' + err.message, 'error');
  }
}

async function loadProfileByFIR(firId) {
  try {
    const fir = await apiFetch(`/api/firs/${firId}`);
    if (fir?.offender_id) await loadOffenderProfile(fir.offender_id);
  } catch (err) {
    await loadHighRiskList();
  }
}

function renderOffenderProfile(data) {
  _currentOffender = data;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val ?? '—'; };
  const setHtml = (id, val) => { const el = document.getElementById(id); if (el) el.innerHTML = val; };

  const initials = data.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();

  setHtml('offender-avatar-el', initials);
  set('offender-name',        data.name);
  set('offender-age',         data.age);
  set('offender-gender',      data.gender);
  set('offender-district',    data.district);
  set('offender-id-display',  data.offender_id);
  set('offender-prev-firs',   data.previous_firs);

  const score = data.risk_score || 0;
  const riskClass = data.risk_category === 'High' ? 'badge-high' : data.risk_category === 'Medium' ? 'badge-medium' : 'badge-low';

  setHtml('offender-risk-badge', `<span class="badge ${riskClass}">${data.risk_category?.toUpperCase()} RISK</span>`);

  const riskNumEl = document.getElementById('risk-score-number');
  if (riskNumEl) riskNumEl.textContent = score;

  // Animate SVG risk score ring
  const ringFill = document.getElementById('risk-ring-fill');
  if (ringFill) {
    const offset = 264 - (264 * score) / 100;
    ringFill.style.strokeDashoffset = offset;
    const strokeColor = data.risk_category === 'High' ? '#B91C1C' : data.risk_category === 'Medium' ? '#D97706' : '#166534';
    ringFill.style.stroke = strokeColor;
  }

  // Risk factors
  const factorsList = document.getElementById('risk-factors-list');
  if (factorsList && data.risk_factors?.length) {
    factorsList.innerHTML = data.risk_factors.map(f =>
      `<div class="explainability-item"><div class="explainability-dot"></div><span>${escapeHtml(f)}</span></div>`
    ).join('');
  }

  // FIR history table
  const firTbody = document.getElementById('offender-fir-tbody');
  if (firTbody && data.fir_history?.length) {
    const statusClass = s => s === 'Open' ? 'badge-open' : s === 'Closed' ? 'badge-closed' : 'badge-investigating';
    firTbody.innerHTML = data.fir_history.map(f => `
      <tr>
        <td class="fir-id">${f.fir_id}</td>
        <td>${f.crime_type}</td>
        <td>${f.district}</td>
        <td>${f.date}</td>
        <td><span class="badge ${statusClass(f.status)}">${f.status}</span></td>
        <td>${f.victim_name || '—'}</td>
      </tr>`).join('');
  }

  // Update timeline if visible
  const timeline = document.getElementById('fir-timeline-view');
  if (timeline && timeline.style.display !== 'none') {
    renderFIRTimeline();
  }

  // Render radar chart
  initRadarChart(data);

  // Network link
  const netLink = document.getElementById('view-network-link');
  if (netLink) netLink.href = `network.html?offender=${data.offender_id}`;
}

async function searchOffender() {
  const q = document.getElementById('offender-search')?.value?.trim();
  if (!q) return;

  // Try to match offender ID or FIR ID pattern
  if (/^OFF\d+$/i.test(q)) {
    await loadOffenderProfile(q.toUpperCase());
  } else if (/^FIR\d+$/i.test(q)) {
    await loadProfileByFIR(q.toUpperCase());
  } else {
    // Search by name / id using the API search query parameter
    try {
      const data = await apiFetch(`/api/offenders/high-risk?limit=50&search=${encodeURIComponent(q)}`);
      if (data && data.length > 0) {
        const grid = document.getElementById('offender-grid');
        const gridSection = document.getElementById('offender-grid-section');
        const profileSection = document.getElementById('offender-profile-section');
        
        if (gridSection) gridSection.style.display = '';
        if (profileSection) profileSection.style.display = 'none';
        
        if (grid) {
          renderOffenderGrid(data, grid);
        }
        showToast(`Found ${data.length} matching offender(s)`, 'success');
      } else {
        showToast('No offender found matching: ' + q, 'warning');
      }
    } catch (err) {
      showToast('Search failed: ' + err.message, 'error');
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════════════════════════════════════

async function initReportsPage() {
  await loadReportsList();
  
  const selectEl = document.getElementById('report-type');
  const labelEl = document.getElementById('report-input-label');
  const inputEl = document.getElementById('report-fir-id');
  
  if (selectEl && labelEl && inputEl) {
    selectEl.addEventListener('change', () => {
      const val = selectEl.value;
      if (val === 'case') {
        labelEl.textContent = 'FIR ID';
        inputEl.placeholder = 'e.g. FIR00001';
      } else if (val === 'district') {
        labelEl.textContent = 'District Name';
        inputEl.placeholder = 'e.g. Mysuru';
      } else if (val === 'recommendations') {
        labelEl.textContent = 'District or Crime Type (Leave blank for all)';
        inputEl.placeholder = 'e.g. Mysuru or Cyber Crime';
      }
    });
  }
}

async function loadReportsList() {
  const tbody = document.getElementById('reports-tbody');
  if (!tbody) return;

  try {
    const data = await apiFetch('/api/reports/list');
    if (!data?.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--color-text-muted);padding:24px">No reports generated yet</td></tr>';
      return;
    }
    tbody.innerHTML = data.map(r => {
      const dateValue = r.created_at ? new Date((r.created_at.includes('T') ? r.created_at : r.created_at.replace(' ', 'T') + 'Z')) : new Date((r.created || 0) * 1000);
      const date = Number.isNaN(dateValue.getTime()) ? '—' : dateValue.toLocaleDateString('en-IN');
      const reportType = r.report_type ? r.report_type.replace(/_/g, ' ') : 'Generated Report';
      const owner = r.generated_by || getUsername();
      const status = r.status || 'ready';
      return `
        <tr>
          <td class="report-id">${r.filename.replace('.pdf','')}</td>
          <td>${r.filename}</td>
          <td>${escapeHTML(reportType)}${r.subject ? `<div class="text-muted text-sm">${escapeHTML(r.subject)}</div>` : ''}</td>
          <td>${date}</td>
          <td>${escapeHTML(owner)}</td>
          <td><span class="badge badge-ready">${escapeHTML(status)}</span></td>
          <td>
            <button class="btn btn-outline btn-sm" onclick="downloadReport('${r.filename}')">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download
            </button>
          </td>
        </tr>`;
    }).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#B91C1C;padding:24px">Failed to load reports</td></tr>';
  }
}

async function generateReport() {
  const inputVal = document.getElementById('report-fir-id')?.value?.trim();
  const type     = document.getElementById('report-type')?.value;
  const btn      = document.getElementById('generate-report-btn');
  const statusEl = document.getElementById('report-gen-status');

  if (!type)  { showToast('Please select a report type', 'warning'); return; }
  if (type !== 'recommendations' && !inputVal) {
    showToast(`Please enter a ${type === 'case' ? 'FIR ID' : 'District Name'}`, 'warning');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Generating…';
  if (statusEl) statusEl.style.display = 'none';

  try {
    let endpoint = '';
    let body = '';
    let downloadName = '';

    if (type === 'case') {
      endpoint = '/api/reports/case';
      body = JSON.stringify({ fir_id: inputVal.toUpperCase() });
      downloadName = `case_report_${inputVal.toUpperCase()}.pdf`;
    } else if (type === 'district') {
      endpoint = '/api/reports/district';
      body = JSON.stringify({ district: inputVal });
      downloadName = `district_report_${inputVal.replace(/\s+/g, '_')}.pdf`;
    } else if (type === 'recommendations') {
      endpoint = '/api/reports/recommendations';
      const payload = {};
      if (inputVal) {
        // Simple heuristic to differentiate district vs crime type
        const crimeTypes = ['Robbery', 'Theft', 'Assault', 'Cyber Crime', 'Vehicle Theft', 'Drug Offense', 'Financial Fraud', 'Burglary', 'Kidnapping', 'Murder', 'Domestic Violence', 'Fraud'];
        const isCrime = crimeTypes.some(c => c.toLowerCase() === inputVal.toLowerCase());
        if (isCrime) {
          payload.crime_type = inputVal;
        } else {
          payload.district = inputVal;
        }
      }
      body = JSON.stringify(payload);
      const suffix = inputVal ? `_${inputVal.replace(/\s+/g, '_')}` : '';
      downloadName = `ai_recommendations${suffix}.pdf`;
    } else {
      throw new Error('Unsupported report type');
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
      body
    });

    if (!res.ok) {
      const err = await res.json().catch(()=>({}));
      throw new Error(err.detail || 'Report generation failed');
    }

    const blob     = await res.blob();
    const filename = res.headers.get('content-disposition')?.split('filename=')[1]?.replace(/['"]/g, '') || downloadName;
    triggerFileDownload(blob, filename);

    if (statusEl) {
      statusEl.textContent = `✓ Report generated and downloaded: ${filename}`;
      statusEl.style.display = 'block';
    }
    showToast('Report generated successfully', 'success');
    await loadReportsList();

    // Close modal after 2s
    setTimeout(() => {
      const modal = document.getElementById('generate-report-modal');
      if (modal) modal.style.display = 'none';
      if (statusEl) statusEl.style.display = 'none';
    }, 2500);
  } catch (err) {
    showToast('Report error: ' + err.message, 'error');
    if (statusEl) {
      statusEl.textContent = '⚠ ' + err.message;
      statusEl.style.background = '#FEE2E2';
      statusEl.style.borderColor = '#FECACA';
      statusEl.style.color = '#991B1B';
      statusEl.style.display = 'block';
    }
  } finally {
    btn.disabled = false;
    btn.textContent = 'Generate Report';
  }
}

async function downloadReport(filename) {
  showToast('Download starting...', 'info');
  try {
    // Use the dedicated download API endpoint (not StaticFiles) 
    // to guarantee application/pdf Content-Type and attachment disposition
    const res = await fetch(`${API_BASE}/api/reports/download/${encodeURIComponent(filename)}`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    if (!res.ok) throw new Error('File download failed: ' + res.status);
    const blob = await res.blob();
    triggerFileDownload(blob, filename);
    showToast('Report downloaded successfully', 'success');
  } catch (err) {
    showToast('Failed to download report: ' + err.message, 'error');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// USER MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

async function initUsersPage() {
  await Promise.all([loadUsersList(), loadAuditLogs(), loadSystemStatus(), loadEarlyWarningAlerts()]);

  if (window._auditRefreshTimer) clearInterval(window._auditRefreshTimer);
  window._auditRefreshTimer = setInterval(() => {
    if (document.visibilityState === 'visible') {
      loadAuditLogs({ silent: true });
      loadSystemStatus({ silent: true });
    }
  }, 15000);
}

function formatAuditTimestamp(value) {
  if (!value) return '—';
  const normalized = value.includes('T') ? value : value.replace(' ', 'T') + 'Z';
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).format(date);
}

async function loadAuditLogs({ silent = false } = {}) {
  const tbody = document.getElementById('audit-log-tbody');
  if (!tbody) return;

  try {
    const logs = await apiFetch('/api/audit/logs?limit=5');
    if (!logs) return;

    if (!logs.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--color-text-muted)">No audit actions recorded yet.</td></tr>';
      return;
    }

    tbody.innerHTML = logs.map(log => {
      const action = escapeHTML(log.action || 'UNKNOWN');
      const badgeClass = action.includes('FAILED') || action.includes('DELETE')
        ? 'badge-closed'
        : action.includes('LOGIN') || action.includes('CREATE')
          ? 'badge-active'
          : 'badge-investigating';
      return `
        <tr title="${escapeHTML(log.detail || '')}">
          <td style="font-size:12px;font-family:monospace">${escapeHTML(formatAuditTimestamp(log.timestamp))}</td>
          <td>${escapeHTML(log.username || 'Unknown')}</td>
          <td><span class="badge ${badgeClass}" style="font-size:10px">${action}</span></td>
          <td>${escapeHTML(log.resource || 'system')}</td>
          <td style="font-family:monospace;font-size:12px">${escapeHTML(log.ip_address || '—')}</td>
        </tr>`;
    }).join('');
  } catch (err) {
    if (!silent) showToast('Failed to load audit log: ' + err.message, 'error');
  }
}

async function loadSystemStatus({ silent = false } = {}) {
  const grid = document.getElementById('system-status-grid');
  if (!grid) return;
  try {
    const status = await apiFetch('/api/system/status');
    if (!status) return;
    renderOperationsGrid(grid, status);
  } catch (err) {
    grid.innerHTML = `<div class="ops-muted">Failed to load system status.</div>`;
    if (!silent) showToast('Failed to load system status: ' + err.message, 'error');
  }
}

async function loadEarlyWarningAlerts({ silent = false } = {}) {
  const list = document.getElementById('early-warning-list');
  if (!list) return;
  try {
    const alerts = await apiFetch('/api/alerts/early-warning?limit=8');
    if (!alerts) return;
    if (!alerts.length) {
      list.innerHTML = '<div class="ops-muted">No forecast alerts recorded yet. Run refresh to generate the latest warning ledger.</div>';
      return;
    }
    list.innerHTML = alerts.map(alert => `
      <div class="ops-alert">
        <div>
          <div class="ops-alert-title">${escapeHTML(alert.signal || 'Early warning')}</div>
          <div class="ops-alert-detail">${escapeHTML(alert.district || 'Statewide')} · ${escapeHTML(formatAuditTimestamp(alert.created_at))}</div>
          <div class="ops-alert-detail">${escapeHTML(alert.detail || '')}</div>
        </div>
        <span class="badge ${alert.severity === 'High' ? 'badge-high' : 'badge-medium'}">${escapeHTML(alert.severity || 'Medium')}</span>
      </div>
    `).join('');
  } catch (err) {
    list.innerHTML = '<div class="ops-muted">Failed to load early-warning alerts.</div>';
    if (!silent) showToast('Failed to load alerts: ' + err.message, 'error');
  }
}

async function runDailyIntelligenceRefresh() {
  try {
    const result = await apiFetch('/api/jobs/daily-intelligence-refresh', { method: 'POST' });
    showToast(`Refresh complete: ${result.recorded_alerts || 0} alerts recorded`, 'success');
    await Promise.all([loadSystemStatus(), loadEarlyWarningAlerts(), loadAuditLogs()]);
  } catch (err) {
    showToast('Refresh failed: ' + err.message, 'error');
  }
}

async function loadUsersList() {
  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;

  try {
    const data = await apiFetch('/api/users');
    if (!data) return;

    tbody.innerHTML = data.map(u => {
      const roleClass = u.role === 'Admin' ? 'badge-admin' : 'badge-investigator';
      const initials  = u.username.slice(0,2).toUpperCase();
      return `
        <tr>
          <td style="font-family:monospace;font-weight:600;color:var(--color-primary)">${u.username}</td>
          <td>
            <div style="font-weight:600">${u.username}</div>
            <div style="font-size:11px;color:var(--color-text-muted)">${u.role}</div>
          </td>
          <td><span class="badge ${roleClass}">${u.role}</span></td>
          <td style="font-size:12px;font-family:monospace">—</td>
          <td><span class="badge badge-active">Active</span></td>
          <td>
            <div style="display:flex;gap:6px">
              <button class="btn btn-outline-danger btn-sm" onclick="deleteUser('${u.username}')">Remove</button>
            </div>
          </td>
        </tr>`;
    }).join('');
  } catch (err) {
    showToast('Failed to load users: ' + err.message, 'error');
  }
}

async function addUser() {
  const username = document.getElementById('new-username')?.value?.trim();
  const fullname = document.getElementById('new-fullname')?.value?.trim();
  const password = document.getElementById('new-password')?.value;
  const role     = document.getElementById('new-role')?.value;
  const btn      = document.querySelector('#add-user-modal .btn-accent');

  if (!username || !password || !role) { showToast('All fields are required', 'warning'); return; }
  if (password.length < 6)             { showToast('Password must be at least 6 characters', 'warning'); return; }

  btn.disabled = true;
  btn.textContent = 'Adding…';

  try {
    await apiFetch('/api/users', {
      method: 'POST',
      body: JSON.stringify({ username, password, role })
    });

    const modal = document.getElementById('add-user-modal');
    if (modal) modal.style.display = 'none';
    showToast(`User "${username}" created as ${role}`, 'success');
    await Promise.all([loadUsersList(), loadAuditLogs()]);

    // Clear form
    ['new-username','new-fullname','new-password','new-role'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
  } catch (err) {
    showToast('Failed to create user: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Add User';
  }
}

async function deleteUser(username) {
  if (!confirm(`Remove user "${username}"? This cannot be undone.`)) return;

  try {
    await apiFetch(`/api/users/${username}`, { method: 'DELETE' });
    showToast(`User "${username}" removed`, 'success');
    await Promise.all([loadUsersList(), loadAuditLogs()]);
  } catch (err) {
    showToast('Failed to remove user: ' + err.message, 'error');
  }
}

function activateUser(name)   { showToast(`Activate user: backend integration needed`, 'info'); }
function deactivateUser(name) { showToast(`Deactivate user: backend integration needed`, 'info'); }

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE ROUTER — called on DOMContentLoaded for each page
// ═══════════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {
  const page = location.pathname.split('/').pop() || 'index.html';

  // Run auth guard for all pages
  if (!await authGuard()) return;

  // Page-specific init
  switch (page) {
    case 'index.html':
    case '':
      initPasswordToggle();
      initParticleNetwork('particle-canvas');
      break;
    case 'dashboard.html':
      initDashboardCharts();
      break;
    case 'chat.html':
      initChat();
      break;
    case 'network.html':
      // Check if launched with offender param
      (async () => {
        const offId = new URLSearchParams(location.search).get('offender');
        if (offId) {
          const data = await apiFetch(`/api/network/offender/${offId}`).catch(()=>null);
          if (data?.graph) { renderCytoscapeGraph(data.graph, data.metrics); return; }
        }
        initNetworkGraph();
      })();
      break;
    case 'heatmap.html':
      initHeatmap();
      break;
    case 'offenders.html':
      initOffendersPage();
      break;
    case 'reports.html':
      initReportsPage();
      break;
    case 'users.html':
      initUsersPage();
      break;
  }
});

// ─── CSS Animation for toast ──────────────────────────────────────────────────
const style = document.createElement('style');
style.textContent = `
@keyframes slideUp {
  from { transform: translateY(16px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
.typing-bubble { display:flex; gap:4px; align-items:center; padding:8px 12px; }
.typing-dot {
  width:6px; height:6px; background:#2A7F7F; border-radius:50%;
  animation: typingBounce 1.2s infinite;
}
.typing-dot:nth-child(2) { animation-delay:.2s; }
.typing-dot:nth-child(3) { animation-delay:.4s; }
@keyframes typingBounce {
  0%,60%,100% { transform:translateY(0); }
  30% { transform:translateY(-6px); }
}
.detail-panel { transition: transform .3s ease; transform: translateX(100%); }
.detail-panel.open { transform: translateX(0); }

.chat-speak-btn {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: none;
  border: none;
  color: var(--color-secondary, #2A7F7F);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: background 0.2s, color 0.2s;
  margin-left: 8px;
}
.chat-speak-btn:hover {
  background: rgba(42, 127, 127, 0.1);
  color: var(--color-primary);
}
.chat-speak-btn.speaking {
  color: var(--color-danger, #B91C1C);
  background: rgba(185, 28, 28, 0.1);
}
`;
document.head.appendChild(style);


// ─── Text-to-Speech (TTS) ─────────────────────────────────────────────────────
// Uses instant browser speech first, with server gTTS as a fallback.
let _ttsAudio = null;
let _ttsAbortController = null;
let currentlySpeakingBubble = null;
let _ttsMode = null;

/**
 * readAloud — speaks chat text quickly and toggles stop/start reliably.
 * @param {string} text       - The text to speak
 * @param {string} langCode   - 'en' or 'kn'
 * @param {Element} buttonEl  - The speak button element (for toggle/stop UI)
 */
async function readAloud(text, langCode, buttonEl) {
  if (currentlySpeakingBubble === buttonEl && (_ttsMode || (_ttsAudio && !_ttsAudio.paused))) {
    stopCurrentSpeech();
    return;
  }

  stopCurrentSpeech();

  const spokenText = prepareSpeechText(text);
  if (!spokenText) return;

  setSpeechButtonStop(buttonEl);
  buttonEl.classList.add('speaking');
  currentlySpeakingBubble = buttonEl;

  if (startBrowserSpeech(spokenText, langCode, buttonEl)) return;
  await startServerSpeech(spokenText, langCode, buttonEl);
}

function prepareSpeechText(text) {
  return String(text || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/#+\s*/g, '')
    .replace(/[-•]\s+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1200);
}

function startBrowserSpeech(text, langCode, buttonEl) {
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return false;

  const lang = langCode === 'kn' || langCode === 'kn-IN' ? 'kn-IN' : 'en-IN';
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = lang.startsWith('kn') ? 1.05 : 1.12;
  utterance.pitch = 1;
  utterance.volume = 1;

  const voices = window.speechSynthesis.getVoices();
  const matchingVoice = voices.find(v => v.lang === lang) || voices.find(v => v.lang?.startsWith(lang.slice(0, 2)));
  if (matchingVoice) utterance.voice = matchingVoice;

  utterance.onend = () => {
    if (currentlySpeakingBubble === buttonEl) {
      resetSpeechButton(buttonEl);
      currentlySpeakingBubble = null;
      _ttsMode = null;
    }
  };
  utterance.onerror = () => {
    if (currentlySpeakingBubble === buttonEl) {
      resetSpeechButton(buttonEl);
      currentlySpeakingBubble = null;
      _ttsMode = null;
    }
  };

  window.speechSynthesis.cancel();
  _ttsMode = 'browser';
  window.speechSynthesis.speak(utterance);
  return true;
}

async function startServerSpeech(text, langCode, buttonEl) {
  try {
    const langMap = { 'en': 'en', 'en-US': 'en', 'en-IN': 'en', 'kn': 'kn', 'kn-IN': 'kn' };
    const ttsLang = langMap[langCode] || 'en';

    _ttsAbortController = new AbortController();
    _ttsMode = 'server';
    const res = await fetch(`${API_BASE}/api/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({ text: text, language: ttsLang }),
      signal: _ttsAbortController.signal
    });

    if (!res.ok) throw new Error(`TTS API error: ${res.status}`);

    const audioBlob = await res.blob();
    const audioUrl  = URL.createObjectURL(audioBlob);
    const audio     = new Audio(audioUrl);
    _ttsAudio = audio;

    audio.onended = () => {
      resetSpeechButton(buttonEl);
      if (currentlySpeakingBubble === buttonEl) currentlySpeakingBubble = null;
      URL.revokeObjectURL(audioUrl);
      _ttsAudio = null;
      _ttsMode = null;
    };

    audio.onerror = () => {
      resetSpeechButton(buttonEl);
      if (currentlySpeakingBubble === buttonEl) currentlySpeakingBubble = null;
      URL.revokeObjectURL(audioUrl);
      _ttsAudio = null;
      _ttsMode = null;
      showToast('Audio playback failed', 'error');
    };

    audio.play();

  } catch (err) {
    if (err.name === 'AbortError') return;
    console.error('TTS failed:', err);
    resetSpeechButton(buttonEl);
    currentlySpeakingBubble = null;
    _ttsAudio = null;
    _ttsMode = null;
    showToast(`Text-to-speech failed: ${err.message}`, 'error');
  }
}

function stopCurrentSpeech() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  if (_ttsAbortController) {
    _ttsAbortController.abort();
    _ttsAbortController = null;
  }
  if (_ttsAudio) {
    _ttsAudio.pause();
    _ttsAudio.currentTime = 0;
    _ttsAudio = null;
  }
  if (currentlySpeakingBubble) resetSpeechButton(currentlySpeakingBubble);
  currentlySpeakingBubble = null;
  _ttsMode = null;
}

function setSpeechButtonStop(btn) {
  btn.innerHTML = `
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:2px">
      <rect x="4" y="4" width="16" height="16" rx="2" ry="2"/>
    </svg>
    Stop
  `;
}

function resetSpeechButton(btn) {
  if (!btn) return;
  btn.innerHTML = `
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:2px">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
    </svg>
    Speak
  `;
  btn.classList.remove('speaking');
}

function toggleNetworkFullscreen() {
  const container = document.getElementById('network-container');
  const icon = document.getElementById('fullscreen-icon');
  if (!container || !icon) return;

  const isMaximized = container.classList.toggle('maximized');

  if (isMaximized) {
    icon.innerHTML = `<path d="M4 14h6v6m10-6h-6v6M4 10h6V4m10 6h-6V4" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    showToast('Graph view expanded', 'info');
  } else {
    icon.innerHTML = `<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" stroke="currentColor" stroke-width="2.5"/>`;
    showToast('Graph view restored', 'info');
  }

  if (_cyInstance) {
    setTimeout(() => {
      _cyInstance.resize();
      _cyInstance.fit();
    }, 150);
  }
}

// ─── PDF Export Functions for various features ─────────────────────────────────

async function exportOffenderPDF() {
  const offenderIdEl = document.getElementById('offender-id-display');
  if (!offenderIdEl) { showToast('No offender profile loaded', 'warning'); return; }
  const offenderId = offenderIdEl.textContent.trim();
  if (!offenderId || offenderId === 'Identity') { showToast('Please load an offender profile first', 'warning'); return; }

  showToast('Generating offender dossier PDF…', 'info');
  try {
    const res = await fetch(`${API_BASE}/api/reports/offender`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
      body: JSON.stringify({ offender_id: offenderId })
    });
    if (!res.ok) throw new Error('Report generation failed');
    const blob = await res.blob();
    triggerFileDownload(blob, `offender_${offenderId}.pdf`);
    showToast('Offender dossier PDF downloaded', 'success');
  } catch (err) {
    showToast('Export failed: ' + err.message, 'error');
  }
}

async function exportNetworkPDF() {
  if (!_cyInstance) { showToast('Network graph not initialized', 'warning'); return; }
  
  showToast('Generating network graph PDF…', 'info');
  try {
    const pngBase64 = _cyInstance.png({ full: true, scale: 2, bg: '#ffffff' });
    const district = document.getElementById('filter-district')?.value || 'All';
    const crimeType = document.getElementById('filter-crime')?.value || 'All';
    
    const res = await fetch(`${API_BASE}/api/reports/network`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
      body: JSON.stringify({ image_data: pngBase64, district, crime_type: crimeType })
    });
    if (!res.ok) throw new Error('Network report generation failed');
    const blob = await res.blob();
    triggerFileDownload(blob, `network_${Date.now()}.pdf`);
    showToast('Network graph PDF downloaded', 'success');
  } catch (err) {
    showToast('Network export failed: ' + err.message, 'error');
  }
}

function exportHeatmapPDF() {
  showToast('Preparing map print view…', 'info');
  window.print();
}

function exportDashboardPDF() {
  showToast('Preparing dashboard print view…', 'info');
  window.print();
}

function triggerFileDownload(blob, filename) {
  // Force application/pdf MIME type regardless of server response headers
  const pdfBlob = new Blob([blob], { type: 'application/pdf' });
  const url = URL.createObjectURL(pdfBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  // Delay cleanup to let browser fully initiate the download
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}

// Global exposure
window.readAloud = readAloud;
window.exportOffenderPDF = exportOffenderPDF;
window.exportNetworkPDF = exportNetworkPDF;
window.exportHeatmapPDF = exportHeatmapPDF;
window.exportDashboardPDF = exportDashboardPDF;
window.toggleNetworkFullscreen = toggleNetworkFullscreen;
// Heatmap district-click functions
window.selectDistrict   = selectDistrict;
window.showAllDistricts = showAllDistricts;
window.onCrimeTypeChange = onCrimeTypeChange;

// ─── Direct Report Download Helpers ───────────────────────────────────────────
async function downloadReportDirectHelper(endpoint, body, defaultDownloadName) {
  showToast('Generating report...', 'info');
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${getToken()}` 
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Report generation failed');
    }

    const blob = await res.blob();
    const filename = res.headers.get('content-disposition')?.split('filename=')[1]?.replace(/['"]/g, '') || defaultDownloadName;
    triggerFileDownload(blob, filename);
    showToast('Report downloaded successfully', 'success');
    
    // Refresh the reports archive list
    await loadReportsList();
  } catch (err) {
    showToast('Failed to download report: ' + err.message, 'error');
  }
}

async function downloadCaseReportDirect() {
  const firId = document.getElementById('direct-fir-id')?.value?.trim();
  if (!firId) {
    showToast('Please enter a FIR ID', 'warning');
    return;
  }
  await downloadReportDirectHelper('/api/reports/case', { fir_id: firId.toUpperCase() }, `case_report_${firId.toUpperCase()}.pdf`);
}

async function downloadDistrictReportDirect() {
  const district = document.getElementById('direct-district-name')?.value?.trim();
  if (!district) {
    showToast('Please enter a District Name', 'warning');
    return;
  }
  await downloadReportDirectHelper('/api/reports/district', { district: district }, `district_report_${district.replace(/\s+/g, '_')}.pdf`);
}

async function downloadRecommendationsReportDirect() {
  const district = document.getElementById('direct-rec-district')?.value?.trim() || null;
  const crimeType = document.getElementById('direct-rec-crime')?.value?.trim() || null;
  
  await downloadReportDirectHelper(
    '/api/reports/recommendations', 
    { district: district, crime_type: crimeType }, 
    `ai_recommendations_${district ? district.replace(/\s+/g, '_') : 'All'}_${crimeType ? crimeType.replace(/\s+/g, '_') : 'All'}.pdf`
  );
}

window.downloadCaseReportDirect = downloadCaseReportDirect;
window.downloadDistrictReportDirect = downloadDistrictReportDirect;
window.downloadRecommendationsReportDirect = downloadRecommendationsReportDirect;



// ═══════════════════════════════════════════════════════════════════════════
// NAMMA KSP — ADVANCED ENHANCEMENTS v2
// Dark Mode, Global Search, KPI Animations, FIR Drawer, Calendar,
// Network Enhancements, Offender Timeline/Ring, Chat Typing/Templates/Bookmarks,
// FAB, Heatmap Overlays, Report Progress, CSV Export
// ═══════════════════════════════════════════════════════════════════════════

// ─── DARK MODE ──────────────────────────────────────────────────────────────
function toggleDarkMode() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const newTheme = isDark ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('cl_theme', newTheme);
  _updateThemeIcon(newTheme);
}

function _updateThemeIcon(theme) {
  const moon = document.getElementById('theme-icon-moon');
  const sun  = document.getElementById('theme-icon-sun');
  if (!moon || !sun) return;
  if (theme === 'dark') { moon.style.display = 'none'; sun.style.display = ''; }
  else                  { moon.style.display = '';     sun.style.display = 'none'; }
}

function initDarkMode() {
  const saved = localStorage.getItem('cl_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  _updateThemeIcon(saved);
}

// ─── IST CLOCK ───────────────────────────────────────────────────────────────
function initISTClock() {
  function tick() {
    const el = document.getElementById('ist-clock');
    if (!el) return;
    const now = new Date();
    const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const hh = String(ist.getHours()).padStart(2,'0');
    const mm = String(ist.getMinutes()).padStart(2,'0');
    const ss = String(ist.getSeconds()).padStart(2,'0');
    el.textContent = `${hh}:${mm}:${ss} IST`;
  }
  tick();
  setInterval(tick, 1000);
}

// ─── PAGE PROGRESS BAR ───────────────────────────────────────────────────────
function startPageProgress() {
  const bar = document.getElementById('page-progress-bar');
  if (!bar) return;
  bar.style.width = '0%';
  bar.classList.remove('done');
  let p = 0;
  const iv = setInterval(() => {
    p += Math.random() * 15;
    if (p >= 90) { clearInterval(iv); p = 90; }
    bar.style.width = p + '%';
  }, 150);
  return iv;
}

function finishPageProgress() {
  const bar = document.getElementById('page-progress-bar');
  if (!bar) return;
  bar.style.width = '100%';
  setTimeout(() => { bar.classList.add('done'); }, 300);
}

// ─── GLOBAL SEARCH (CTRL+K) ──────────────────────────────────────────────────
let _gsResults = [];
let _gsActive  = -1;

function openGlobalSearch() {
  const overlay = document.getElementById('global-search-overlay');
  if (!overlay) return;
  overlay.classList.add('open');
  const input = document.getElementById('global-search-input');
  if (input) { input.value = ''; input.focus(); }
  _gsActive = -1;
  _renderGSRecent();
}

function closeGlobalSearch() {
  const overlay = document.getElementById('global-search-overlay');
  if (overlay) overlay.classList.remove('open');
}

function _renderGSRecent() {
  const el = document.getElementById('global-search-results');
  if (!el) return;
  const recent = JSON.parse(localStorage.getItem('cl_gs_recent') || '[]');
  if (!recent.length) {
    el.innerHTML = '<div class="global-search-empty">Type to search across FIRs, offenders and districts...</div>';
    return;
  }
  el.innerHTML = '<div class="global-search-section-title">Recent Searches</div>' +
    recent.map(r =>
      `<div class="global-search-item" onclick="window.location='${r.url}'">
        <div class="global-search-item-icon" style="background:var(--color-surface-2)">${r.icon}</div>
        <div><div class="global-search-item-name">${r.name}</div><div class="global-search-item-sub">${r.sub}</div></div>
      </div>`
    ).join('');
}

function _saveGSRecent(item) {
  let recent = JSON.parse(localStorage.getItem('cl_gs_recent') || '[]');
  recent = [item, ...recent.filter(r => r.url !== item.url)].slice(0, 5);
  localStorage.setItem('cl_gs_recent', JSON.stringify(recent));
}

async function runGlobalSearch(query) {
  const el = document.getElementById('global-search-results');
  if (!el) return;
  if (!query.trim()) { _renderGSRecent(); return; }

  el.innerHTML = '<div class="global-search-empty">Searching...</div>';

  try {
    const [firData, offData] = await Promise.allSettled([
      apiFetch(`/api/firs?limit=100`),
      apiFetch(`/api/offenders/high-risk?limit=100`)
    ]);

    const q = query.toLowerCase();
    const firList  = firData.status  === 'fulfilled' ? (firData.value?.firs  || []) : [];
    const offList  = offData.status  === 'fulfilled' ? (offData.value?.offenders || []) : [];

    const firMatches = firList.filter(f =>
      (f.fir_id||'').toLowerCase().includes(q) ||
      (f.crime_type||'').toLowerCase().includes(q) ||
      (f.district||'').toLowerCase().includes(q) ||
      (f.accused_name||'').toLowerCase().includes(q)
    ).slice(0, 5);

    const offMatches = offList.filter(o =>
      (o.accused_name||'').toLowerCase().includes(q) ||
      (o.offender_id||'').toLowerCase().includes(q) ||
      (o.district||'').toLowerCase().includes(q)
    ).slice(0, 5);

    // District matches from FIRs
    const districts = [...new Set(firList.map(f => f.district).filter(Boolean))];
    const distMatches = districts.filter(d => d.toLowerCase().includes(q)).slice(0, 3);

    let html = '';
    if (firMatches.length) {
      html += `<div class="global-search-section-title">FIRs (${firMatches.length})</div>`;
      firMatches.forEach(f => {
        const url = `dashboard.html`;
        html += `<div class="global-search-item" onclick="_gsNavigate('${f.fir_id}','fir','${url}')">
          <div class="global-search-item-icon" style="background:rgba(28,43,74,0.1);color:var(--color-primary)">📋</div>
          <div><div class="global-search-item-name">${f.fir_id}</div><div class="global-search-item-sub">${f.crime_type||''} &bull; ${f.district||''}</div></div>
        </div>`;
      });
    }
    if (offMatches.length) {
      html += `<div class="global-search-section-title">Offenders (${offMatches.length})</div>`;
      offMatches.forEach(o => {
        html += `<div class="global-search-item" onclick="_gsNavigate('${o.offender_id}','offender','offenders.html?id=${o.offender_id}')">
          <div class="global-search-item-icon" style="background:rgba(185,28,28,0.1);color:var(--color-danger)">👤</div>
          <div><div class="global-search-item-name">${o.accused_name||o.offender_id}</div><div class="global-search-item-sub">${o.offender_id} &bull; ${o.district||''}</div></div>
        </div>`;
      });
    }
    if (distMatches.length) {
      html += `<div class="global-search-section-title">Districts (${distMatches.length})</div>`;
      distMatches.forEach(d => {
        html += `<div class="global-search-item" onclick="_gsNavigate('${d}','district','heatmap.html')">
          <div class="global-search-item-icon" style="background:rgba(42,127,127,0.1);color:var(--color-secondary)">🗺️</div>
          <div><div class="global-search-item-name">${d}</div><div class="global-search-item-sub">District &bull; View on Heatmap</div></div>
        </div>`;
      });
    }
    if (!html) html = `<div class="global-search-empty">No results for "${query}"</div>`;
    el.innerHTML = html;
  } catch(e) {
    el.innerHTML = '<div class="global-search-empty">Search unavailable. Please ensure you are logged in.</div>';
  }
}

function _gsNavigate(id, type, url) {
  _saveGSRecent({ icon: type==='fir'?'📋':type==='offender'?'👤':'🗺️', name: id, sub: type, url });
  closeGlobalSearch();
  window.location.href = url;
}

function initGlobalSearch() {
  const input = document.getElementById('global-search-input');
  if (input) {
    let timer;
    input.addEventListener('input', e => {
      clearTimeout(timer);
      timer = setTimeout(() => runGlobalSearch(e.target.value), 300);
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeGlobalSearch();
    });
  }
}

// ─── KEYBOARD SHORTCUTS ──────────────────────────────────────────────────────
function closeShortcuts() {
  const el = document.getElementById('shortcuts-overlay');
  if (el) el.classList.remove('open');
}

function initKeyboardShortcuts() {
  let gBuffer = '';
  document.addEventListener('keydown', e => {
    const tag = (e.target.tagName || '').toLowerCase();
    const inInput = ['input','textarea','select'].includes(tag);

    // Ctrl+K — global search
    if (e.ctrlKey && e.key === 'k') { e.preventDefault(); openGlobalSearch(); return; }
    // Ctrl+D — dark mode
    if (e.ctrlKey && e.key === 'd') { e.preventDefault(); toggleDarkMode(); return; }
    // Escape
    if (e.key === 'Escape') {
      closeGlobalSearch();
      closeShortcuts();
      closeFIRDrawer();
      return;
    }
    if (inInput) return;
    // ? — shortcuts
    if (e.key === '?') {
      const el = document.getElementById('shortcuts-overlay');
      if (el) el.classList.add('open');
      return;
    }
    // G then D/C/H/N navigation
    if (e.key === 'g' || e.key === 'G') { gBuffer = 'g'; setTimeout(() => gBuffer='', 1500); return; }
    if (gBuffer === 'g') {
      const map = { d:'dashboard.html', c:'chat.html', h:'heatmap.html', n:'network.html', o:'offenders.html', r:'reports.html' };
      const dest = map[e.key.toLowerCase()];
      if (dest) { gBuffer=''; window.location.href = dest; }
    }
  });
}

// ─── ANIMATED KPI COUNTER ────────────────────────────────────────────────────
function animateCounter(el, target, duration = 800, prefix = '', suffix = '') {
  if (!el) return;
  const start = 0;
  const startTime = performance.now();
  function update(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(start + (target - start) * ease);
    el.textContent = prefix + current.toLocaleString('en-IN') + suffix;
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

// ─── MINI SPARKLINE ──────────────────────────────────────────────────────────
function renderSparkline(containerId, values, color) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const W = 80, H = 30;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - ((v - min) / (max - min || 1)) * H;
    return `${x},${y}`;
  }).join(' ');
  container.innerHTML = `<div class="kpi-sparkline"><svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <polyline fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" points="${pts}"/>
    <circle cx="${pts.split(' ').pop().split(',')[0]}" cy="${pts.split(' ').pop().split(',')[1]}" r="3" fill="${color}"/>
  </svg></div>`;
}

// ─── FIR TABLE ENHANCEMENTS ──────────────────────────────────────────────────
let _firTableData = [];
let _firFilter    = 'all';
let _firSort      = { col: null, dir: 'asc' };

function filterFIRTable(btn, status) {
  _firFilter = status;
  document.querySelectorAll('.fir-chip').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  _renderFIRTable();
}

function _renderFIRTable() {
  const tbody = document.getElementById('fir-table-body');
  if (!tbody || !_firTableData.length) return;
  let rows = _firTableData;
  if (_firFilter !== 'all') rows = rows.filter(r => (r.status||'').toLowerCase() === _firFilter.toLowerCase());
  tbody.innerHTML = rows.map(r => `
    <tr onclick="openFIRDrawer(${JSON.stringify(JSON.stringify(r))})" style="cursor:pointer">
      <td><span class="fir-id">${r.fir_id||''}</span></td>
      <td>${r.crime_type||''}</td>
      <td>${r.district||''}</td>
      <td>${r.date_filed ? r.date_filed.slice(0,10) : ''}</td>
      <td>${r.accused_name||'—'}</td>
      <td><span class="badge badge-${(r.status||'open').toLowerCase().replace(' ','-')}">${r.status||'Open'}</span></td>
      <td><button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();openFIRDrawer(${JSON.stringify(JSON.stringify(r))})">View</button></td>
    </tr>`).join('') || `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--color-text-muted)">No FIRs found for this filter.</td></tr>`;
}

// ─── FIR DETAIL DRAWER ───────────────────────────────────────────────────────
let _currentFIR = null;

function openFIRDrawer(firJson) {
  const fir = typeof firJson === 'string' ? JSON.parse(firJson) : firJson;
  _currentFIR = fir;
  document.getElementById('fir-drawer-id').textContent   = fir.fir_id || '—';
  document.getElementById('fir-drawer-crime').textContent = fir.crime_type || '—';
  document.getElementById('fdd-district').textContent     = fir.district || '—';
  document.getElementById('fdd-date').textContent         = (fir.date_filed||'').slice(0,10) || '—';
  document.getElementById('fdd-status').innerHTML         = `<span class="badge badge-${(fir.status||'open').toLowerCase().replace(' ','-')}">${fir.status||'Open'}</span>`;
  document.getElementById('fdd-accused').textContent      = fir.accused_name || '—';
  document.getElementById('fdd-victim').textContent       = fir.victim_name  || '—';
  const aiBtn = document.getElementById('fdd-ai-btn');
  if (aiBtn) aiBtn.href = `chat.html?fir=${fir.fir_id}`;
  document.getElementById('fir-drawer-overlay').classList.add('open');
  document.getElementById('fir-drawer').classList.add('open');
}

function closeFIRDrawer() {
  const ov = document.getElementById('fir-drawer-overlay');
  const dr = document.getElementById('fir-drawer');
  if (ov) ov.classList.remove('open');
  if (dr) dr.classList.remove('open');
}

function copyFIRId() {
  if (_currentFIR) {
    navigator.clipboard.writeText(_currentFIR.fir_id).then(() => showToast('FIR ID copied!','success'));
  }
}

// ─── CSV EXPORT ──────────────────────────────────────────────────────────────
function exportFIRTableCSV() {
  if (!_firTableData.length) { showToast('No data to export','warning'); return; }
  const headers = ['FIR ID','Crime Type','District','Date Filed','Accused','Victim','Status'];
  const rows = _firTableData.map(r => [
    r.fir_id||'', r.crime_type||'', r.district||'',
    (r.date_filed||'').slice(0,10), r.accused_name||'', r.victim_name||'', r.status||''
  ].map(v => `"${v.replace(/"/g,'""')}"`).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a'); a.href = url; a.download = 'firs_export.csv'; a.click();
  URL.revokeObjectURL(url);
  showToast('CSV exported!','success');
}

// ─── FLOATING ACTION BUTTON (FAB) ────────────────────────────────────────────
function toggleFAB() {
  const btn  = document.getElementById('fab-main-btn');
  const menu = document.getElementById('fab-menu');
  if (!btn || !menu) return;
  btn.classList.toggle('open');
  menu.classList.toggle('open');
}

// ─── CRIME CALENDAR HEATMAP ──────────────────────────────────────────────────
async function initCrimeCalendar() {
  const container = document.getElementById('crime-calendar');
  const monthsEl  = document.getElementById('cal-months');
  const tooltip   = document.getElementById('cal-tooltip');
  if (!container) return;

  // Build 365-day data from API
  let dayMap = {};
  try {
    const data = await apiFetch('/api/analytics/monthly-trends');
    // Monthly data → distribute roughly per day (synthetic for demo)
    if (data && data.labels) {
      data.labels.forEach((mon, i) => {
        const val = data.counts ? data.counts[i] : 0;
        // Spread across days of month
        const daysInMon = 30;
        for (let d = 0; d < daysInMon; d++) {
          const date = new Date(2025, i, d + 1);
          const key  = date.toISOString().slice(0,10);
          dayMap[key] = Math.floor(val / daysInMon) + Math.floor(Math.random() * 8);
        }
      });
    }
  } catch(e) {
    // Fallback: random data
    const base = new Date('2025-01-01');
    for (let i = 0; i < 365; i++) {
      const d = new Date(base); d.setDate(d.getDate() + i);
      dayMap[d.toISOString().slice(0,10)] = Math.floor(Math.random() * 30);
    }
  }

  const maxVal = Math.max(...Object.values(dayMap), 1);
  const start  = new Date('2025-01-05'); // Start on Sunday
  const end    = new Date('2025-12-31');

  // Render month labels
  if (monthsEl) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    monthsEl.innerHTML = months.map(m => `<span class="crime-calendar-month">${m}</span>`).join('');
  }

  // Render cells
  container.innerHTML = '';
  let weekDiv = document.createElement('div');
  weekDiv.className = 'crime-calendar-week';

  for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
    if (dt.getDay() === 0 && container.children.length > 0) {
      container.appendChild(weekDiv);
      weekDiv = document.createElement('div');
      weekDiv.className = 'crime-calendar-week';
    }
    const key = dt.toISOString().slice(0,10);
    const val = dayMap[key] || 0;
    const level = val === 0 ? 0 : val < maxVal*0.25 ? 1 : val < maxVal*0.5 ? 2 : val < maxVal*0.75 ? 3 : 4;

    const cell = document.createElement('div');
    cell.className = `crime-calendar-cell level-${level}`;
    cell.dataset.date = key;
    cell.dataset.count = val;

    cell.addEventListener('mouseenter', (e) => {
      const t = document.getElementById('cal-tooltip');
      if (t) {
        t.textContent = `${key} — ${val} crimes`;
        t.style.display = 'block';
        t.style.left = (e.clientX + 10) + 'px';
        t.style.top  = (e.clientY - 30) + 'px';
      }
    });
    cell.addEventListener('mouseleave', () => {
      const t = document.getElementById('cal-tooltip');
      if (t) t.style.display = 'none';
    });

    weekDiv.appendChild(cell);
  }
  if (weekDiv.children.length) container.appendChild(weekDiv);
}

// ─── DYNAMIC RADAR CHART FOR OFFENDERS ───────────────────────────────────────
let _offenderRadarInstance = null;
function initRadarChart(profile) {
  const canvas = document.getElementById('offender-radar-canvas');
  if (!canvas) return;

  if (_offenderRadarInstance) {
    _offenderRadarInstance.destroy();
    _offenderRadarInstance = null;
  }

  const priorFirsVal = Math.min(100, (profile.total_firs_filed || 0) * 15);
  const severityVal = Math.min(100, profile.risk_score || 50);
  const activeFirs = (profile.fir_history || []).filter(f => f.status === 'Open' || f.status === 'Under Investigation').length;
  const activeCasesVal = Math.min(100, activeFirs * 40);
  const districts = new Set((profile.fir_history || []).map(f => f.district).filter(Boolean));
  const geoSpreadVal = Math.min(100, districts.size * 35);
  const recidivismVal = Math.min(100, (profile.total_firs_filed || 1) * 20);

  const data = [priorFirsVal, severityVal, activeCasesVal, geoSpreadVal, recidivismVal];
  const labels = ['Prior FIRs', 'Crime Severity', 'Active Cases', 'Geographic Spread', 'Recidivism'];

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#94A3B8' : '#6B7280';
  const gridColor = isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB';
  const fillColor = isDark ? 'rgba(239,68,68,0.2)' : 'rgba(185,28,28,0.2)';
  const strokeColor = isDark ? '#EF4444' : '#B91C1C';

  _offenderRadarInstance = new Chart(canvas, {
    type: 'radar',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: fillColor,
        borderColor: strokeColor,
        borderWidth: 1.5,
        pointBackgroundColor: strokeColor,
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: strokeColor
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        r: {
          grid: { color: gridColor },
          angleLines: { color: gridColor },
          pointLabels: { color: textColor, font: { size: 9, weight: 'bold' } },
          ticks: { display: false, maxTicksLimit: 5 },
          min: 0,
          max: 100
        }
      }
    }
  });
}

// ─── OFFENDER TIMELINE VIEW TOGGLING ─────────────────────────────────────────
let _currentOffender = null;
function switchFIRView(type, btn) {
  const table = document.querySelector('#offender-profile-section .table-wrapper');
  const timeline = document.getElementById('fir-timeline-view');
  if (!table || !timeline) return;

  document.querySelectorAll('.timeline-view-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  if (type === 'table') {
    table.style.display = '';
    timeline.style.display = 'none';
  } else {
    table.style.display = 'none';
    timeline.style.display = '';
    renderFIRTimeline();
  }
}

function renderFIRTimeline() {
  const container = document.getElementById('fir-timeline-view');
  if (!container || !_currentOffender || !_currentOffender.fir_history) return;

  const firs = _currentOffender.fir_history;
  if (!firs.length) {
    container.innerHTML = '<div style="text-align:center;color:var(--color-text-muted);padding:16px">No timeline data available.</div>';
    return;
  }

  const sorted = [...firs].sort((a,b) => new Date(b.date) - new Date(a.date));
  let html = '';
  let lastYear = null;

  sorted.forEach(f => {
    const yr = new Date(f.date).getFullYear();
    if (yr !== lastYear) {
      lastYear = yr;
      html += `<div class="timeline-year-marker">${yr}</div>`;
    }
    
    const statusClass = f.status === 'Open' ? 'badge-open' : f.status === 'Closed' ? 'badge-closed' : 'badge-investigating';
    html += `
      <div class="timeline-item" onclick="viewFIR('${f.fir_id}')" style="cursor:pointer">
        <div class="timeline-dot" style="color:var(--color-secondary)"></div>
        <div class="timeline-card">
          <div class="timeline-card-top">
            <span style="font-weight:700;font-family:monospace;color:var(--color-text)">${f.fir_id}</span>
            <span class="badge ${statusClass}">${f.status}</span>
          </div>
          <div style="font-size:13px;font-weight:600;color:var(--color-primary);margin-bottom:4px">${f.crime_type}</div>
          <div style="font-size:11px;color:var(--color-text-muted)">
            District: ${f.district} &middot; Date: ${f.date}
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// ─── HEATMAP DISTRICT RISK GUIDANCE ──────────────────────────────────────────
async function renderDistrictRiskGuidance(districtName) {
  const panel = document.getElementById('district-risk-guidance-panel');
  if (!panel) return;

  try {
    const data = await apiFetch(`/api/analytics/district-crime-breakdown?district=${encodeURIComponent(districtName)}`);
    if (!data || !data.length) {
      panel.style.display = 'none';
      return;
    }
    panel.style.display = 'block';

    let totalCount = 0;
    let topCrimeType = 'Other';
    let maxCount = 0;

    data.forEach(r => {
      totalCount += r.count || 0;
      if ((r.count || 0) > maxCount) {
        maxCount = r.count;
        topCrimeType = r.crime_type;
      }
    });

    let threatText = 'LOW';
    let threatColor = '#166534'; // Green
    if (totalCount > 1000) {
      threatText = 'CRITICAL';
      threatColor = '#991B1B'; // Red
    } else if (totalCount > 400) {
      threatText = 'HIGH';
      threatColor = '#B45309'; // Dark Orange/Amber
    } else if (totalCount > 200) {
      threatText = 'MEDIUM';
      threatColor = '#1D4ED8'; // Blue
    }

    const threatEl = document.getElementById('risk-val-threat');
    if (threatEl) {
      threatEl.textContent = threatText;
      threatEl.style.backgroundColor = threatColor;
      threatEl.style.color = '#FFFFFF';
    }

    const topCrimeEl = document.getElementById('risk-val-topcrime');
    if (topCrimeEl) topCrimeEl.textContent = topCrimeType;

    const hotspotsCount = Math.max(1, Math.min(8, Math.ceil(totalCount / 150)));
    const hotspotsEl = document.getElementById('risk-val-hotspots');
    if (hotspotsEl) hotspotsEl.textContent = `${hotspotsCount} Active ${hotspotsCount > 1 ? 'Zones' : 'Zone'}`;

    let patrolWindow = '22:00 - 02:00';
    if (topCrimeType === 'Cyber Crime' || topCrimeType === 'Financial Fraud') {
      patrolWindow = '09:00 - 18:00 (Business Hours)';
    } else if (topCrimeType === 'Robbery' || topCrimeType === 'Theft' || topCrimeType === 'Burglary') {
      patrolWindow = '23:00 - 04:00 (Night Patrol)';
    } else if (topCrimeType === 'Assault') {
      patrolWindow = '18:00 - 23:00 (Evening Peak)';
    }
    const windowEl = document.getElementById('risk-val-window');
    if (windowEl) windowEl.textContent = patrolWindow;

    let guidanceText = 'Maintain baseline police visibility. Focus patrol units on high-traffic locations.';
    if (topCrimeType === 'Cyber Crime' || topCrimeType === 'Financial Fraud') {
      guidanceText = 'Coordinate with Cyber Crime cell. Intensify surveillance of suspected cyber hubs and verify merchant transactions in high-volume areas.';
    } else if (topCrimeType === 'Robbery' || topCrimeType === 'Theft' || topCrimeType === 'Burglary') {
      guidanceText = 'Deploy dedicated vehicle interceptors. Set up random checkposts at key exits and increase night visibility of beat police.';
    } else if (topCrimeType === 'Assault') {
      guidanceText = 'Increase foot patrols near recreational centers, markets, and public gathering areas. Deploy anti-rowdyism squads during peak evening hours.';
    } else if (topCrimeType === 'Drug Offense') {
      guidanceText = 'Deploy plainclothes intelligence officers. Monitor transport hubs and execute targeted inspections on suspected commercial properties.';
    }
    const guidanceEl = document.getElementById('risk-val-guidance');
    if (guidanceEl) guidanceEl.textContent = guidanceText;
  } catch (err) {
    console.error('Failed to render district risk guidance:', err);
  }
  translatePageUI();
}

// ─── CYTOSCAPE GRAPH LAYOUT, STATS BAR, HIGHLIGHT & ASSOCIATES ────────────────
function switchNetworkLayout(layoutName, btn) {
  if (!_cyInstance) return;
  
  // Sync tab active states in all buttons that might target this layout
  document.querySelectorAll(`.layout-tab`).forEach(b => {
    b.classList.toggle('active', b.getAttribute('onclick')?.includes(layoutName) || b.textContent.trim().toLowerCase() === layoutName.toLowerCase());
  });

  const layoutOpts = {
    name: layoutName,
    animate: true,
    animationDuration: 600,
    fit: true,
    padding: 40
  };

  try {
    const layout = _cyInstance.layout(layoutOpts);
    layout.run();
  } catch(e) {
    console.error('Cytoscape layout switch failed:', e);
  }
}

function applyIntensityFilter(val) {
  _hmIntensityMin = parseInt(val);
  const label = document.getElementById('intensity-label');
  if (label) label.textContent = `Min: ${val}`;
  // Re-render markers if map is active
  if (typeof renderHeatmapMarkers === 'function') {
    renderHeatmapMarkers(window._lastHotspots || []);
  }
}

function updateMapStatsOverlay(hotspots) {
  if (!hotspots || !hotspots.length) return;
  const countEl  = document.getElementById('mso-count');
  const topEl    = document.getElementById('mso-top');
  const filterEl = document.getElementById('mso-filter');
  if (countEl) countEl.textContent = hotspots.length;
  if (topEl) {
    const sorted = [...hotspots].sort((a,b) => (b.count||0)-(a.count||0));
    topEl.textContent = sorted[0]?.area || sorted[0]?.district || '—';
  }
  if (filterEl) {
    const sel = document.getElementById('drs-crime-select');
    filterEl.textContent = sel?.value || 'All';
  }
}

// ─── REPORT PROGRESS ─────────────────────────────────────────────────────────
function showReportProgress(containerId, fillId, stepIds) {
  const container = document.getElementById(containerId);
  const fill      = document.getElementById(fillId);
  if (!container || !fill) return;
  container.classList.add('active');
  fill.style.width = '0%';

  const steps  = stepIds.map(id => document.getElementById(id)).filter(Boolean);
  const delays = [200, 1500, 3000];
  const pcts   = [30, 65, 90];

  steps.forEach((s, i) => {
    setTimeout(() => {
      steps.forEach(ss => ss.classList.remove('active'));
      s.classList.add('active');
      fill.style.width = pcts[i] + '%';
    }, delays[i]);
  });
}

function finishReportProgress(containerId, fillId, stepIds) {
  const container = document.getElementById(containerId);
  const fill      = document.getElementById(fillId);
  if (!fill) return;
  fill.style.width = '100%';
  const steps = stepIds.map(id => document.getElementById(id)).filter(Boolean);
  steps.forEach(s => { s.classList.remove('active'); s.classList.add('done'); });
  setTimeout(() => {
    if (container) container.classList.remove('active');
  }, 1500);
}

// Enhanced report download with progress
async function downloadCaseReportDirect() {
  const firId = document.getElementById('direct-fir-id')?.value?.trim();
  if (!firId) { showToast('Please enter a FIR ID', 'warning'); return; }
  showReportProgress('report-progress-1','rpf-1',['rps-1-1','rps-1-2','rps-1-3']);
  try {
    const btn = document.querySelector('[onclick="downloadCaseReportDirect()"]');
    if (btn) { btn.disabled = true; }
    await new Promise(r => setTimeout(r, 3500));
    const response = await fetch(`${API_BASE}/api/reports/case`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({ fir_id: firId.toUpperCase() })
    });
    if (!response.ok) throw new Error((await response.json().catch(()=>({}))).detail || 'Failed');
    const blob = await response.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url; a.download = `case_report_${firId}.pdf`; a.click();
    URL.revokeObjectURL(url);
    finishReportProgress('report-progress-1','rpf-1',['rps-1-1','rps-1-2','rps-1-3']);
    showToast('Report downloaded!','success');
    setTimeout(loadReportArchive, 1000);
    if (btn) btn.disabled = false;
  } catch(e) {
    finishReportProgress('report-progress-1','rpf-1',['rps-1-1','rps-1-2','rps-1-3']);
    showToast(e.message || 'Failed to generate report', 'error');
    const btn = document.querySelector('[onclick="downloadCaseReportDirect()"]');
    if (btn) btn.disabled = false;
  }
}

async function loadReportArchive() {
  const tbody = document.getElementById('reports-tbody');
  if (!tbody) return;
  try {
    const data = await apiFetch('/api/reports/list');
    const reports = Array.isArray(data) ? data : (data?.reports || []);
    if (!reports.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--color-text-muted)">No reports generated yet.</td></tr>';
      return;
    }
    tbody.innerHTML = reports.map((r, i) => `
      <tr>
        <td><span class="report-id">RPT${String(i+1).padStart(4,'0')}</span></td>
        <td>${r.filename||r.subject||'—'}</td>
        <td><span class="badge badge-${r.type||'case'}">${r.type||'Case'}</span></td>
        <td>${(r.created_at||r.date||'').slice(0,16)||'—'}</td>
        <td>${r.generated_by||getUsername()||'—'}</td>
        <td><span class="badge badge-ready">Ready</span></td>
        <td><button onclick="downloadReportFileDirectly('${r.filename||r.id}')" class="btn btn-outline btn-sm">Download</button></td>
      </tr>`).join('');
  } catch(e) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--color-text-muted)">Could not load archive.</td></tr>';
  }
  translatePageUI();
}

async function downloadReportFileDirectly(filename) {
  try {
    showToast('Downloading report...', 'info');
    const res = await fetch(`${API_BASE}/api/reports/download/${encodeURIComponent(filename)}`);
    if (!res.ok) throw new Error('Download failed');
    const blob = await res.blob();
    triggerFileDownload(blob, filename);
    showToast('Download complete', 'success');
  } catch (err) {
    showToast('Download failed: ' + err.message, 'error');
  }
}
window.downloadReportFileDirectly = downloadReportFileDirectly;


// ─── CYTOSCAPE GRAPH ENHANCEMENTS & BOOKMARKS ──────────────────────────────────
function initNetworkMinimap() {
  if (!_cyInstance) return;
  const minimap = document.getElementById('network-minimap');
  const viewport = document.getElementById('minimap-viewport');
  if (!minimap || !viewport) return;

  const updateMinimap = () => {
    const eles = _cyInstance.elements();
    if (eles.length === 0) {
      viewport.style.width = '100%';
      viewport.style.height = '100%';
      viewport.style.left = '0%';
      viewport.style.top = '0%';
      return;
    }

    const cyBB = eles.boundingBox();
    const viewBB = _cyInstance.extent();

    const cyW = cyBB.w || 1;
    const cyH = cyBB.h || 1;

    const wFactor = Math.max(0.1, Math.min(1, viewBB.w / cyW));
    const hFactor = Math.max(0.1, Math.min(1, viewBB.h / cyH));

    const left = Math.max(0, Math.min(1 - wFactor, (viewBB.x1 - cyBB.x1) / cyW));
    const top = Math.max(0, Math.min(1 - hFactor, (viewBB.y1 - cyBB.y1) / cyH));

    viewport.style.width = (wFactor * 100) + '%';
    viewport.style.height = (hFactor * 100) + '%';
    viewport.style.left = (left * 100) + '%';
    viewport.style.top = (top * 100) + '%';
  };

  _cyInstance.off('pan zoom resize', updateMinimap);
  _cyInstance.on('pan zoom resize', updateMinimap);
  updateMinimap();
}

function renderAssociatesList(nodeId) {
  const listEl = document.getElementById('net-associates-list');
  if (!listEl || !_cyInstance) return;

  const node = _cyInstance.getElementById(nodeId);
  if (!node || node.length === 0) {
    listEl.innerHTML = '<div style="color:var(--color-text-muted)">Entity not found.</div>';
    return;
  }

  const connectedNodes = node.neighborhood('node');
  if (connectedNodes.length === 0) {
    listEl.innerHTML = '<div style="color:var(--color-text-muted)">No direct associates found.</div>';
    return;
  }

  let html = '';
  connectedNodes.forEach(assoc => {
    const data = assoc.data();
    const type = data.node_type || 'fir';
    let label = data.label || data.id;
    const cleanLabel = label.replace(/^(🔴|🟡|🛡️|📄|📍|📞)\s*👤?\s*/, '');
    
    let typeClass = 'badge-low';
    if (type === 'offender') {
      typeClass = data.risk === 'High' ? 'badge-high' : 'badge-medium';
    } else if (type === 'fir') {
      typeClass = 'badge-investigating';
    }

    html += `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
        <span style="font-weight:500;color:var(--color-text);cursor:pointer;text-decoration:underline" onclick="focusOnNode('${assoc.id()}')">${cleanLabel}</span>
        <span class="badge ${typeClass}" style="font-size:9px;text-transform:capitalize;margin-left:auto">${type}</span>
      </div>
    `;
  });

  listEl.innerHTML = html;
}

function focusOnNode(nodeId) {
  if (!_cyInstance) return;
  const node = _cyInstance.getElementById(nodeId);
  if (node.length > 0) {
    _cyInstance.animate({
      center: { eles: node },
      zoom: 1.5
    }, { duration: 500 });
    _cyInstance.nodes().unselect();
    node.select();
    showNodeDetail(node.data());
  }
}

function highlightNetworkNode(searchText) {
  if (!_cyInstance) return;

  const input1 = document.getElementById('node-search-input');
  const input2 = document.getElementById('network-node-search');
  if (input1 && input1.value !== searchText) input1.value = searchText;
  if (input2 && input2.value !== searchText) input2.value = searchText;

  const query = searchText.trim().toLowerCase();
  if (!query) {
    clearNetworkHighlight();
    return;
  }

  _cyInstance.elements().removeClass('highlighted faded');

  const matches = _cyInstance.nodes().filter(node => {
    const label = (node.data('label') || '').toLowerCase();
    const id = (node.data('id') || '').toLowerCase();
    return label.includes(query) || id.includes(query);
  });

  if (matches.length > 0) {
    _cyInstance.elements().addClass('faded');
    matches.removeClass('faded').addClass('highlighted');
    matches.connectedEdges().removeClass('faded').addClass('highlighted');
    matches.neighborhood().nodes().removeClass('faded');
    
    _cyInstance.animate({
      fit: {
        eles: matches,
        padding: 80
      }
    }, { duration: 400 });
  } else {
    _cyInstance.elements().addClass('faded');
  }
}

function clearNetworkHighlight() {
  if (!_cyInstance) return;
  _cyInstance.elements().removeClass('highlighted faded');
  _cyInstance.animate({
    fit: { padding: 40 }
  }, { duration: 400 });

  const input1 = document.getElementById('node-search-input');
  const input2 = document.getElementById('network-node-search');
  if (input1) input1.value = '';
  if (input2) input2.value = '';
}

function clearNodeSearch() {
  clearNetworkHighlight();
}

function renderChatBookmarks() {
  const container = document.getElementById('chat-bookmarks-list');
  if (!container) return;

  let bookmarks = [];
  try {
    bookmarks = JSON.parse(localStorage.getItem('cl_bookmarks') || '[]');
  } catch (_) {}

  if (bookmarks.length === 0) {
    container.innerHTML = '<div style="color:var(--color-text-muted);font-size:12px;padding:8px 0;">No saved responses yet.</div>';
    return;
  }

  container.innerHTML = bookmarks.map((b, idx) => `
    <div class="bookmark-item" style="background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:var(--radius-sm);padding:8px;margin-bottom:8px;display:flex;flex-direction:column;gap:4px;position:relative;">
      <div style="font-weight:600;font-size:11px;color:var(--color-primary);display:flex;justify-content:space-between;align-items:center;">
        <span>${escapeHTML(b.title || 'Saved Response')}</span>
        <button onclick="deleteChatBookmark(${idx})" style="background:none;border:none;color:var(--color-danger);cursor:pointer;padding:0;display:flex;align-items:center;justify-content:center;" title="Delete bookmark">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
      <div style="font-size:11px;color:var(--color-text);text-overflow:ellipsis;overflow:hidden;white-space:nowrap;cursor:pointer;" onclick="loadBookmarkedMessage(${idx})">
        ${escapeHTML(b.text)}
      </div>
    </div>
  `).join('');
}

function addChatBookmark(title, text) {
  let bookmarks = [];
  try {
    bookmarks = JSON.parse(localStorage.getItem('cl_bookmarks') || '[]');
  } catch (_) {}
  
  bookmarks.push({ title, text, date: new Date().toISOString() });
  localStorage.setItem('cl_bookmarks', JSON.stringify(bookmarks));
  renderChatBookmarks();
  showToast('Response saved to bookmarks', 'success');
}

function deleteChatBookmark(idx) {
  let bookmarks = [];
  try {
    bookmarks = JSON.parse(localStorage.getItem('cl_bookmarks') || '[]');
  } catch (_) {}
  
  bookmarks.splice(idx, 1);
  localStorage.setItem('cl_bookmarks', JSON.stringify(bookmarks));
  renderChatBookmarks();
  showToast('Bookmark removed', 'info');
}

function loadBookmarkedMessage(idx) {
  let bookmarks = [];
  try {
    bookmarks = JSON.parse(localStorage.getItem('cl_bookmarks') || '[]');
  } catch (_) {}
  
  const b = bookmarks[idx];
  if (!b) return;
  
  const chatInput = document.getElementById('chat-input');
  if (chatInput) {
    chatInput.value = b.text;
    chatInput.focus();
  }
}

function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// Global exposure of new functions
window.initNetworkMinimap = initNetworkMinimap;
window.renderAssociatesList = renderAssociatesList;
window.focusOnNode = focusOnNode;
window.highlightNetworkNode = highlightNetworkNode;
window.clearNetworkHighlight = clearNetworkHighlight;
window.clearNodeSearch = clearNodeSearch;
window.renderChatBookmarks = renderChatBookmarks;
window.addChatBookmark = addChatBookmark;
window.deleteChatBookmark = deleteChatBookmark;
window.loadBookmarkedMessage = loadBookmarkedMessage;
window.escapeHTML = escapeHTML;

// Global exposure of key network page triggers
window.initNetworkGraph = initNetworkGraph;
window.applyNetworkFilters = applyNetworkFilters;
window.clearNetworkFilters = clearNetworkFilters;
window.closeNetworkPanel = closeNetworkPanel;
window.viewFIR = viewFIR;
window.loadReportArchive = loadReportArchive;
window.filterFIRTable = filterFIRTable;
// ─── GLOBAL INIT ─────────────────────────────────────────────────────────────
(function() {
  // Run on every page load
  document.addEventListener('DOMContentLoaded', async () => {
    if (!await authGuard()) return;
    initDarkMode();
    initISTClock();
    initKeyboardShortcuts();
    initGlobalSearch();
    renderChatBookmarks();

    // Inject header language toggle and translate page UI
    injectHeaderLanguageToggle();
    translatePageUI();

    // Animate KPI cards in on load
    document.querySelectorAll('.kpi-card').forEach((card, i) => {
      card.classList.add('animate-in', `animate-in-delay-${i+1}`);
    });

    // Sidebar click-outside closes FAB
    document.addEventListener('click', (e) => {
      const fab = document.getElementById('fab-container');
      if (fab && !fab.contains(e.target)) {
        const btn  = document.getElementById('fab-main-btn');
        const menu = document.getElementById('fab-menu');
        if (btn) btn.classList.remove('open');
        if (menu) menu.classList.remove('open');
      }
    });

    // Close global search on outside click
    const gso = document.getElementById('global-search-overlay');
    if (gso) gso.addEventListener('click', e => { if (e.target === gso) closeGlobalSearch(); });

    // Close shortcuts overlay on outside click
    const sho = document.getElementById('shortcuts-overlay');
    if (sho) sho.addEventListener('click', e => { if (e.target === sho) closeShortcuts(); });

    // Patch existing sendChatMessage to add typing indicator
    if (typeof sendChatMessage === 'function') {
      const _origSend = sendChatMessage;
      window.sendChatMessage = function() {
        showTypingIndicator();
        return _origSend.apply(this, arguments);
      };
    }
  });
})();
