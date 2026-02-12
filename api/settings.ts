import type { ApiRequest, ApiResponse } from './_lib/http';
import { json, parseBody, requireAuth } from './_lib/http';
import { prisma } from './_lib/prisma';
import { parseSchema, settingsSchema } from './_lib/schemas';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'PUT') {
    return json(res, 405, { message: 'Method not allowed' });
  }

  const auth = requireAuth(req);
  if ('error' in auth) {
    return json(res, 401, { message: auth.error });
  }

  try {
    const body = await parseBody(req);
    const data = parseSchema(settingsSchema, body);

    const saved = await prisma.appSettings.upsert({
      where: { userId: auth.userId },
      create: { userId: auth.userId, ...data },
      update: data,
    });

    return json(res, 200, {
      globalInitialInterestRate: saved.globalInitialInterestRate,
      globalInterestRate: saved.globalInterestRate,
      globalCompoundMonthly: saved.globalCompoundMonthly,
    });
  } catch (error) {
    return json(res, 400, { message: error instanceof Error ? error.message : 'Unable to save settings' });
  }
}
