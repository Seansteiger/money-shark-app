import type { ApiRequest, ApiResponse } from '../_lib/http';
import { json, parseCookies, setRefreshCookie } from '../_lib/http';
import { prisma } from '../_lib/prisma';
import { createAccessToken, createRefreshToken, hashToken, verifyRefreshToken } from '../_lib/auth';
import { config } from '../_lib/config';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return json(res, 405, { message: 'Method not allowed' });
  }

  const cookies = parseCookies(req);
  const token = cookies.ms_refresh;
  if (!token) {
    return json(res, 401, { message: 'Missing refresh token' });
  }

  try {
    const payload = verifyRefreshToken(token);
    if (payload.type !== 'refresh') {
      return json(res, 401, { message: 'Invalid refresh token' });
    }

    const tokenHash = hashToken(token);
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      return json(res, 401, { message: 'Refresh token is expired or revoked' });
    }

    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const accessToken = createAccessToken({ id: payload.sub, email: payload.email });
    const refreshToken = createRefreshToken({ id: payload.sub, email: payload.email });

    await prisma.refreshToken.create({
      data: {
        userId: payload.sub,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + config.refreshTokenTtlDays * 24 * 60 * 60 * 1000),
      },
    });

    setRefreshCookie(res, refreshToken);
    return json(res, 200, { accessToken });
  } catch {
    return json(res, 401, { message: 'Invalid refresh token' });
  }
}
