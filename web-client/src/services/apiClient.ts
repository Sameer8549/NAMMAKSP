import type { AppRole } from '../types/role';

const TOKEN_KEY = 'namma_ksp_token';
const APPSAIL_ORIGIN = 'https://namma-ksp-50043229029.development.catalystappsail.in';

function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const isCatalystClient = typeof window !== 'undefined' && window.location.hostname.endsWith('catalystserverless.in');
  return `${isCatalystClient ? APPSAIL_ORIGIN : ''}${path}`;
}

export interface AuthSession {
  token: string;
  username: string;
  role: string;
  capabilities: string[];
  disclosure_mode: string;
}

export interface FrontendWorkspace {
  generatedAt: string;
  identity: AuthSession & { district_scope?: string[]; command_scope?: string[] };
  cases: unknown[];
  hotspots: unknown[];
  districts: unknown[];
  crimeTrends: unknown[];
  demographics: unknown[];
  categoryBreakdown: unknown[];
  network: unknown;
  officerWorkloads: unknown[];
  supervisorBottlenecks: unknown[];
  userSessions: unknown[];
  auditEvents: unknown[];
  securityAlerts: unknown[];
  systemHealth: unknown;
  aiInsight: unknown;
  forecast: unknown;
  sociological: unknown;
  financial: unknown;
  explainable: unknown;
  reports: unknown[];
  overview: Record<string, number>;
}

export function toAppRole(role: string): AppRole {
  const normalized = role.trim().toUpperCase();
  if (normalized === 'ADMIN' || normalized === 'ADMINISTRATOR') return 'ADMIN';
  if (normalized === 'INVESTIGATOR') return 'INVESTIGATOR';
  if (normalized === 'SUPERVISOR') return 'SUPERVISOR';
  if (normalized === 'POLICYMAKER' || normalized === 'POLICY MAKER') return 'POLICYMAKER';
  return 'ANALYST';
}

class ApiClient {
  get token(): string {
    return sessionStorage.getItem(TOKEN_KEY) || '';
  }

  hasSession(): boolean {
    return Boolean(this.token);
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    if (!(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
    if (this.token) headers.set('Authorization', `Bearer ${this.token}`);
    const response = await fetch(apiUrl(path), { ...init, headers });
    if (response.status === 401) sessionStorage.removeItem(TOKEN_KEY);
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.detail || payload.message || `Request failed (${response.status})`);
    }
    return response.json() as Promise<T>;
  }

  private async download(path: string, init: RequestInit = {}, fallbackName = 'namma-ksp-download'): Promise<void> {
    const headers = new Headers(init.headers);
    if (!(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
    if (this.token) headers.set('Authorization', `Bearer ${this.token}`);
    const response = await fetch(apiUrl(path), { ...init, headers });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `Download failed (${response.status})`);
    }
    const disposition = response.headers.get('Content-Disposition') || '';
    const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] || fallbackName;
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async login(username: string, password: string): Promise<AuthSession> {
    const session = await this.request<AuthSession>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    sessionStorage.setItem(TOKEN_KEY, session.token);
    return session;
  }

  async restore(): Promise<AuthSession> {
    return this.request<AuthSession>('/api/auth/me');
  }

