/* ═══════════════════════════════════════════════════════════════════════════
   CrimeLens AI — Frontend Application Logic
   app.js
   ═══════════════════════════════════════════════════════════════════════════ */

const API = '/api';
let sessionId = null;
let chatMessages = [{
  role: 'assistant',
  content: `**Welcome to CrimeLens AI.**\n\nI am your crime intelligence analyst with access to 5,000 FIR records, 2,000 offender profiles, 3,000 victim records, and 5,000 criminal relationship mappings across 15 Karnataka districts.\n\nAsk me anything about crime patterns, specific cases, offender risk assessments, district statistics, or investigation recommendations.`
}];
let map = null;
let heatLayer = null;
let markerLayer = null;
let cy = null;
let charts = {};

// ─── Navigation ───────────────────────────────────────────────────────────────

const PAGE_META = {
  dashboard: { title: 'Intelligence Dashboard',    sub: 'Real-time crime analytics overview' },
  chatbot:   { title: 'AI Crime Analyst',          sub: 'Conversational intelligence · Groq + Mistral' },
  firs:      { title: 'FIR Records',               sub: 'Search and browse crime records' },
  hotspots:  { title: 'Crime Hotspot Map',         sub: 'Geographic crime density analysis' },
  network:   { title: 'Criminal Network',          sub: 'Offender-victim relationship graph' },
  offenders: { title: 'Offender Profiles',         sub: 'Risk scoring and repeat offender analysis' },
  reports:   { title: 'Reports & Recommendations', sub: 'PDF generation and AI insights' },
  users:     { title: 'User Management',           sub: 'Admin control panel for platform access' },
};

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    // Only allow navigating if logged in or if it is not a logout action
    if (!item.id || item.id !== 'nav-logout-btn') {
      const page = item.dataset.page;
      navigateTo(page);
    }
  });
});

function navigateTo(page) {
  const session = getSession();
  if (!session) {
    showLoginScreen();
    return;
  }

  // Enforce role access limits
  const isAdmin = session.role === 'Admin';
  if (!isAdmin && (page === 'users')) {
    // Redirect Investigators to the chatbot page if trying to access Admin pages
    page = 'chatbot';
  }

  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.page === page));
  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('active');
    p.style.display = 'none';
  });

  const el = document.getElementById(`page-${page}`);
  if (el) {
    el.classList.add('active');
    el.style.display = page === 'chatbot' ? 'flex' : 'block';
  }

  document.getElementById('header-title').textContent    = PAGE_META[page]?.title || page;
  document.getElementById('header-subtitle').textContent = PAGE_META[page]?.sub || '';
  updateTimestamp();

  // Lazy-load page data
  switch (page) {
    case 'dashboard': loadDashboard(); break;
    case 'firs':      loadFIRs();      break;
    case 'hotspots':  loadHotspots();  break;
    case 'network':   loadNetwork();   break;
    case 'offenders': loadHighRisk();  break;
    case 'reports':   loadReportsList(); break;
    case 'users':     loadUsersList();   break;
  }
}

function refreshCurrentPage() {
  const active = document.querySelector('.nav-item.active');
  if (active) navigateTo(active.dataset.page);
}

function updateTimestamp() {
  document.getElementById('last-updated').textContent = 'Updated: ' + new Date().toLocaleTimeString();
}

// ─── API Helper ───────────────────────────────────────────────────────────────

async function apiFetch(path, options = {}) {
  const session = getSession();
  if (session && session.token) {
    if (!options.headers) options.headers = {};
    options.headers['Authorization'] = `Bearer ${session.token}`;
  }
  
  try {
    const res = await fetch(API + path, options);
    if (res.status === 401) {
      // Session expired/invalid, clear and redirect to login
      clearSession();
      showLoginScreen();
      throw new Error('Session expired. Please sign in again.');
    }
    
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    console.error('API error:', path, err);
    throw err;
  }
}

// ─── Health Check ─────────────────────────────────────────────────────────────

async function checkHealth() {
  try {
    const data = await apiFetch('/health');
    const dot  = document.getElementById('db-status-dot');
    const txt  = document.getElementById('db-status-text');
    dot.className = 'status-dot';
    txt.textContent = `${data.database.firs.toLocaleString()} FIRs loaded`;
  } catch {
    document.getElementById('db-status-dot').className = 'status-dot offline';
    document.getElementById('db-status-text').textContent = 'Backend offline';
  }
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

async function loadDashboard() {
  await Promise.all([
    loadKPIs(),
    loadCrimeTypeChart(),
    loadMonthlyChart(),
    loadDistrictChart(),
    loadStatusChart(),
    loadDistrictTable(),
  ]);
}

async function loadKPIs() {
  try {
    const d = await apiFetch('/analytics/overview');
    document.getElementById('kpi-total-firs').textContent    = (d.total_firs     || 0).toLocaleString();
    document.getElementById('kpi-open').textContent          = (d.open_cases      || 0).toLocaleString();
    document.getElementById('kpi-investigating').textContent = (d.under_investigation || 0).toLocaleString();
    document.getElementById('kpi-closed').textContent        = (d.closed_cases    || 0).toLocaleString();
    document.getElementById('kpi-offenders').textContent     = (d.total_offenders || 0).toLocaleString();
    document.getElementById('kpi-victims').textContent       = (d.total_victims   || 0).toLocaleString();
    document.getElementById('kpi-districts').textContent     = (d.districts_covered || 0).toLocaleString();
    document.getElementById('kpi-crime-types').textContent   = (d.total_crime_types || 0).toLocaleString();
  } catch (e) {
    console.error('KPI load error:', e);
  }
}

async function loadCrimeTypeChart() {
  const data = await apiFetch('/analytics/crime-types');
  const ctx  = document.getElementById('chart-crime-types').getContext('2d');
  if (charts.crimeTypes) charts.crimeTypes.destroy();

  const COLORS = [
    '#1a2744','#2c4a7c','#3a6bc4','#5a8fd4','#c0392b','#e67e22',
    '#b45309','#166534','#0891b2','#7c3aed','#be185d','#374151'
  ];

  charts.crimeTypes = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d.crime_type),
      datasets: [{
        label: 'FIR Count',
        data:  data.map(d => d.count),
        backgroundColor: COLORS,
        borderRadius: 4,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        y: { grid: { color: '#e2e8f0' }, ticks: { font: { size: 11 } } }
      }
    }
  });
}

async function loadMonthlyChart() {
  const data = await apiFetch('/analytics/monthly-trends');
  const ctx  = document.getElementById('chart-monthly').getContext('2d');
  if (charts.monthly) charts.monthly.destroy();

  charts.monthly = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => d.month),
      datasets: [{
        label: 'FIRs',
        data:  data.map(d => d.count),
        borderColor: '#2c4a7c',
        backgroundColor: 'rgba(44,74,124,0.08)',
        borderWidth: 2,
        pointRadius: 2,
        fill: true,
        tension: 0.3,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { maxTicksLimit: 12, font: { size: 10 } } },
        y: { grid: { color: '#e2e8f0' }, ticks: { font: { size: 11 } } }
      }
    }
  });
}

async function loadDistrictChart() {
  const data = await apiFetch('/analytics/districts');
  const top  = data.slice(0, 10);
  const ctx  = document.getElementById('chart-districts').getContext('2d');
  if (charts.districts) charts.districts.destroy();

  charts.districts = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: top.map(d => d.district),
      datasets: [
        { label: 'Open',   data: top.map(d => d.open_cases),   backgroundColor: '#b45309', borderRadius: 3 },
        { label: 'Closed', data: top.map(d => d.closed_cases), backgroundColor: '#166534', borderRadius: 3 },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: { legend: { position: 'top', labels: { font: { size: 11 } } } },
      scales: {
        x: { stacked: true, grid: { color: '#e2e8f0' }, ticks: { font: { size: 11 } } },
        y: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 } } }
      }
    }
  });
}

