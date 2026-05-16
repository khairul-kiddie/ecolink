import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '../utils/jwt';
import { prisma } from '../config/database';
import { redis } from '../config/redis';
import { AppError } from './errorHandler.middleware';
import { UserRole } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: UserRole; email: string };
    }
  }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing or invalid authorization header');
    }

    const token = authHeader.split(' ')[1];
    let payload: JwtPayload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired token');
    }

    const cacheKey = `user:${payload.sub}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      req.user = JSON.parse(cached);
      return next();
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, email: true, status: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new AppError(401, 'UNAUTHORIZED', 'User not found or inactive');
    }

    const userPayload = { id: user.id, role: user.role, email: user.email };
    await redis.setex(cacheKey, 60, JSON.stringify(userPayload));
    req.user = userPayload;
    next();
  } catch (err) {
    next(err);
  }
}

export function authorize(roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      next(new AppError(403, 'FORBIDDEN', 'Insufficient permissions'));
      return;
    }
    next();
  };
}