  async logout(): Promise<void> {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } finally {
      sessionStorage.removeItem(TOKEN_KEY);
    }
  }

  async loadWorkspace(): Promise<FrontendWorkspace> {
    return this.request<FrontendWorkspace>('/api/frontend/bootstrap');
  }

  async chat(message: string, language: 'en' | 'kn', sessionId: string, workspaceView = ''): Promise<Record<string, unknown>> {
    return this.request('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message, language, session_id: sessionId, workspace_view: workspaceView }),
    });
  }

  async globalSearch(query: string, limit = 20): Promise<Record<string, unknown>> {
    return this.request(`/api/search/global?q=${encodeURIComponent(query)}&limit=${limit}`);
  }

  async getFir(firId: string): Promise<Record<string, unknown>> {
    return this.request(`/api/firs/${encodeURIComponent(firId)}`);
  }

  async getRelatedCases(firId: string): Promise<Record<string, unknown>[]> {
    return this.request(`/api/firs/${encodeURIComponent(firId)}/related`);
  }

  async reassignCase(firId: string, assignee: string, note = ''): Promise<Record<string, unknown>> {
    return this.request(`/api/firs/${encodeURIComponent(firId)}/reassign`, {
      method: 'POST', body: JSON.stringify({ assignee, note }),
    });
  }

  async getOffender(offenderId: string): Promise<Record<string, unknown>> {
    return this.request(`/api/offenders/${encodeURIComponent(offenderId)}`);
  }

  async getOffenderNetwork(offenderId: string): Promise<Record<string, unknown>> {
    return this.request(`/api/network/offender/${encodeURIComponent(offenderId)}`);
  }

  async listReports(): Promise<Array<Record<string, unknown>>> {
    return this.request('/api/reports/list');
  }

  async downloadReport(filename: string): Promise<void> {
    return this.download(`/api/reports/download/${encodeURIComponent(filename)}`, {}, filename);
  }

  reportQrUrl(filename: string): string {
    return apiUrl(`/api/reports/qr/${encodeURIComponent(filename)}?token=${encodeURIComponent(this.token)}`);
  }

  async listAudit(): Promise<Array<Record<string, unknown>>> {
    return this.request('/api/audit/logs');
  }

  async listUsers(): Promise<Array<Record<string, unknown>>> {
    return this.request('/api/users');
  }

  async createUser(username: string, password: string, role: string): Promise<Record<string, unknown>> {
    return this.request('/api/users', { method: 'POST', body: JSON.stringify({ username, password, role }) });
  }

  async updateUser(username: string, update: { role?: string; active?: boolean }): Promise<Record<string, unknown>> {
    return this.request(`/api/users/${encodeURIComponent(username)}`, { method: 'PATCH', body: JSON.stringify(update) });
  }

  async deleteUser(username: string): Promise<Record<string, unknown>> {
    return this.request(`/api/users/${encodeURIComponent(username)}`, { method: 'DELETE' });
  }

  async systemStatus(): Promise<Record<string, unknown>> {
    return this.request('/api/system/status');
  }

  async catalystServices(): Promise<Record<string, unknown>> {
    return this.request('/api/catalyst/services');
  }

  async alerts(): Promise<Array<Record<string, unknown>>> {
    return this.request('/api/alerts/early-warning');
  }

  async transitionAlert(alertId: string | number, action: 'assign' | 'acknowledge' | 'resolve', payload: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    return this.request(`/api/alerts/${encodeURIComponent(String(alertId))}/${action}`, { method: 'POST', body: JSON.stringify(payload) });
  }

  async reviewForecast(alertId: string | number, decision: 'validated' | 'disputed' | 'needs_more_data', note = ''): Promise<Record<string, unknown>> {
    return this.request(`/api/forecast/${encodeURIComponent(String(alertId))}/review`, { method: 'POST', body: JSON.stringify({ decision, note }) });
  }

  async translate(text: string, targetLanguage: 'en' | 'kn', sourceLanguage = 'auto'): Promise<Record<string, unknown>> {
    return this.request('/api/translate', { method: 'POST', body: JSON.stringify({ text, target_language: targetLanguage, source_language: sourceLanguage }) });
  }

  async textToSpeech(text: string, language: 'en' | 'kn'): Promise<Blob> {
    const response = await fetch(apiUrl('/api/tts'), {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.token}` },
      body: JSON.stringify({ text, language }),
    });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).detail || 'Speech generation failed');
    return response.blob();
  }

  async transcribe(audio: Blob, language: 'en' | 'kn'): Promise<Record<string, unknown>> {
    const form = new FormData();
    form.append('file', audio, 'voice.webm');
    return this.request(`/api/audio-transcribe?language=${encodeURIComponent(language)}`, { method: 'POST', body: form });
  }

  async exportChat(sessionId: string, messages: Array<{ role: string; content: string }>): Promise<void> {
    return this.download('/api/chat/export', { method: 'POST', body: JSON.stringify({ session_id: sessionId, messages }) }, 'namma-ksp-chat.pdf');
  }

  async generateReport(kind: string, payload: Record<string, unknown>): Promise<void> {
    return this.download(`/api/reports/${kind}`, { method: 'POST', body: JSON.stringify(payload) }, `namma-ksp-${kind}.pdf`);
  }
}

export const apiClient = new ApiClient();
