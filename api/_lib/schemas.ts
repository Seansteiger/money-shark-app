import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(255),
  password: z
    .string()
    .min(10)
    .max(128)
    .regex(/[A-Z]/, 'Password must include an uppercase letter')
    .regex(/[a-z]/, 'Password must include a lowercase letter')
    .regex(/[0-9]/, 'Password must include a number')
    .regex(/[^A-Za-z0-9]/, 'Password must include a symbol'),
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const settingsSchema = z.object({
  globalInitialInterestRate: z.number().min(0).max(1000),
  globalInterestRate: z.number().min(0).max(1000),
  globalCompoundMonthly: z.boolean(),
});

export const createLoanSchema = z.object({
  customerName: z.string().trim().min(1).max(120),
  principal: z.number().positive().max(10_000_000_000),
  initialInterestRate: z.number().min(0).max(1000),
  interestRate: z.number().min(0).max(1000),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  interestType: z.enum(['SIMPLE', 'COMPOUND']),
  isFixedRate: z.boolean(),
  notes: z.string().max(4000).optional().default(''),
});

export const parseSchema = <S extends z.ZodTypeAny>(schema: S, input: unknown): z.infer<S> => {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message || 'Invalid request body');
  }
  return result.data;
};
