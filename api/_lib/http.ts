import type { IncomingMessage, ServerResponse } from 'node:http';
import { config } from './config';
import { REFRESH_COOKIE, verifyAccessToken } from './auth';

export type ApiRequest = IncomingMessage & {
  body?: unknown;
  query?: Record<string, string | string[]>;
  headers: IncomingMessage['headers'];
};

export type ApiResponse = ServerResponse & {
  status: (code: number) => ApiResponse;
  json: (data: unknown) => void;
};

export const json = (res: ApiResponse, status: number, data: unknown) => {
  res.status(status);
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
};

export const parseBody = async (req: ApiRequest) => {
  if (req.body) return req.body;

  const chunks: Uint8Array[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Uint8Array);
  }

  if (!chunks.length) return {};

  const raw = Buffer.concat(chunks).toString('utf8');
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

export const parseCookies = (req: ApiRequest) => {
  const header = req.headers.cookie || '';
  return header.split(';').reduce<Record<string, string>>((acc, part) => {
    const [key, ...rest] = part.trim().split('=');
    if (!key) return acc;
    acc[key] = decodeURIComponent(rest.join('='));
    return acc;
  }, {});
};

export const setRefreshCookie = (res: ApiResponse, token: string) => {
  const maxAge = config.refreshTokenTtlDays * 24 * 60 * 60;
  const cookie = `${REFRESH_COOKIE}=${encodeURIComponent(token)}; Path=/api/auth; HttpOnly; Max-Age=${maxAge}; SameSite=Lax${
    config.secureCookies ? '; Secure' : ''
  }`;
  res.setHeader('Set-Cookie', cookie);
};

export const clearRefreshCookie = (res: ApiResponse) => {
  const cookie = `${REFRESH_COOKIE}=; Path=/api/auth; HttpOnly; Max-Age=0; SameSite=Lax${
    config.secureCookies ? '; Secure' : ''
  }`;
  res.setHeader('Set-Cookie', cookie);
};

export const getBearerToken = (req: ApiRequest) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length);
};

export const requireAuth = (req: ApiRequest) => {
  const token = getBearerToken(req);
  if (!token) {
    return { error: 'Missing authorization token' } as const;
  }

  try {
    const payload = verifyAccessToken(token);
    if (payload.type !== 'access') {
      return { error: 'Invalid token type' } as const;
    }
    return { userId: payload.sub, userEmail: payload.email } as const;
  } catch {
    return { error: 'Invalid or expired token' } as const;
  }
};