async function loadStatusChart() {
  const data = await apiFetch('/analytics/overview');
  const ctx  = document.getElementById('chart-status').getContext('2d');
  if (charts.status) charts.status.destroy();

  charts.status = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Open', 'Under Investigation', 'Closed'],
      datasets: [{
        data: [data.open_cases, data.under_investigation, data.closed_cases],
        backgroundColor: ['#b45309', '#2c4a7c', '#166534'],
        borderWidth: 2,
        borderColor: '#ffffff',
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 12 }, padding: 16 } }
      },
      cutout: '60%'
    }
  });
}

async function loadDistrictTable() {
  const data = await apiFetch('/analytics/districts');
  const tbody = document.getElementById('tbody-districts');
  tbody.innerHTML = data.map(d => {
    const rate = d.total_crimes > 0 ? Math.round((d.open_cases / d.total_crimes) * 100) : 0;
    const rateColor = rate > 40 ? 'var(--red-600)' : rate > 20 ? 'var(--amber-600)' : 'var(--green-600)';
    return `<tr>
      <td><strong>${d.district}</strong></td>
      <td class="mono">${d.total_crimes.toLocaleString()}</td>
      <td class="mono" style="color:var(--amber-600);">${d.open_cases.toLocaleString()}</td>
      <td class="mono" style="color:var(--green-600);">${d.closed_cases.toLocaleString()}</td>
      <td><span style="color:${rateColor}; font-weight:600;">${rate}%</span></td>
    </tr>`;
  }).join('');
}

// ─── AI CHATBOT ───────────────────────────────────────────────────────────────

function handleChatKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendChat();
  }
}

function sendSuggestion(el) {
  document.getElementById('chat-input').value = el.textContent;
  sendChat();
}

