import type { ApiRequest, ApiResponse } from '../_lib/http';
import { json, requireAuth } from '../_lib/http';
import { prisma } from '../_lib/prisma';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') {
    return json(res, 405, { message: 'Method not allowed' });
  }

  const auth = requireAuth(req);
  if ('error' in auth) {
    return json(res, 401, { message: auth.error });
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { id: true, name: true, email: true },
  });

  if (!user) {
    return json(res, 404, { message: 'User not found' });
  }

  return json(res, 200, { user });
}
