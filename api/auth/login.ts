import bcrypt from 'bcryptjs';
import type { ApiRequest, ApiResponse } from '../_lib/http';
import { json, parseBody, setRefreshCookie } from '../_lib/http';
import { prisma } from '../_lib/prisma';
import { createAccessToken, createRefreshToken, hashToken } from '../_lib/auth';
import { parseSchema, loginSchema } from '../_lib/schemas';
import { config } from '../_lib/config';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return json(res, 405, { message: 'Method not allowed' });
  }

  try {
    const body = await parseBody(req);
    const data = parseSchema(loginSchema, body);
    const email = data.email.toLowerCase();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return json(res, 401, { message: 'Invalid email or password' });
    }

    const isValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isValid) {
      return json(res, 401, { message: 'Invalid email or password' });
    }

    const accessToken = createAccessToken({ id: user.id, email: user.email });
    const refreshToken = createRefreshToken({ id: user.id, email: user.email });

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + config.refreshTokenTtlDays * 24 * 60 * 60 * 1000),
      },
    });

    setRefreshCookie(res, refreshToken);

    return json(res, 200, {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    return json(res, 400, { message: error instanceof Error ? error.message : 'Unable to login' });
  }
}