async function sendChat() {
  const input = document.getElementById('chat-input');
  const msg   = input.value.trim();
  if (!msg) return;

  input.value = '';
  appendMessage('user', msg);
  chatMessages.push({ role: 'user', content: msg });
  showTyping();

  document.getElementById('btn-send').disabled = true;

  const langSelect = document.getElementById('speech-lang');
  const selectedLang = langSelect ? langSelect.value : 'en-US';

  try {
    const body = { 
      message: msg,
      language: selectedLang
    };
    if (sessionId) body.session_id = sessionId;

    const res = await fetch(`${API}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    hideTyping();

    if (!res.ok) {
      // API returned an error (4xx / 5xx)
      const errMsg = data.detail || JSON.stringify(data);
      appendMessage('ai', `⚠️ Server error: ${errMsg}`);
      return;
    }

    if (!data.response) {
      appendMessage('ai', `⚠️ Empty response from AI. Raw reply: ${JSON.stringify(data)}`);
      return;
    }

    sessionId = data.session_id;
    appendMessage('ai', data.response, `${data.model} · ${data.tokens_used || 0} tokens`);
    chatMessages.push({ role: 'assistant', content: data.response });
  } catch (err) {
    hideTyping();
    appendMessage('ai', `⚠️ Connection error. Please ensure the backend server is running at ${window.location.origin}`);
    console.error('Chat error:', err);
  } finally {
    document.getElementById('btn-send').disabled = false;
  }
}


function appendMessage(role, text, meta = '') {
  const container = document.getElementById('chat-messages');
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const avatar = role === 'ai' ? '🤖' : 'You';
  const metaStr = meta || (role === 'ai' ? 'CrimeLens AI · ' + time : 'You · ' + time);

  const div = document.createElement('div');
  div.className = `message ${role}`;
  
  // Format assistant replies using custom markdown formatter, and escape user input safely
  const formattedContent = role === 'ai' ? formatMarkdown(text) : escapeHtml(text).replace(/\n/g, '<br/>');

  let speechButtonHtml = '';
  if (role === 'ai') {
    speechButtonHtml = `<button class="speech-btn" onclick="speakMessageBubble(this)">🔊 Read Aloud</button>`;
  }

  div.innerHTML = `
    <div class="message-avatar">${avatar}</div>
    <div>
      <div class="message-bubble">${formattedContent}</div>
      <div class="message-meta">${metaStr}${speechButtonHtml}</div>
    </div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function formatMarkdown(text) {
  if (!text) return '';
  
  // 1. Escape HTML first to prevent XSS
  let html = escapeHtml(text);

  // 2. Format list items (- or *)
  let lines = html.split('\n');
  let inList = false;
  for (let i = 0; i < lines.length; i++) {
    let trimLine = lines[i].trim();
    if (trimLine.startsWith('- ') || trimLine.startsWith('* ')) {
      let content = trimLine.substring(2);
      if (!inList) {
        lines[i] = '<ul style="margin-left: 20px; margin-bottom: 8px; list-style-type: disc; padding-left: 0;">\n<li style="margin-bottom:4px;">' + content + '</li>';
        inList = true;
      } else {
        lines[i] = '<li style="margin-bottom:4px;">' + content + '</li>';
      }
    } else {
      if (inList) {
        lines[i - 1] = lines[i - 1] + '\n</ul>';
        inList = false;
      }
    }
  }
  if (inList) {
    lines[lines.length - 1] = lines[lines.length - 1] + '\n</ul>';
  }
  html = lines.join('\n');

  // 3. Format structured section titles like "**1. Direct Answer:**" or "**Evidence:**"
  // Translates to custom badge headers with emojis and underlines. Matches colons both inside and outside the stars.
  html = html.replace(/\*\*(?:(\d+\.\s*)?([^:*]+?)):\*\*|\*\*(?:(\d+\.\s*)?([^:*]+?))\*\*:/g, (match, p1, p2, p3, p4) => {
    const num = p1 || p3 || '';
    const title = (p2 || p4 || '').trim();
    
    // Treat as section title if it has a section number, is a known section, or is relatively short (under 40 chars)
    const isKnownSection = num || getSectionIcon(title) !== '🔹' || title.length < 40;
    
    if (isKnownSection) {
      const icon = getSectionIcon(title);
      return `<div style="font-weight:700; font-size:13px; color:var(--navy-700); margin-top:14px; margin-bottom:6px; display:flex; align-items:center; gap:6px; text-transform:uppercase; letter-spacing:0.3px; border-bottom: 1px solid var(--border-2); padding-bottom: 3px;"><span>${icon}</span> <span>${num}${title}</span></div>`;
    } else {
      // Fallback: render as normal bold with colon
      return `<strong>${num}${title}</strong>:`;
    }
  });

  // 4. Format other markdown headers: ### Header and ## Header
  html = html.replace(/^###\s+(.*?)$/gm, '<h4 style="font-weight:700; color:var(--navy-700); margin: 12px 0 6px 0; font-size:14px; border-bottom:1px solid var(--border-2); padding-bottom:4px;">$1</h4>');
  html = html.replace(/^##\s+(.*?)$/gm, '<h3 style="font-weight:700; color:var(--navy-800); margin: 16px 0 8px 0; font-size:15px;">$1</h3>');

  // 5. Format general bold text: **text** -> <strong>text</strong>
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // 6. Handle single/double newlines
  html = html.replace(/\n\n/g, '<div style="height:10px;"></div>');
  html = html.replace(/\n/g, '<br/>');

  return html;
}

function getSectionIcon(title) {
  const t = title.toLowerCase();
  if (t.includes('direct answer') || t.includes('answer') || t.includes('ಉತ್ತರ')) return '💬';
  if (t.includes('evidence') || t.includes('data') || t.includes('citation') || t.includes('ಪುರಾವೆ')) return '📊';
  if (t.includes('reasoning') || t.includes('analysis') || t.includes('ವಿಶ್ಲೇಷಣೆ')) return '🧠';
  if (t.includes('recommendation') || t.includes('lead') || t.includes('action') || t.includes('ಶಿಫಾರಸು')) return '📋';
  if (t.includes('confidence') || t.includes('ವಿಶ್ವಾಸಾರ್ಹತೆ')) return '🎯';
  return '🔹';
}

let typingEl = null;
function showTyping() {
  const container = document.getElementById('chat-messages');
  typingEl = document.createElement('div');
  typingEl.className = 'message ai';
  typingEl.id = 'typing-indicator';
  typingEl.innerHTML = `
    <div class="message-avatar">🤖</div>
    <div class="message-bubble" style="padding:10px 16px;">
      <div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>`;
  container.appendChild(typingEl);
  container.scrollTop = container.scrollHeight;
}
function hideTyping() {
  const el = document.getElementById('typing-indicator');
  if (el) el.remove();
}

async function clearChat() {
  if (sessionId) {
    await fetch(`${API}/chat/clear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId })
    }).catch(() => {});
  }
  sessionId = null;
  chatMessages = [{
    role: 'assistant',
    content: `**Welcome to CrimeLens AI.**\n\nI am your crime intelligence analyst with access to 5,000 FIR records, 2,000 offender profiles, 3,000 victim records, and 5,000 criminal relationship mappings across 15 Karnataka districts.\n\nAsk me anything about crime patterns, specific cases, offender risk assessments, district statistics, or investigation recommendations.`
  }];
  document.getElementById('chat-messages').innerHTML = `
    <div class="message ai">
      <div class="message-avatar">🤖</div>
      <div>
        <div class="message-bubble"><strong>Session cleared.</strong> How can I assist you?</div>
        <div class="message-meta">CrimeLens AI</div>
      </div>
    </div>`;
}

async function exportChatSession() {
  if (!sessionId || chatMessages.length <= 1) {
    alert("No active chat history to export.");
    return;
  }

  const btn = document.getElementById('btn-export-chat');
  const oldText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Generating PDF...';

  try {
    const res = await fetch(`${API}/chat/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        messages: chatMessages
      })
    });

    if (!res.ok) {
      throw new Error("Dossier compilation failed.");
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat_log_${sessionId.substring(0, 8)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert("Failed to export dossier: " + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = oldText;
  }
}


// ─── Voice Interaction Engine (STT & TTS) ────────────────────────────────────

let speechRecognition = null;
let isRecognizing = false;
let currentUtterance = null;
let currentSpeakingBtn = null;

function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn("Speech recognition not supported in this browser.");
    return null;
  }
  const rec = new SpeechRecognition();
  rec.continuous = false;
  rec.interimResults = false;
  
  rec.onstart = () => {
    isRecognizing = true;
    const micBtn = document.getElementById('btn-mic');
    if (micBtn) micBtn.classList.add('recording');
    const input = document.getElementById('chat-input');
    if (input) {
      input.placeholder = "Listening... Speak now / ಆಲಿಸಲಾಗುತ್ತಿದೆ... ಈಗ ಮಾತನಾಡಿ";
    }
  };
  
  rec.onend = () => {
    isRecognizing = false;
    const micBtn = document.getElementById('btn-mic');
    if (micBtn) micBtn.classList.remove('recording');
    const input = document.getElementById('chat-input');
    if (input) {
      input.placeholder = "Ask about crime patterns, specific FIRs, offenders, districts...";
    }
  };
  
  rec.onerror = (e) => {
    console.error("Speech recognition error:", e);
    isRecognizing = false;
    const micBtn = document.getElementById('btn-mic');
    if (micBtn) micBtn.classList.remove('recording');
    const input = document.getElementById('chat-input');
    if (input) {
      input.placeholder = "Ask about crime patterns, specific FIRs, offenders, districts...";
    }
  };
  
  rec.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    const input = document.getElementById('chat-input');
    if (input) {
      if (input.value) {
        input.value += " " + transcript;
      } else {
        input.value = transcript;
      }
      input.dispatchEvent(new Event('input'));
    }
  };
  
  return rec;
}

function toggleSpeechRecognition() {
  if (!speechRecognition) {
    speechRecognition = initSpeechRecognition();
  }
  if (!speechRecognition) {
    alert("Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.");
    return;
  }
  
  if (isRecognizing) {
    speechRecognition.stop();
  } else {
    const langSelect = document.getElementById('speech-lang');
    speechRecognition.lang = langSelect ? langSelect.value : 'en-US';
    speechRecognition.start();
  }
}

function speakText(text, btn, lang = 'en-US') {
  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    if (currentSpeakingBtn) {
      currentSpeakingBtn.classList.remove('speaking');
      currentSpeakingBtn.textContent = '🔊 Read Aloud';
    }
    if (currentSpeakingBtn === btn) {
      currentSpeakingBtn = null;
      return; // Stop speaking is complete
    }
  }

  // Strip Markdown characters for clean vocalization
  const cleanText = text.replace(/[*#_`~]/g, '').trim();
  if (!cleanText) return;

  const utterance = new SpeechSynthesisUtterance(cleanText);
  
  // Set correct voice language
  const hasKannada = /[\u0A80-\u0DFF]/.test(text);
  const targetLang = hasKannada ? 'kn-IN' : lang;
  utterance.lang = targetLang;

  // Try to bind a specific voice matching the language
  if (window.speechSynthesis && window.speechSynthesis.getVoices) {
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.includes(targetLang) || (targetLang.startsWith('kn') && v.lang.startsWith('kn')));
    if (voice) utterance.voice = voice;
  }

  utterance.onstart = () => {
    btn.classList.add('speaking');
    btn.textContent = '🛑 Stop';
    currentSpeakingBtn = btn;
  };

  utterance.onend = () => {
    btn.classList.remove('speaking');
    btn.textContent = '🔊 Read Aloud';
    if (currentSpeakingBtn === btn) {
      currentSpeakingBtn = null;
    }
  };

  utterance.onerror = () => {
    btn.classList.remove('speaking');
    btn.textContent = '🔊 Read Aloud';
    if (currentSpeakingBtn === btn) {
      currentSpeakingBtn = null;
    }
  };

  window.speechSynthesis.speak(utterance);
}

function speakMessageBubble(btn) {
  const bubble = btn.closest('.message').querySelector('.message-bubble');
  if (bubble) {
    speakText(bubble.innerText, btn);
  }
}

// ─── FIR RECORDS ─────────────────────────────────────────────────────────────

async function loadFIRs() {
  await searchFIRs();
}

async function searchFIRs() {
  const crimeType = document.getElementById('fir-search-crime').value.trim();
  const district  = document.getElementById('fir-search-district').value.trim();
  const status    = document.getElementById('fir-search-status').value;
  const fromDate  = document.getElementById('fir-from-date').value;
  const toDate    = document.getElementById('fir-to-date').value;

  const tbody = document.getElementById('tbody-firs');
  tbody.innerHTML = '<tr><td colspan="9" class="loading"><div class="spinner"></div> Searching...</td></tr>';

  const params = new URLSearchParams({ limit: 100 });
  if (crimeType) params.set('crime_type', crimeType);
  if (district)  params.set('district',   district);
  if (status)    params.set('status',     status);
  if (fromDate)  params.set('from_date',  fromDate);
  if (toDate)    params.set('to_date',    toDate);

  try {
    const data = await apiFetch(`/firs?${params}`);
    document.getElementById('fir-count-label').textContent = `${data.length} records found`;

    if (!data.length) {
      tbody.innerHTML = '<tr><td colspan="9" class="empty-state" style="padding:30px;"><p>No FIRs match the current filters</p></td></tr>';
      return;
    }

    tbody.innerHTML = data.map(f => `
      <tr>
        <td class="mono"><strong>${f.fir_id}</strong></td>
        <td>${f.crime_type}</td>
        <td>${f.date}</td>
        <td>${f.district}</td>
        <td>${f.police_station}</td>
        <td>${statusBadge(f.status)}</td>
        <td>${f.offender_name || '—'}</td>
        <td>${riskBadge(f.risk_category)}</td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="showFIRDetail('${f.fir_id}')">View</button>
        </td>
      </tr>`).join('');
  } catch {
    tbody.innerHTML = '<tr><td colspan="9" class="alert alert-danger" style="padding:20px;">Failed to load FIR data. Check backend connection.</td></tr>';
  }
}

function clearFIRFilters() {
  document.getElementById('fir-search-crime').value    = '';
  document.getElementById('fir-search-district').value = '';
  document.getElementById('fir-search-status').value   = '';
  document.getElementById('fir-from-date').value       = '';
  document.getElementById('fir-to-date').value         = '';
  searchFIRs();
}

async function showFIRDetail(firId) {
  document.getElementById('modal-title').textContent = `Case Detail — ${firId}`;
  document.getElementById('modal-body').innerHTML = '<div class="loading"><div class="spinner"></div> Loading case data...</div>';
  document.getElementById('modal-overlay').style.display = 'block';

  try {
    const [detail, related] = await Promise.all([
      apiFetch(`/firs/${firId}`),
      apiFetch(`/firs/${firId}/related`)
    ]);

    const relatedRows = related.slice(0, 6).map(r => `
      <tr>
        <td class="mono">${r.fir_id}</td>
        <td>${r.crime_type}</td>
        <td>${r.date}</td>
        <td>${r.district}</td>
        <td>${statusBadge(r.status)}</td>
        <td><small style="color:var(--text-muted)">${r.relation}</small></td>
      </tr>`).join('');

    document.getElementById('modal-body').innerHTML = `
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:20px;">
        <div>
          <div style="font-size:11px; font-weight:700; color:var(--text-muted); margin-bottom:8px;">CASE INFORMATION</div>
          ${kv('FIR ID',         `<span class="mono">${detail.fir_id}</span>`)}
          ${kv('Crime Type',     detail.crime_type)}
          ${kv('Date',           detail.date)}
          ${kv('District',       detail.district)}
          ${kv('Police Station', detail.police_station)}
          ${kv('Status',         statusBadge(detail.status))}
        </div>
        <div>
          <div style="font-size:11px; font-weight:700; color:var(--text-muted); margin-bottom:8px;">PARTIES INVOLVED</div>
          ${kv('Offender',       `<strong>${detail.offender_name || '—'}</strong>`)}
          ${kv('Offender ID',    `<span class="mono">${detail.offender_id || '—'}</span>`)}
          ${kv('Risk',           riskBadge(detail.risk_category))}
          ${kv('Prior FIRs',     detail.previous_firs ?? '—')}
          ${kv('Victim',         `<strong>${detail.victim_name || '—'}</strong>`)}
          ${kv('Victim ID',      `<span class="mono">${detail.victim_id || '—'}</span>`)}
        </div>
      </div>

      ${related.length ? `
      <div style="margin-bottom:16px;">
        <div style="font-size:11px; font-weight:700; color:var(--text-muted); margin-bottom:8px;">RELATED CASES (${related.length})</div>
        <div class="table-wrapper">
          <table>
            <thead><tr><th>FIR ID</th><th>Crime</th><th>Date</th><th>District</th><th>Status</th><th>Connection</th></tr></thead>
            <tbody>${relatedRows}</tbody>
          </table>
        </div>
      </div>` : ''}

      <div style="display:flex; gap:10px; margin-top:16px;">
        <button class="btn btn-primary btn-sm" onclick="generateCaseReportFromModal('${firId}')">📄 Download PDF Report</button>
        <button class="btn btn-secondary btn-sm" onclick="loadAISummaryModal('${firId}')">🤖 Get AI Summary</button>
      </div>
      <div id="modal-ai-summary" style="margin-top:14px;"></div>
    `;
  } catch {
    document.getElementById('modal-body').innerHTML = '<div class="alert alert-danger">Failed to load case details.</div>';
  }
}

async function loadAISummaryModal(firId) {
  const panel = document.getElementById('modal-ai-summary');
  panel.innerHTML = '<div class="loading"><div class="spinner"></div> Generating AI summary...</div>';
  try {
    const data = await apiFetch(`/ai/case-summary/${firId}`);
    panel.innerHTML = `<div class="ai-label">AI INVESTIGATION ASSESSMENT</div><div class="ai-panel">${escapeHtml(data.summary)}</div>`;
  } catch {
    panel.innerHTML = '<div class="alert alert-danger">AI summary failed. Check API key.</div>';
  }
}

async function generateCaseReportFromModal(firId) {
  closeModal();
  document.getElementById('report-fir-id').value = firId;
  navigateTo('reports');
  setTimeout(generateCaseReport, 300);
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
}
document.getElementById('modal-overlay').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

// ─── HOTSPOTS / MAP ───────────────────────────────────────────────────────────

// Accurate Karnataka district centroids (hardcoded — dataset has random coords)
const KARNATAKA_DISTRICTS = {
  'Bengaluru Urban':  [12.9716, 77.5946],
  'Bengaluru Rural':  [13.1200, 77.5700],
  'Mysuru':           [12.2958, 76.6394],
  'Mangaluru':        [12.9141, 74.8560],
  'Hubballi-Dharwad': [15.3647, 75.1240],
  'Belagavi':         [15.8497, 74.4977],
  'Kalaburagi':       [17.3297, 76.8200],
  'Shivamogga':       [13.9299, 75.5681],
  'Tumakuru':         [13.3379, 77.1173],
  'Ballari':          [15.1394, 76.9214],
  'Vijayapura':       [16.8302, 75.7100],
  'Davanagere':       [14.4644, 75.9218],
  'Hassan':           [13.0068, 76.1004],
  'Udupi':            [13.3409, 74.7421],
  'Chikkamagaluru':   [13.3153, 75.7754],
};

async function loadHotspots() {
  const kpiContainer = document.getElementById('hotspot-district-kpis');
  if (kpiContainer) {
    kpiContainer.innerHTML = '<div style="grid-column: 1/-1;" class="loading"><div class="spinner"></div> Loading hotspot statistics...</div>';
  }
  try {
    // Init map centered on Karnataka
    if (!map) {
      map = L.map('map-container').setView([14.5, 75.7], 7);
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 18,
      }).addTo(map);
    }
    
    // Invalidate size after layout completes to ensure map displays correctly
    setTimeout(() => {
      if (map) map.invalidateSize();
    }, 100);

    // Fetch district-level density (aggregated by district name)
    const density = await apiFetch('/hotspots/density');

    // Build heatmap using ACCURATE district centroids
    const heatData = [];
    const markerData = [];

    density.forEach(d => {
      const coords = KARNATAKA_DISTRICTS[d.district];
      if (!coords) return;
      // Scatter points tightly around centroid for precise heat effect
      for (let i = 0; i < Math.min(d.crime_count / 15, 12); i++) {
        const jitter = () => (Math.random() - 0.5) * 0.15;
        heatData.push([coords[0] + jitter(), coords[1] + jitter(), d.crime_count / 500]);
      }
      markerData.push({ ...d, lat: coords[0], lon: coords[1] });
    });

    // Remove old layers
    if (heatLayer) map.removeLayer(heatLayer);
    if (markerLayer) map.removeLayer(markerLayer);

    // Heatmap layer (smaller radius and blur for precise local hotspots)
    heatLayer = L.heatLayer(heatData, {
      radius: 20, blur: 18, maxZoom: 10,
      gradient: { 0.2: '#2c4a7c', 0.5: '#b45309', 0.8: '#c0392b', 1.0: '#ff0000' }
    }).addTo(map);

    // Circle markers per district (smaller radii and lower opacity to avoid overlapping bloating)
    markerLayer = L.layerGroup();
    markerData.forEach(d => {
      const maxCrime = Math.max(...markerData.map(x => x.crime_count));
      const radius = 5 + (d.crime_count / maxCrime) * 9;
      const color = d.crime_count > 400 ? '#c0392b' : d.crime_count > 250 ? '#b45309' : '#2c4a7c';

      L.circleMarker([d.lat, d.lon], {
        radius, color: '#ffffff', weight: 1.0,
        fillColor: color, fillOpacity: 0.65
      })
      .bindPopup(`
        <div style="font-family:sans-serif; min-width:160px;">
          <div style="font-weight:700; font-size:14px; margin-bottom:6px;">${d.district}</div>
          <div>Total Crimes: <strong>${d.crime_count}</strong></div>
          <div>Avg Location: ${d.avg_lat?.toFixed(4)}, ${d.avg_lon?.toFixed(4)}</div>
        </div>
      `)
      .bindTooltip(d.district, { permanent: false, direction: 'top' })
      .addTo(markerLayer);
    });
    markerLayer.addTo(map);

    // District KPI cards
    const kpiContainer = document.getElementById('hotspot-district-kpis');
    kpiContainer.innerHTML = density.slice(0, 6).map(d => `
      <div class="kpi-card ${d.crime_count > 400 ? 'danger' : d.crime_count > 250 ? 'warning' : 'highlight'}">
        <div class="kpi-label">${d.district}</div>
        <div class="kpi-value">${d.crime_count.toLocaleString()}</div>
        <div class="kpi-sub">crimes recorded</div>
      </div>`).join('');

    // Density bar chart
    const ctx = document.getElementById('chart-hotspot-density').getContext('2d');
    if (charts.density) charts.density.destroy();
    charts.density = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: density.map(d => d.district),
        datasets: [{
          label: 'Crime Count',
          data: density.map(d => d.crime_count),
          backgroundColor: density.map(d =>
            d.crime_count > 400 ? '#c0392b' : d.crime_count > 250 ? '#b45309' : '#2c4a7c'
          ),
          borderRadius: 4,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 30 } },
          y: { grid: { color: '#e2e8f0' }, ticks: { font: { size: 11 } } }
        }
      }
    });

  } catch (e) {
    console.error('Hotspot load error:', e);
    // Reset map state so it can be re-created on retry
    if (map) { try { map.remove(); } catch (_) {} }
    map = null;
    heatLayer = null;
    markerLayer = null;
    document.getElementById('map-container').innerHTML =
      '<div class="alert alert-danger" style="margin:20px;">Failed to load hotspot data. Check backend.</div>';
  }
}

