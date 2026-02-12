import type { ApiRequest, ApiResponse } from '../_lib/http';
import { json, parseBody, requireAuth } from '../_lib/http';
import { prisma } from '../_lib/prisma';
import { parseSchema, createLoanSchema } from '../_lib/schemas';
import { serializeLoan } from '../_lib/data';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return json(res, 405, { message: 'Method not allowed' });
  }

  const auth = requireAuth(req);
  if ('error' in auth) {
    return json(res, 401, { message: auth.error });
  }

  try {
    const body = await parseBody(req);
    const data = parseSchema(createLoanSchema, body);

    const result = await prisma.$transaction(async (tx) => {
      const customers = await tx.customer.findMany({ where: { userId: auth.userId } });
      const existing = customers.find((c) => c.name.toLowerCase() === data.customerName.toLowerCase());

      const customer =
        existing ||
        (await tx.customer.create({
          data: { userId: auth.userId, name: data.customerName },
        }));

      const loan = await tx.loan.create({
        data: {
          userId: auth.userId,
          customerId: customer.id,
          principal: data.principal,
          initialInterestRate: data.initialInterestRate,
          interestRate: data.interestRate,
          startDate: new Date(`${data.startDate}T00:00:00.000Z`),
          interestType: data.interestType,
          isFixedRate: data.isFixedRate,
          status: 'ACTIVE',
          notes: data.notes || '',
        },
      });

      return { customer, loan };
    });

    return json(res, 201, {
      customer: { id: result.customer.id, name: result.customer.name, notes: result.customer.notes || '' },
      loan: serializeLoan(result.loan),
    });
  } catch (error) {
    return json(res, 400, { message: error instanceof Error ? error.message : 'Unable to create loan' });
  }
}
