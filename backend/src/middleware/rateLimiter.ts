import rateLimit from 'express-rate-limit';
import { cache } from '../db/redis';

export function createRateLimiter() {
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: 'Too many requests',
        message: 'Please slow down and try again in a minute'
      });
    }
  });
}

/**
 * WhatsApp-specific rate limiter (per phone number)
 */
export async function checkWhatsAppRateLimit(phoneNumber: string): Promise<boolean> {
  const count = await cache.incrementRateLimit(`wa:${phoneNumber}`, 60);
  return count <= 100; // 100 messages per minute per number
}