function toggleHeatmap() {
  if (!heatLayer || !map) return;
  if (map.hasLayer(heatLayer)) map.removeLayer(heatLayer);
  else heatLayer.addTo(map);
}
function toggleMarkers() {
  if (!markerLayer || !map) return;
  if (map.hasLayer(markerLayer)) map.removeLayer(markerLayer);
  else markerLayer.addTo(map);
}

// ─── CRIMINAL NETWORK ─────────────────────────────────────────────────────────

let networkMap = null;        // Leaflet map for satellite network view
let networkGraphData = null;  // Stores last loaded graph for satellite map

async function loadNetwork() {
  const district   = document.getElementById('net-district').value;
  const crimeType  = document.getElementById('net-crime-type').value;
  const limit      = document.getElementById('net-limit').value;
  const btn        = document.getElementById('btn-load-network');

  btn.disabled    = true;
  btn.textContent = 'Loading...';

  // Clear container BEFORE Cytoscape init
  const cyContainer = document.getElementById('cy');
  if (cy) { cy.destroy(); cy = null; }
  cyContainer.innerHTML = '<div class="loading" style="color:#c8d4e8; height:100%; align-items:center; justify-content:center; display:flex; gap:10px;"><div class="spinner" style="border-color:#4a5568; border-top-color:#5a8fd4;"></div> Building criminal network...</div>';

  try {
    const params = new URLSearchParams({ limit });
    if (district)  params.set('district',   district);
    if (crimeType) params.set('crime_type', crimeType);

    const data = await apiFetch(`/network?${params}`);

    if (!data.graph || !data.graph.nodes || data.graph.nodes.length === 0) {
      cyContainer.innerHTML = '<div class="empty-state" style="color:#c8d4e8; padding:60px;"><div class="empty-icon">🕸️</div><p>No network data for the selected filters. Try broader criteria.</p></div>';
      return;
    }

    // Store graph data so satellite map can use it
    networkGraphData = data.graph;

    // Clear loading text, then init Cytoscape
    cyContainer.innerHTML = '';
    renderCytoscape(data.graph, cyContainer);
    renderNetworkMetrics(data.metrics);

    // If satellite map is currently visible, refresh it with new data
    const mapWrapper = document.getElementById('network-map-wrapper');
    if (mapWrapper && mapWrapper.style.display !== 'none') {
      renderNetworkSatelliteMap(data.graph);
    }

  } catch (e) {
    console.error('Network load error:', e);
    cyContainer.innerHTML = '<div class="alert alert-danger" style="margin:20px;">Failed to load network data. Check backend connection.</div>';
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Load Network';
  }
}

