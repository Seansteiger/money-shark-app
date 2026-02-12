import 'dotenv/config';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { config } from './config';
import { prisma } from './db';
import {
  createAccessToken,
  createRefreshToken,
  hashToken,
  REFRESH_COOKIE,
  verifyRefreshToken,
} from './auth';
import { requireAuth } from './middleware/requireAuth';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many auth requests. Try again later.' },
});

const apiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', apiLimiter);

const DEFAULT_SETTINGS = {
  globalInitialInterestRate: 50,
  globalInterestRate: 30,
  globalCompoundMonthly: true,
};

const registerSchema = z.object({
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

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const settingsSchema = z.object({
  globalInitialInterestRate: z.number().min(0).max(1000),
  globalInterestRate: z.number().min(0).max(1000),
  globalCompoundMonthly: z.boolean(),
});

const createLoanSchema = z.object({
  customerName: z.string().trim().min(1).max(120),
  principal: z.number().positive().max(10_000_000_000),
  initialInterestRate: z.number().min(0).max(1000),
  interestRate: z.number().min(0).max(1000),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  interestType: z.enum(['SIMPLE', 'COMPOUND']),
  isFixedRate: z.boolean(),
  notes: z.string().max(4000).optional().default(''),
});

const parseSchema = <S extends z.ZodTypeAny>(schema: S, input: unknown): z.infer<S> => {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message || 'Invalid request body');
  }
  return result.data;
};

const serializeLoan = (loan: {
  id: string;
  customerId: string;
  principal: number | { toString(): string };
  initialInterestRate: number | { toString(): string };
  interestRate: number | { toString(): string };
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

const setRefreshCookie = (res: express.Response, token: string) => {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: config.secureCookies,
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: config.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
  });
};

const clearRefreshCookie = (res: express.Response) => {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: config.secureCookies,
    sameSite: 'lax',
    path: '/api/auth',
  });
};

const issueTokens = async (user: { id: string; email: string }, res: express.Response) => {
  const accessToken = createAccessToken(user);
  const refreshToken = createRefreshToken(user);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + config.refreshTokenTtlDays * 24 * 60 * 60 * 1000),
    },
  });

  setRefreshCookie(res, refreshToken);

  return accessToken;
};

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const data = parseSchema(registerSchema, req.body);
    const email = data.email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: 'Email is already registered' });
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
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    const accessToken = await issueTokens(user, res);

    return res.status(201).json({ accessToken, user });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to register';
    return res.status(400).json({ message });
  }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const data = parseSchema(loginSchema, req.body);
    const email = data.email.toLowerCase();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const accessToken = await issueTokens({ id: user.id, email: user.email }, res);

    return res.json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to login';
    return res.status(400).json({ message });
  }
});

app.post('/api/auth/refresh', authLimiter, async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (!token) {
    return res.status(401).json({ message: 'Missing refresh token' });
  }

  try {
    const payload = verifyRefreshToken(token);
    if (payload.type !== 'refresh') {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const tokenHash = hashToken(token);
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      return res.status(401).json({ message: 'Refresh token is expired or revoked' });
    }

    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const accessToken = await issueTokens({ id: payload.sub, email: payload.email }, res);

    return res.json({ accessToken });
  } catch {
    return res.status(401).json({ message: 'Invalid refresh token' });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (token) {
    const tokenHash = hashToken(token);
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  clearRefreshCookie(res);
  return res.status(204).send();
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, name: true, email: true },
  });

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  return res.json({ user });
});

app.get('/api/bootstrap', requireAuth, async (req, res) => {
  const userId = req.userId!;

  const [settings, customers, loans] = await Promise.all([
    prisma.appSettings.findUnique({ where: { userId } }),
    prisma.customer.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.loan.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
  ]);

  return res.json({
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
});

app.put('/api/settings', requireAuth, async (req, res) => {
  try {
    const data = parseSchema(settingsSchema, req.body);

    const saved = await prisma.appSettings.upsert({
      where: { userId: req.userId! },
      create: {
        userId: req.userId!,
        ...data,
      },
      update: data,
    });

    return res.json({
      globalInitialInterestRate: saved.globalInitialInterestRate,
      globalInterestRate: saved.globalInterestRate,
      globalCompoundMonthly: saved.globalCompoundMonthly,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to save settings';
    return res.status(400).json({ message });
  }
});

app.post('/api/loans', requireAuth, async (req, res) => {
  try {
    const data = parseSchema(createLoanSchema, req.body);
    const userId = req.userId!;

    const customerName = data.customerName.trim();

    const result = await prisma.$transaction(async (tx) => {
      const customers = await tx.customer.findMany({ where: { userId } });
      const existing = customers.find((c) => c.name.toLowerCase() === customerName.toLowerCase());

      const customer =
        existing ||
        (await tx.customer.create({
          data: { userId, name: customerName },
        }));

      const loan = await tx.loan.create({
        data: {
          userId,
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

      return {
        customer,
        loan,
      };
    });

    return res.status(201).json({
      customer: {
        id: result.customer.id,
        name: result.customer.name,
        notes: result.customer.notes || '',
      },
      loan: serializeLoan(result.loan),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create loan';
    return res.status(400).json({ message });
  }
});

app.delete('/api/loans/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  const existing = await prisma.loan.findFirst({
    where: {
      id,
      userId: req.userId!,
    },
  });

  if (!existing) {
    return res.status(404).json({ message: 'Loan not found' });
  }

  await prisma.loan.delete({ where: { id } });
  return res.status(204).send();
});

app.delete('/api/reset', requireAuth, async (req, res) => {
  const userId = req.userId!;

  await prisma.$transaction(async (tx) => {
    await tx.loan.deleteMany({ where: { userId } });
    await tx.customer.deleteMany({ where: { userId } });
    await tx.appSettings.upsert({
      where: { userId },
      create: {
        userId,
        ...DEFAULT_SETTINGS,
      },
      update: DEFAULT_SETTINGS,
    });
  });

  return res.status(204).send();
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ message: 'Unexpected server error' });
});

const server = app.listen(config.port, () => {
  console.log(`API server listening on http://localhost:${config.port}`);
});

const shutdown = async () => {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
