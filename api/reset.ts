import type { ApiRequest, ApiResponse } from './_lib/http';
import { json, requireAuth } from './_lib/http';
import { prisma } from './_lib/prisma';
import { DEFAULT_SETTINGS } from './_lib/data';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'DELETE') {
    return json(res, 405, { message: 'Method not allowed' });
  }

  const auth = requireAuth(req);
  if ('error' in auth) {
    return json(res, 401, { message: auth.error });
  }

  await prisma.$transaction(async (tx) => {
    await tx.loan.deleteMany({ where: { userId: auth.userId } });
    await tx.customer.deleteMany({ where: { userId: auth.userId } });
    await tx.appSettings.upsert({
      where: { userId: auth.userId },
      create: { userId: auth.userId, ...DEFAULT_SETTINGS },
      update: DEFAULT_SETTINGS,
    });
  });

  res.status(204);
  res.end();
}