// ─── Network View Tab Switcher (Graph ⇔ Satellite Map) ─────────────────────────────────────────────────────────

function switchNetworkTab(tab) {
  const cyWrapper  = document.getElementById('cy-wrapper');
  const mapWrapper = document.getElementById('network-map-wrapper');
  const btnGraph   = document.getElementById('btn-tab-graph');
  const btnMap     = document.getElementById('btn-tab-map');
  const legend     = document.getElementById('net-legend');

  if (tab === 'graph') {
    cyWrapper.style.display  = 'block';
    mapWrapper.style.display = 'none';
    btnGraph.classList.add('active');
    btnMap.classList.remove('active');
    if (legend) legend.style.display = 'flex';
    // Resize cytoscape after reveal
    setTimeout(() => { if (cy) cy.resize(); }, 60);
  } else {
    cyWrapper.style.display  = 'none';
    mapWrapper.style.display = 'block';
    btnGraph.classList.remove('active');
    btnMap.classList.add('active');
    if (legend) legend.style.display = 'none';
    // Render satellite map with stored data
    setTimeout(() => {
      if (networkGraphData) {
        renderNetworkSatelliteMap(networkGraphData);
      } else {
        document.getElementById('network-map-container').innerHTML =
          '<div style="background:var(--navy-900);color:#c8d4e8;height:520px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;">' +
          '<div style="font-size:40px;">🛰️</div>' +
          '<p>Load the criminal network first, then switch to satellite view.</p></div>';
      }
    }, 80);
  }
}

// ─── Satellite Map for Criminal Network ──────────────────────────────────────

