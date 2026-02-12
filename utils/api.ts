import { AppSettings, Customer, Loan } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
const ACCESS_TOKEN_KEY = 'money_shark_access_token';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export const authStore = {
  getAccessToken() {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },
  setAccessToken(token: string) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  },
  clear() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  },
};

const request = async <T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> => {
  const token = authStore.getAccessToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (res.status === 401 && retry) {
    const refreshed = await refreshToken();
    if (refreshed) {
      return request<T>(path, options, false);
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || 'Request failed');
  }

  if (res.status === 204) {
    return null as T;
  }

  return (await res.json()) as T;
};

export const register = async (input: { name: string; email: string; password: string }) => {
  const data = await request<{ accessToken: string; user: AuthUser }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  }, false);

  authStore.setAccessToken(data.accessToken);
  return data.user;
};

export const login = async (input: { email: string; password: string }) => {
  const data = await request<{ accessToken: string; user: AuthUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  }, false);

  authStore.setAccessToken(data.accessToken);
  return data.user;
};

export const refreshToken = async () => {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!res.ok) return false;

    const data = (await res.json()) as { accessToken: string };
    authStore.setAccessToken(data.accessToken);
    return true;
  } catch {
    return false;
  }
};

export const logout = async () => {
  await request('/auth/logout', { method: 'POST' }, false).catch(() => undefined);
  authStore.clear();
};

export const getMe = async () => {
  const data = await request<{ user: AuthUser }>('/auth/me');
  return data.user;
};

export const getBootstrap = async () => {
  return request<{ settings: AppSettings; customers: Customer[]; loans: Loan[] }>('/bootstrap');
};

export const saveSettings = async (settings: AppSettings) => {
  return request<AppSettings>('/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
};

export const createLoan = async (payload: {
  customerName: string;
  principal: number;
  initialInterestRate: number;
  interestRate: number;
  startDate: string;
  interestType: Loan['interestType'];
  isFixedRate: boolean;
  notes: string;
}) => {
  return request<{ customer: Customer; loan: Loan }>('/loans', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const deleteLoan = async (id: string) => {
  return request<void>(`/loans/${id}`, {
    method: 'DELETE',
  });
};

export const resetAllData = async () => {
  return request<void>('/reset', {
    method: 'DELETE',
  });
};
