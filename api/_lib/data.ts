// @ts-nocheck
import type { Prisma } from '@prisma/client';

export const DEFAULT_SETTINGS = {
  globalInitialInterestRate: 50,
  globalInterestRate: 30,
  globalCompoundMonthly: true,
};

export const serializeLoan = (loan: {
  id: string;
  customerId: string;
  principal: Prisma.Decimal | number;
  initialInterestRate: Prisma.Decimal | number;
  interestRate: Prisma.Decimal | number;
  startDate: Date;
  interestType: 'SIMPLE' | 'COMPOUND';
  isFixedRate: boolean;
  status: 'ACTIVE' | 'PAID' | 'DEFAULTED';
  notes: string | null;
}) => ({
  id: loan.id,
  customerId: loan.customerId,
  principal: Number(loan.principal),
  initialInterestRate: Number(loan.initialInterestRate),
  interestRate: Number(loan.interestRate),
  startDate: loan.startDate.toISOString().split('T')[0],
  interestType: loan.interestType,
  isFixedRate: loan.isFixedRate,
  status: loan.status,
  notes: loan.notes || '',
});
