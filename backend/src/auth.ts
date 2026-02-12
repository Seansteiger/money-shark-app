import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from './config';

export const REFRESH_COOKIE = 'ms_refresh';

type JwtPayload = {
  sub: string;
  email: string;
  type: 'access' | 'refresh';
};

export const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

export const createAccessToken = (user: { id: string; email: string }) => {
  return jwt.sign({ sub: user.id, email: user.email, type: 'access' } satisfies JwtPayload, config.accessTokenSecret, {
    expiresIn: config.accessTokenTtlSeconds,
  });
};

export const createRefreshToken = (user: { id: string; email: string }) => {
  return jwt.sign({ sub: user.id, email: user.email, type: 'refresh' } satisfies JwtPayload, config.refreshTokenSecret, {
    expiresIn: `${config.refreshTokenTtlDays}d` as jwt.SignOptions['expiresIn'],
  });
};

export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, config.accessTokenSecret) as JwtPayload;
};

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, config.refreshTokenSecret) as JwtPayload;
};
