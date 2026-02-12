import bcrypt from 'bcryptjs';
import type { ApiRequest, ApiResponse } from '../_lib/http';
import { json, parseBody, setRefreshCookie } from '../_lib/http';
import { prisma } from '../_lib/prisma';
import { createAccessToken, createRefreshToken, hashToken } from '../_lib/auth';
import { DEFAULT_SETTINGS } from '../_lib/data';
import { parseSchema, registerSchema } from '../_lib/schemas';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return json(res, 405, { message: 'Method not allowed' });
  }

  try {
    const body = await parseBody(req);
    const data = parseSchema(registerSchema, body);
    const email = data.email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return json(res, 409, { message: 'Email is already registered' });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        name: data.name,
        passwordHash,
        settings: {
          create: DEFAULT_SETTINGS,
        },
      },
      select: { id: true, email: true, name: true },
    });

    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    setRefreshCookie(res, refreshToken);
    return json(res, 201, { accessToken, user });
  } catch (error) {
    return json(res, 400, { message: error instanceof Error ? error.message : 'Unable to register' });
  }
}
