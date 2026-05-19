import type { BotContext } from '../bot.js';
import { logEmitter } from './logger.js';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<number, RateLimitEntry>();

const MAX_MESSAGES = 5;
const WINDOW_MS = 10_000;

export function rateLimitMiddleware(ctx: BotContext, next: () => Promise<void>): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return next();

  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + WINDOW_MS });
    return next();
  }

  entry.count++;

  if (entry.count > MAX_MESSAGES) {
    logEmitter.emit('log', {
      timestamp: new Date().toISOString(),
      type: 'warning',
      text: `Rate limit exceeded for user ${userId}`,
    });
    return Promise.resolve();
  }

  return next();
}

setInterval(() => {
  const now = Date.now();
  for (const [userId, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(userId);
    }
  }
}, 30_000);
