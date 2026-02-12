import type { ApiRequest, ApiResponse } from './_lib/http';
import { json, requireAuth } from './_lib/http';
import { prisma } from './_lib/prisma';
import { DEFAULT_SETTINGS, serializeLoan } from './_lib/data';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') {
    return json(res, 405, { message: 'Method not allowed' });
  }

  const auth = requireAuth(req);
  if ('error' in auth) {
    return json(res, 401, { message: auth.error });
  }

  const [settings, customers, loans] = await Promise.all([
    prisma.appSettings.findUnique({ where: { userId: auth.userId } }),
    prisma.customer.findMany({ where: { userId: auth.userId }, orderBy: { createdAt: 'desc' } }),
    prisma.loan.findMany({ where: { userId: auth.userId }, orderBy: { createdAt: 'desc' } }),
  ]);

  return json(res, 200, {
    settings: settings
      ? {
          globalInitialInterestRate: settings.globalInitialInterestRate,
          globalInterestRate: settings.globalInterestRate,
          globalCompoundMonthly: settings.globalCompoundMonthly,
        }
      : DEFAULT_SETTINGS,
    customers: customers.map((c) => ({ id: c.id, name: c.name, notes: c.notes || '' })),
    loans: loans.map(serializeLoan),
  });
}
