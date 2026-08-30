import { z } from 'zod';

const apiErrorSchema = z.object({ detail: z.string().optional() }).passthrough();

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = sessionStorage.getItem('cl_token');
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {})
    }
  });
  if (response.status === 401) {
    sessionStorage.setItem('cl_auth_return', `dashboard.html${location.search}`);
    ['cl_token', 'cl_username', 'cl_role'].forEach(key => sessionStorage.removeItem(key));
    location.replace('index.html?reason=session-expired');
    throw new ApiError('Session expired', 401);
  }
  if (!response.ok) {
    const payload = apiErrorSchema.safeParse(await response.json().catch(() => ({})));
    throw new ApiError(payload.success ? payload.data.detail || response.statusText : response.statusText, response.status);
  }
  return response.json() as Promise<T>;
}

export const queryKeys = {
  workspace: ['workspace'] as const,
  overview: (role: string) => ['overview', role] as const,
  trends: (role: string) => ['trends', role] as const,
  crimeTypes: (role: string) => ['crime-types', role] as const,
  districts: (role: string) => ['districts', role] as const,
  firs: (role: string, status: string) => ['firs', role, status] as const,
  intelligence: (role: string) => ['workspace-intelligence', role] as const,
  admin: ['admin-intelligence'] as const
};
