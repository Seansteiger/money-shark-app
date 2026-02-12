import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../auth';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
    }
  }
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing authorization token' });
  }

  const token = header.slice('Bearer '.length);

  try {
    const payload = verifyAccessToken(token);
    if (payload.type !== 'access') {
      return res.status(401).json({ message: 'Invalid token type' });
    }

    req.userId = payload.sub;
    req.userEmail = payload.email;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