function renderNetworkSatelliteMap(graph) {
  const container = document.getElementById('network-map-container');
  if (!container) return;

  // Destroy existing map instance if present
  if (networkMap) {
    networkMap.remove();
    networkMap = null;
  }

  // Initialize Leaflet with Esri Satellite tiles
  networkMap = L.map('network-map-container', { zoomControl: true }).setView([14.5, 75.7], 7);

  L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    {
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      maxZoom: 18,
    }
  ).addTo(networkMap);

  // Aggregate by district using FIR nodes (which have district data)
  // and cross-reference offender risk via edge connections
  const districtStats = {};  // district → { high, medium, low, firs }

  // Build a lookup: node_id → node data
  const nodeMap = {};
  graph.nodes.forEach(n => { nodeMap[n.data.id] = n.data; });

  // Build offender lookup by node id → risk
  const offenderRisk = {};
  graph.nodes.forEach(n => {
    if (n.data.node_type === 'offender') {
      offenderRisk[n.data.id] = (n.data.risk || 'Low').toLowerCase();
    }
  });

  // For each FIR node (has district), find connected offenders via edges
  graph.nodes.forEach(n => {
    const d = n.data;
    if (d.node_type === 'fir' && d.district) {
      if (!districtStats[d.district]) {
        districtStats[d.district] = { high: 0, medium: 0, low: 0, firs: 0 };
      }
      districtStats[d.district].firs++;
    }
  });

  // Walk edges to count offender risk per district
  graph.edges.forEach(e => {
    const ed = e.data;
    if (ed.edge_type === 'offender_fir') {
      const firNode = nodeMap[ed.target] || nodeMap[ed.source];
      const offId   = ed.source === (firNode && firNode.id) ? ed.target : ed.source;
      const fir     = nodeMap[ed.target] || nodeMap[ed.source];
      // Resolve: offender is the non-FIR end
      let offenderNode = null, firNodeData = null;
      if (nodeMap[ed.source] && nodeMap[ed.source].node_type === 'offender') {
        offenderNode = nodeMap[ed.source];
        firNodeData  = nodeMap[ed.target];
      } else if (nodeMap[ed.target] && nodeMap[ed.target].node_type === 'offender') {
        offenderNode = nodeMap[ed.target];
        firNodeData  = nodeMap[ed.source];
      }
      if (offenderNode && firNodeData && firNodeData.district) {
        const dist = firNodeData.district;
        if (!districtStats[dist]) districtStats[dist] = { high: 0, medium: 0, low: 0, firs: 0 };
        const risk = (offenderNode.risk || 'Low').toLowerCase();
        if (risk === 'high')   districtStats[dist].high++;
        else if (risk === 'medium') districtStats[dist].medium++;
        else                   districtStats[dist].low++;
      }
    }
  });

  // Plot each district as a circle marker on the satellite map
  Object.entries(districtStats).forEach(([district, stats]) => {
    const coords = KARNATAKA_DISTRICTS[district];
    if (!coords) return;

    const total = stats.high + stats.medium + stats.low;
    const radius = 8 + Math.min((total + stats.firs * 0.3) * 0.6, 22);
    const fillColor = stats.high > 0   ? '#c0392b'
                    : stats.medium > 0 ? '#e67e22'
                    : '#27ae60';

    L.circleMarker(coords, {
      radius,
      color: '#ffffff',
      weight: 2,
      fillColor,
      fillOpacity: 0.85,
    })
    .bindPopup(`
      <div style="font-family:sans-serif; min-width:210px;">
        <div style="font-weight:700; font-size:14px; margin-bottom:8px; border-bottom:1px solid #eee; padding-bottom:6px;">
          📍 ${district}
        </div>
        <div style="font-size:12px; line-height:1.8;">
          <div>🔴 High-Risk Offenders: <strong>${stats.high}</strong></div>
          <div>🟠 Medium-Risk Offenders: <strong>${stats.medium}</strong></div>
          <div>🟢 Low-Risk Offenders: <strong>${stats.low}</strong></div>
          <div>📁 FIR Nodes: <strong>${stats.firs}</strong></div>
          <div style="margin-top:6px; padding-top:4px; border-top:1px solid #eee; color:#555; font-size:11px;">
            Total criminal activity: ${total + stats.firs} nodes
          </div>
        </div>
      </div>
    `)
    .bindTooltip(`${district}: ${total} offenders · ${stats.firs} FIRs`, { permanent: false, direction: 'top' })
    .addTo(networkMap);

    // District name label
    L.marker(coords, {
      icon: L.divIcon({
        className: '',
        html: `<div style="
          color:#fff; font-weight:700; font-size:10px;
          text-shadow: 0 1px 4px rgba(0,0,0,0.95);
          white-space:nowrap; pointer-events:none;
        ">${district}</div>`,
        iconAnchor: [0, -18],
      })
    }).addTo(networkMap);
  });

  // Force map size recalculation after render
  setTimeout(() => {
    if (networkMap) networkMap.invalidateSize();
  }, 150);
}

// ─── Cytoscape Graph Renderer ─────────────────────────────────────────────────

function renderCytoscape(graph, container) {
  const el = container || document.getElementById('cy');

  cy = cytoscape({
    container: el,
    elements:  [...graph.nodes, ...graph.edges],
    style: [
      {
        selector: 'node',
        style: {
          'background-color':     'data(color)',
          'width':                'data(size)',
          'height':               'data(size)',
          'label':                'data(label)',
          'color':                '#ffffff',
          'font-size':            9,
          'text-valign':          'bottom',
          'text-margin-y':        4,
          'text-outline-width':   1.5,
          'text-outline-color':   '#000000',
          'min-zoomed-font-size': 8,
        }
      },
      {
        selector: 'node[node_type = "fir"]',
        style: { shape: 'rectangle', 'background-color': '#4a5568', width: 10, height: 10, label: '', opacity: 0.7 }
      },
      {
        selector: 'node[node_type = "victim"]',
        style: { shape: 'ellipse', 'border-width': 1.5, 'border-color': '#5a8fd4', opacity: 0.85 }
      },
      {
        selector: 'node[node_type = "offender"]',
        style: { shape: 'round-rectangle' }
      },
      {
        selector: 'edge',
        style: {
          width: 1.5,
          'line-color': '#475569',
          'line-opacity': 0.8,
          'curve-style': 'bezier',
          'target-arrow-shape': 'none',
        }
      },
      {
        selector: 'node:selected',
        style: { 'border-width': 3, 'border-color': '#ffffff', 'border-opacity': 1 }
      },
      {
        selector: 'node:active',
        style: { 'overlay-opacity': 0.15 }
      }
    ],
    layout: {
      name: 'cose',
      animate: true,
      animationDuration: 600,
      randomize: true,
      nodeRepulsion: 8000,
      idealEdgeLength: 70,
      gravity: 0.25,
      numIter: 1000,
    },
    wheelSensitivity: 0.3,
    minZoom: 0.1,
    maxZoom: 5,
  });

  // Node tap → show info panel + highlight neighborhood (dim non-neighbors)
  cy.on('tap', 'node', function(evt) {
    const node = evt.target;
    const d = node.data();
    showNetworkNodeInfo(d);

    // Dim all elements not in the neighborhood of the selected node
    const neighborhood = node.closedNeighborhood();
    cy.elements().difference(neighborhood).style({ opacity: 0.12 });
    neighborhood.style({ opacity: 1 });
    // Highlight selected node with golden border
    node.style({ 'border-width': 3, 'border-color': '#ffe066', 'border-opacity': 1 });
  });

  // Click on canvas background → restore full opacity
  cy.on('tap', function(evt) {
    if (evt.target === cy) {
      cy.elements().style({ opacity: 1 });
      cy.nodes().style({ 'border-width': '', 'border-color': '' });
    }
  });

  // Fit graph on layout complete
  cy.on('ready', () => {
    cy.fit(cy.nodes(), 40);
  });
}


function showNetworkNodeInfo(data) {
  // Build a small info overlay inside the metrics panel
  const panel = document.getElementById('network-metrics');
  const existing = panel.querySelector('.node-info-box');
  if (existing) existing.remove();

  const typeLabels = { offender: 'Offender', victim: 'Victim', fir: 'FIR Record' };
  const box = document.createElement('div');
  box.className = 'node-info-box';
  box.style.cssText = 'background:var(--navy-800);border:1px solid var(--navy-600);border-radius:6px;padding:12px;margin-top:10px;color:#c8d4e8;font-size:12px;';

  if (data.node_type === 'offender') {
    box.innerHTML = `
      <div style="font-weight:700;color:#fff;margin-bottom:6px;">Selected: ${data.label}</div>
      ${kv2('Type', 'Offender')}
      ${kv2('Risk', data.risk || '—')}
      ${kv2('ID', data.id)}
      <button class="btn btn-secondary btn-sm" style="margin-top:8px;width:100%;" onclick="loadOffenderFromNetwork('${data.id}')">View Full Profile</button>
    `;
  } else if (data.node_type === 'victim') {
    box.innerHTML = `
      <div style="font-weight:700;color:#fff;margin-bottom:6px;">Selected: ${data.label}</div>
      ${kv2('Type', 'Victim')}
      ${kv2('ID', data.id)}
    `;
  } else {
    box.innerHTML = `
      <div style="font-weight:700;color:#fff;margin-bottom:6px;">Selected: ${data.id}</div>
      ${kv2('Type', 'FIR Record')}
      ${kv2('Crime', data.crime_type || '—')}
      ${kv2('Status', data.status || '—')}
      ${kv2('Date', data.date || '—')}
      ${kv2('District', data.district || '—')}
    `;
  }
  panel.appendChild(box);
}

function kv2(label, value) {
  return `<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.08);">
    <span style="color:#8a97a8;">${label}</span><span>${value}</span></div>`;
}

function loadOffenderFromNetwork(offenderId) {
  navigateTo('offenders');
  setTimeout(() => loadOffenderById(offenderId), 200);
}

