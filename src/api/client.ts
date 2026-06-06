const API_BASE = import.meta.env.VITE_API_URL ?? '';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function getToken(): string | null {
  return localStorage.getItem('fitpulse_token');
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem('fitpulse_token', token);
  else localStorage.removeItem('fitpulse_token');
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      (data as { error?: string }).error ?? res.statusText,
      res.status,
      data
    );
  }
  return data as T;
}

export interface PublicUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  authProvider: string;
  totalXp: number;
  level: number;
  totalPushups: number;
  createdAt: string;
}

export interface AuthProviders {
  google: boolean;
  github: boolean;
  email: boolean;
}

export interface PushupStats {
  totalPushups: number;
  totalXp: number;
  level: number;
  todayReps: number;
  todayXp: number;
  weekReps: number;
  levelProgress: { current: number; needed: number; progress: number };
}

export const authApi = {
  providers: () => api<AuthProviders>('/api/auth/providers'),
  register: (body: { email: string; password: string; displayName: string }) =>
    api<{ token: string; user: PublicUser }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  login: (body: { email: string; password: string }) =>
    api<{ token: string; user: PublicUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  me: () => api<{ user: PublicUser }>('/api/auth/me'),
  logout: () => api<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
  googleUrl: () => `${API_BASE}/api/auth/google`,
  githubUrl: () => `${API_BASE}/api/auth/github`,
};

export interface WearableDevice {
  id: string;
  platform: string;
  deviceName: string | null;
  lastSyncAt: string | null;
  createdAt: string;
}

export const wearableApi = {
  startPairing: () =>
    api<{ pairingCode: string; expiresAt: string; expiresInMinutes: number }>(
      '/api/wearables/pair/start',
      { method: 'POST' }
    ),
  listDevices: () =>
    api<{
      devices: WearableDevice[];
      supportedPlatforms: string[];
      comingSoon: string[];
    }>('/api/wearables/devices'),
  disconnect: (id: string) =>
    api<{ ok: boolean }>(`/api/wearables/devices/${id}`, { method: 'DELETE' }),
};

export const integrationsApi = {
  status: () =>
    api<{
      googleFit: { available: boolean; connected: boolean };
      appleHealth: { available: boolean; connected: boolean; note?: string };
      fitbit: { available: boolean; connected: boolean; comingSoon?: boolean };
      garmin: { available: boolean; connected: boolean; comingSoon?: boolean };
    }>('/api/integrations/status'),
  googleFitConnect: () => api<{ authUrl: string }>('/api/integrations/google-fit/connect'),
};

export const pushupApi = {
  logSession: (body: { reps: number; durationSec: number; avgConfidence?: number }) =>
    api<{
      session: { id: string; reps: number; xpEarned: number };
      user: PublicUser;
      levelProgress: { current: number; needed: number; progress: number };
    }>('/api/pushups/sessions', { method: 'POST', body: JSON.stringify(body) }),
  stats: () => api<PushupStats>('/api/pushups/stats'),
  sessions: () =>
    api<{
      sessions: {
        id: string;
        reps: number;
        xpEarned: number;
        durationSec: number;
        createdAt: string;
      }[];
    }>('/api/pushups/sessions'),
};
