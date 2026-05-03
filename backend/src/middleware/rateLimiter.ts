import rateLimit from 'express-rate-limit';
import { cache } from '../db/redis';

export function createRateLimiter() {
  return rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    message: 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({ error: 'Too many requests' });
    }
  });
}

export async function checkWhatsAppRateLimit(phoneNumber: string): Promise<boolean> {
  const count = await cache.incrementRateLimit(`wa:${phoneNumber}`, 60);
  return count <= 100;
}
