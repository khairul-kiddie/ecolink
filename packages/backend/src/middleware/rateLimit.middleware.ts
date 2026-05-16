import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redis } from '../config/redis';

function createLimiter(windowMs: number, max: number, message: string) {
  return rateLimit({
    windowMs,
    max,
    message: { success: false, error: { code: 'RATE_LIMITED', message } },
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      // ioredis returns Promise<unknown>; cast satisfies rate-limit-redis's SendCommandFn
      sendCommand: (...args: string[]) => redis.call(...(args as [string, ...string[]])) as Promise<any>,
    }),
  });
}

export const authLimiter = createLimiter(15 * 60 * 1000, 10, 'Too many auth requests, please try again later');
export const aiMatchingLimiter = createLimiter(60 * 60 * 1000, 5, 'AI matching rate limit reached');
export const apiLimiter = createLimiter(60 * 1000, 100, 'Too many requests');
export const unauthLimiter = createLimiter(60 * 1000, 30, 'Too many requests');
