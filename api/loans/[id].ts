import type { ApiRequest, ApiResponse } from '../_lib/http';
import { json, requireAuth } from '../_lib/http';
import { prisma } from '../_lib/prisma';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'DELETE') {
    return json(res, 405, { message: 'Method not allowed' });
  }

  const auth = requireAuth(req);
  if ('error' in auth) {
    return json(res, 401, { message: auth.error });
  }

  const id = Array.isArray(req.query?.id) ? req.query?.id[0] : req.query?.id;
  if (!id) {
    return json(res, 400, { message: 'Missing loan id' });
  }

  const existing = await prisma.loan.findFirst({
    where: { id, userId: auth.userId },
  });

  if (!existing) {
    return json(res, 404, { message: 'Loan not found' });
  }

  await prisma.loan.delete({ where: { id } });
  res.status(204);
  res.end();
}
