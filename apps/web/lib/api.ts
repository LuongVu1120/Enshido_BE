'use client';

export const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000') + '/api';

const TOKEN_KEY = 'enshido.accessToken';
const REFRESH_KEY = 'enshido.refreshToken';
const USER_KEY = 'enshido.user';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}
export function getStoredUser(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}
export function saveSession(accessToken: string, refreshToken: string, user: SessionUser) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

export class ApiError extends Error {
  status: number;
  body: any;
  constructor(status: number, message: string, body?: any) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

// Tự gia hạn access token bằng refresh token (US1/008). Trả true nếu thành công.
async function tryRefresh(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const rt = localStorage.getItem(REFRESH_KEY);
  if (!rt) return false;
  try {
    const res = await fetch(`${API_BASE}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rt }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (!data?.accessToken) return false;
    localStorage.setItem(TOKEN_KEY, data.accessToken);
    if (data.refreshToken) localStorage.setItem(REFRESH_KEY, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

export async function apiFetch<T = any>(path: string, options: RequestInit = {}, _retried = false): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (res.status === 401 && typeof window !== 'undefined' && !path.startsWith('/login') && !path.startsWith('/refresh')) {
    // Thử gia hạn 1 lần rồi lặp lại request; nếu refresh hỏng mới về /login.
    if (!_retried && (await tryRefresh())) {
      return apiFetch<T>(path, options, true);
    }
    clearSession();
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
    }
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message = data?.message
      ? Array.isArray(data.message)
        ? data.message.join(', ')
        : data.message
      : `Lỗi ${res.status}`;
    throw new ApiError(res.status, message, data);
  }
  return data as T;
}

export async function login(email: string, password: string) {
  const data = await apiFetch<{ accessToken: string; refreshToken: string; user: SessionUser }>(
    '/login',
    { method: 'POST', body: JSON.stringify({ email, password }) },
  );
  saveSession(data.accessToken, data.refreshToken, data.user);
  return data.user;
}

// Helpers ngắn gọn
export const get = <T = any>(p: string) => apiFetch<T>(p);
export const post = <T = any>(p: string, body?: any) =>
  apiFetch<T>(p, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
export const put = <T = any>(p: string, body?: any) =>
  apiFetch<T>(p, { method: 'PUT', body: body ? JSON.stringify(body) : undefined });
export const del = <T = any>(p: string) => apiFetch<T>(p, { method: 'DELETE' });

// Tải file (CSV...) có kèm bearer token → trigger download.
export async function downloadFile(path: string, filename: string) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new ApiError(res.status, `Lỗi tải file ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
