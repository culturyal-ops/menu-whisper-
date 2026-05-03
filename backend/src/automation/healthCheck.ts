import { Request, Response } from 'express';
import { supabase } from '../db/supabase';
import { redis } from '../db/redis';
import { logger } from '../utils/logger';

export async function healthCheck(_req: Request, res: Response) {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    whatsapp: !!(process.env.META_ACCESS_TOKEN),
    ai: !!(process.env.OPENAI_API_KEY && process.env.ANTHROPIC_API_KEY)
  };

  const allHealthy = Object.values(checks).every(Boolean);
  const someHealthy = Object.values(checks).some(Boolean);
  const status = allHealthy ? 'ok' : someHealthy ? 'degraded' : 'down';

  res.status(allHealthy ? 200 : 503).json({
    status,
    timestamp: new Date().toISOString(),
    checks,
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
}

async function checkDatabase(): Promise<boolean> {
  try {
    const { error } = await supabase.from('restaurants').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}

async function checkRedis(): Promise<boolean> {
  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}

export async function readinessCheck(_req: Request, res: Response) {
  const dbReady = await checkDatabase();
  const redisReady = await checkRedis();
  res.status(dbReady && redisReady ? 200 : 503).json({ ready: dbReady && redisReady });
}

export function livenessCheck(_req: Request, res: Response) {
  res.status(200).json({ alive: true, uptime: process.uptime() });
}