function renderNetworkMetrics(m) {
  if (!m || m.error) return;
  document.getElementById('network-metrics').innerHTML = `
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
      ${metricKV('Total Nodes',     m.total_nodes?.toLocaleString())}
      ${metricKV('Total Edges',     m.total_edges?.toLocaleString())}
      ${metricKV('Components',      m.connected_components)}
      ${metricKV('Largest Cluster', m.largest_component)}
      ${metricKV('Avg Degree',      m.avg_degree)}
    </div>`;

  const tbody = document.getElementById('tbody-key-offenders');
  tbody.innerHTML = (m.key_offenders || []).map(o => `
    <tr>
      <td><small class="mono">${o.id}</small><br/><strong>${o.label}</strong></td>
      <td>${riskBadge(o.risk_category)}</td>
      <td class="mono">${o.previous_firs}</td>
      <td class="mono">${o.degree_score?.toFixed(3)}</td>
    </tr>`).join('') || '<tr><td colspan="4">No data</td></tr>';
}

// ─── OFFENDER PROFILES ────────────────────────────────────────────────────────

async function loadHighRisk() {
  const tbody = document.getElementById('tbody-high-risk');
  tbody.innerHTML = '<tr><td colspan="8" class="loading"><div class="spinner"></div> Loading...</td></tr>';
  try {
    const data = await apiFetch('/offenders/high-risk?limit=30');
    tbody.innerHTML = data.map(o => `
      <tr>
        <td class="mono"><strong>${o.offender_id}</strong></td>
        <td>${o.name}</td>
        <td>${o.age}</td>
        <td>${o.district}</td>
        <td class="mono">${o.previous_firs}</td>
        <td>${riskBadge(o.risk_category)}</td>
        <td>
          <div class="risk-bar-wrap" style="width:80px;">
            <div class="risk-bar ${o.risk_category?.toLowerCase()}" style="width:${o.risk_score}%;"></div>
          </div>
          <small>${o.risk_score}/100</small>
        </td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="switchOffenderTab('lookup'); loadOffenderById('${o.offender_id}')">Profile</button>
        </td>
      </tr>`).join('');
  } catch {
    tbody.innerHTML = '<tr><td colspan="8" class="alert alert-danger" style="padding:16px;">Failed to load data</td></tr>';
  }
}

async function loadRepeatOffenders() {
  const tbody = document.getElementById('tbody-repeat');
  tbody.innerHTML = '<tr><td colspan="7" class="loading"><div class="spinner"></div> Loading...</td></tr>';
  try {
    const data = await apiFetch('/offenders/repeat');
    tbody.innerHTML = data.map(o => `
      <tr>
        <td class="mono"><strong>${o.offender_id}</strong></td>
        <td>${o.name}</td>
        <td>${o.district}</td>
        <td class="mono" style="font-weight:700; color:var(--red-600);">${o.fir_count}</td>
        <td class="mono">${o.previous_firs}</td>
        <td>${riskBadge(o.risk_category)}</td>
        <td><button class="btn btn-secondary btn-sm" onclick="switchOffenderTab('lookup'); loadOffenderById('${o.offender_id}')">Profile</button></td>
      </tr>`).join('');
  } catch {
    tbody.innerHTML = '<tr><td colspan="7" class="alert alert-danger" style="padding:16px;">Failed to load data</td></tr>';
  }
}

function switchOffenderTab(tab, btn = null) {
  document.querySelectorAll('#page-offenders .tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  else {
    document.querySelectorAll('#page-offenders .tab-btn').forEach(b => {
      if (b.textContent.toLowerCase().includes(tab.replace('-', ' '))) b.classList.add('active');
    });
  }

  document.querySelectorAll('[id^="tab-"]').forEach(t => t.style.display = 'none');
  const el = document.getElementById(`tab-${tab}`);
  if (el) el.style.display = 'block';

  if (tab === 'repeat') loadRepeatOffenders();
}

function lookupOffender() {
  const id = document.getElementById('offender-id-input').value.trim().toUpperCase();
  if (!id) return;
  loadOffenderById(id);
}

async function loadOffenderById(id) {
  document.getElementById('offender-id-input').value = id;
  switchOffenderTab('lookup');
  const container = document.getElementById('offender-profile-result');
  container.innerHTML = '<div class="loading"><div class="spinner"></div> Loading profile...</div>';

  try {
    const o = await apiFetch(`/offenders/${id}`);
    const initial = (o.name || 'O').charAt(0).toUpperCase();
    const riskColor = { High: 'var(--red-600)', Medium: 'var(--amber-600)', Low: 'var(--green-600)' }[o.risk_category] || 'var(--text-muted)';

    const firRows = (o.fir_history || []).slice(0, 10).map(f => `
      <tr>
        <td class="mono">${f.fir_id}</td>
        <td>${f.crime_type}</td>
        <td>${f.date}</td>
        <td>${f.district}</td>
        <td>${statusBadge(f.status)}</td>
        <td>${f.victim_name || '—'}</td>
      </tr>`).join('');

    container.innerHTML = `
      <div class="card">
        <div class="card-body">
          <div class="profile-header">
            <div class="profile-avatar">${initial}</div>
            <div class="profile-info">
              <h3>${o.name}</h3>
              <p class="mono">${o.offender_id} · ${o.district}</p>
            </div>
            <div style="margin-left:auto; text-align:right;">
              <div style="font-size:11px; color:var(--text-muted); margin-bottom:4px;">RISK SCORE</div>
              <div style="font-size:28px; font-weight:700; color:${riskColor}; font-family:'JetBrains Mono',monospace;">${o.risk_score}<span style="font-size:14px;">/100</span></div>
              <div>${riskBadge(o.risk_category)}</div>
            </div>
          </div>

          <div class="grid-2" style="margin-bottom:16px;">
            <div>
              <div style="font-size:11px; font-weight:700; color:var(--text-muted); margin-bottom:8px;">PERSONAL DETAILS</div>
              ${kv('Age',           o.age)}
              ${kv('Gender',        o.gender)}
              ${kv('District',      o.district)}
              ${kv('Previous FIRs', `<span class="mono" style="font-weight:700;">${o.previous_firs}</span>`)}
              ${kv('Active Cases',  `<span class="mono">${o.total_firs_filed}</span>`)}
            </div>
            <div>
              <div style="font-size:11px; font-weight:700; color:var(--text-muted); margin-bottom:8px;">RISK FACTORS</div>
              ${(o.risk_factors || []).map(f => `<div class="alert alert-warning" style="margin-bottom:6px; padding:6px 10px; font-size:12px;">⚠ ${f}</div>`).join('')}
            </div>
          </div>

          ${firRows ? `
          <div>
            <div style="font-size:11px; font-weight:700; color:var(--text-muted); margin-bottom:8px;">FIR HISTORY (${o.total_firs_filed} records)</div>
            <div class="table-wrapper">
              <table>
                <thead><tr><th>FIR ID</th><th>Crime Type</th><th>Date</th><th>District</th><th>Status</th><th>Victim</th></tr></thead>
                <tbody>${firRows}</tbody>
              </table>
            </div>
          </div>` : ''}
        </div>
      </div>`;
  } catch {
    container.innerHTML = '<div class="alert alert-danger">Offender not found or load failed.</div>';
  }
}

// ─── REPORTS ──────────────────────────────────────────────────────────────────

