import type { ApiRequest, ApiResponse } from '../_lib/http';
import { json, clearRefreshCookie, parseCookies } from '../_lib/http';
import { prisma } from '../_lib/prisma';
import { hashToken } from '../_lib/auth';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return json(res, 405, { message: 'Method not allowed' });
  }

  const cookies = parseCookies(req);
  const token = cookies.ms_refresh;

  if (token) {
    const tokenHash = hashToken(token);
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  clearRefreshCookie(res);
  res.status(204);
  res.end();
}