async function generateCaseReport() {
  const firId = document.getElementById('report-fir-id').value.trim().toUpperCase();
  if (!firId) { alert('Please enter a FIR ID'); return; }

  const btn    = document.getElementById('btn-gen-report');
  const status = document.getElementById('report-status');
  btn.disabled = true;
  btn.textContent = 'Generating...';
  status.innerHTML = '<div class="loading"><div class="spinner"></div> Generating AI analysis and PDF...</div>';

  try {
    const res = await fetch(`${API}/reports/case`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fir_id: firId })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Report generation failed');
    }

    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `case_report_${firId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    status.innerHTML = '<div class="alert alert-success">Report downloaded successfully.</div>';
    loadReportsList();
  } catch (e) {
    status.innerHTML = `<div class="alert alert-danger">Error: ${e.message}</div>`;
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Generate & Download Report';
  }
}

async function generateDistrictReport() {
  const district = document.getElementById('report-district').value;
  if (!district) { alert('Please select a district'); return; }

  const btn    = document.getElementById('btn-gen-district-report');
  const status = document.getElementById('district-report-status');
  btn.disabled = true;
  btn.textContent = 'Generating...';
  status.innerHTML = '<div class="loading"><div class="spinner"></div> Generating AI insights and PDF...</div>';

  try {
    const res = await fetch(`${API}/reports/district`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ district })
    });
    if (!res.ok) throw new Error('Report generation failed');
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `district_report_${district.replace(' ', '_')}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    status.innerHTML = '<div class="alert alert-success">District report downloaded.</div>';
    loadReportsList();
  } catch (e) {
    status.innerHTML = `<div class="alert alert-danger">Error: ${e.message}</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Generate & Download Report';
  }
}

async function loadRecommendations() {
  const district   = document.getElementById('rec-district').value;
  const crimeType  = document.getElementById('rec-crime').value;
  const panel      = document.getElementById('recommendations-panel');
  const btn        = document.getElementById('btn-load-rec');
  btn.disabled     = true;
  btn.textContent  = 'Generating...';
  panel.textContent = 'Analyzing crime patterns and generating recommendations...';

  try {
    const params = new URLSearchParams();
    if (district)  params.set('district',   district);
    if (crimeType) params.set('crime_type', crimeType);
    const data = await apiFetch(`/ai/recommendations?${params}`);
    panel.textContent = data.recommendations;
  } catch {
    panel.textContent = 'Failed to generate recommendations. Check API key and backend connection.';
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Get Recommendations';
  }
}

async function loadReportsList() {
  const tbody = document.getElementById('tbody-reports');
  try {
    const data = await apiFetch('/reports/list');
    if (!data.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty-state" style="padding:20px;"><p>No reports generated yet</p></td></tr>';
      return;
    }
    tbody.innerHTML = data.map(r => `
      <tr>
        <td class="mono">${r.filename}</td>
        <td>${r.size_kb} KB</td>
        <td>${new Date(r.created * 1000).toLocaleString()}</td>
        <td><a href="${API.replace('/api', '')}/reports/${r.filename}" download class="btn btn-secondary btn-sm">↓ Download</a></td>
      </tr>`).join('');
  } catch {
    tbody.innerHTML = '<tr><td colspan="4">Could not load reports list</td></tr>';
  }
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function statusBadge(status) {
  if (!status) return '—';
  const map = { 'Open': 'open', 'Closed': 'closed', 'Under Investigation': 'investigation' };
  return `<span class="badge badge-${map[status] || ''}">${status}</span>`;
}

function riskBadge(risk) {
  if (!risk) return '—';
  return `<span class="badge badge-${risk.toLowerCase()}">${risk}</span>`;
}

function kv(label, value) {
  return `<div style="display:flex; gap:8px; padding:5px 0; border-bottom:1px solid var(--border-2); font-size:13px;">
    <span style="color:var(--text-muted); font-size:11px; font-weight:600; min-width:110px;">${label}</span>
    <span>${value ?? '—'}</span>
  </div>`;
}

function metricKV(label, value) {
  return `<div style="background:var(--surface-3); padding:10px 12px; border-radius:var(--radius);">
    <div style="font-size:10px; color:var(--text-muted); font-weight:600;">${label}</div>
    <div style="font-size:18px; font-weight:700; font-family:'JetBrains Mono',monospace;">${value ?? '—'}</div>
  </div>`;
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(str));
  return d.innerHTML;
}

// ─── Auth Session Management ──────────────────────────────────────────────────

function getSession() {
  const data = localStorage.getItem('crimelens_session');
  return data ? JSON.parse(data) : null;
}

function saveSession(session) {
  localStorage.setItem('crimelens_session', JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem('crimelens_session');
}

function showLoginScreen() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
}

function hideLoginScreen() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const userEl = document.getElementById('login-username');
  const passEl = document.getElementById('login-password');
  const errorEl = document.getElementById('login-error');
  const btn = document.getElementById('btn-login-submit');

  errorEl.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'Authenticating...';

  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: userEl.value.trim(), password: passEl.value })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Authentication failed');
    }

    saveSession(data);
    userEl.value = '';
    passEl.value = '';
    
    applyRolePermissions(data.role);
    hideLoginScreen();
    
    // Default redirect depending on role
    if (data.role === 'Admin') {
      navigateTo('dashboard');
    } else {
      navigateTo('chatbot');
    }
    
    checkHealth();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
}

function handleLogout() {
  const session = getSession();
  if (session && session.token) {
    fetch(`${API}/auth/logout`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${session.token}` }
    }).catch(() => {});
  }
  clearSession();
  showLoginScreen();
}

function applyRolePermissions(role) {
  const isAdmin = role === 'Admin';
  
  // Toggle Admin-only menu nodes (nav-hotspots is now visible to everyone)
  document.getElementById('nav-hotspots').style.display = 'flex';
  document.getElementById('section-admin-label').style.display = isAdmin ? 'block' : 'none';
  document.getElementById('section-admin-menu').style.display = isAdmin ? 'block' : 'none';
  
  // Protect active screen
  const activeItem = document.querySelector('.nav-item.active');
  if (activeItem) {
    const page = activeItem.dataset.page;
    if (!isAdmin && (page === 'users')) {
      navigateTo('chatbot');
    }
  }
}


// ─── User Management Handlers (Admin Only) ────────────────────────────────────

async function loadUsersList() {
  const tbody = document.getElementById('tbody-users');
  tbody.innerHTML = '<tr><td colspan="3" class="loading"><div class="spinner"></div> Loading accounts...</td></tr>';
  
  try {
    const data = await apiFetch('/users');
    if (!data.length) {
      tbody.innerHTML = '<tr><td colspan="3" class="empty-state"><p>No accounts found</p></td></tr>';
      return;
    }
    
    tbody.innerHTML = data.map(u => `
      <tr>
        <td><strong>${escapeHtml(u.username)}</strong></td>
        <td><span class="badge ${u.role === 'Admin' ? 'badge-high' : 'badge-investigation'}">${u.role}</span></td>
        <td>
          ${u.username.toLowerCase() !== 'admin' ? `
            <button class="btn btn-danger btn-sm" onclick="deleteUser('${escapeHtml(u.username)}')">Delete</button>
          ` : '<small style="color:var(--text-muted)">Protected</small>'}
        </td>
      </tr>`).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="3" class="alert alert-danger">Error: ${escapeHtml(err.message)}</td></tr>`;
  }
}

async function handleCreateUser(e) {
  e.preventDefault();
  const userEl = document.getElementById('create-username');
  const passEl = document.getElementById('create-password');
  const roleEl = document.getElementById('create-role');
  const errorEl = document.getElementById('user-create-error');
  const successEl = document.getElementById('user-create-success');

  errorEl.style.display = 'none';
  successEl.style.display = 'none';

  try {
    const res = await apiFetch('/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: userEl.value.trim(),
        password: passEl.value,
        role: roleEl.value
      })
    });

    successEl.textContent = `Account for ${res.username} (${res.role}) created successfully.`;
    successEl.style.display = 'block';
    
    userEl.value = '';
    passEl.value = '';
    loadUsersList();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.style.display = 'block';
  }
}

async function deleteUser(username) {
  try {
    await apiFetch(`/users/${encodeURIComponent(username)}`, { method: 'DELETE' });
    loadUsersList();
  } catch (err) {
    console.error(`Failed to delete user: ${err.message}`);
  }
}


// ─── Init ─────────────────────────────────────────────────────────────────────

(async () => {
  const session = getSession();
  if (!session) {
    showLoginScreen();
  } else {
    applyRolePermissions(session.role);
    hideLoginScreen();
    await checkHealth();
    
    // Navigate to default/saved tab
    const activeItem = document.querySelector('.nav-item.active');
    const startPage = activeItem ? activeItem.dataset.page : 'dashboard';
    navigateTo(startPage);
    
    setInterval(checkHealth, 30000);
  }
})();
