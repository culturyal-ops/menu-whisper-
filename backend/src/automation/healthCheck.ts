import { Request, Response } from 'express';
import { supabase } from '../db/supabase';
import { redis } from '../db/redis';
import axios from 'axios';
import { logger } from '../utils/logger';

interface HealthStatus {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  checks: {
    database: boolean;
    redis: boolean;
    whatsapp: boolean;
    ai: boolean;
  };
  uptime: number;
  version: string;
}

/**
 * Comprehensive health check endpoint
 */
export async function healthCheck(req: Request, res: Response) {
  const startTime = Date.now();
  
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    whatsapp: await checkWhatsAppAPI(),
    ai: await checkAIAPIs()
  };
  
  const allHealthy = Object.values(checks).every(check => check === true);
  const someHealthy = Object.values(checks).some(check => check === true);
  
  const status: HealthStatus = {
    status: allHealthy ? 'ok' : someHealthy ? 'degraded' : 'down',
    timestamp: new Date().toISOString(),
    checks,
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  };
  
  const responseTime = Date.now() - startTime;
  
  logger.info('Health check completed', { status: status.status, responseTime });
  
  const statusCode = status.status === 'ok' ? 200 : status.status === 'degraded' ? 503 : 503;
  
  res.status(statusCode).json({
    ...status,
    responseTime: `${responseTime}ms`
  });
}

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('restaurants')
      .select('id')
      .limit(1);
    
    return !error;
  } catch (error) {
    logger.error('Database health check failed:', error);
    return false;
  }
}

/**
 * Check Redis connectivity
 */
async function checkRedis(): Promise<boolean> {
  try {
    await redis.ping();
    return true;
  } catch (error) {
    logger.error('Redis health check failed:', error);
    return false;
  }
}

/**
 * Check WhatsApp API token validity
 */
async function checkWhatsAppAPI(): Promise<boolean> {
  try {
    const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
    
    if (!META_ACCESS_TOKEN) {
      return false;
    }
    
    // Verify token by calling Meta's debug endpoint
    const response = await axios.get(
      `https://graph.facebook.com/v18.0/debug_token`,
      {
        params: {
          input_token: META_ACCESS_TOKEN,
          access_token: META_ACCESS_TOKEN
        },
        timeout: 5000
      }
    );
    
    return response.data.data?.is_valid === true;
  } catch (error) {
    logger.error('WhatsApp API health check failed:', error);
    return false;
  }
}

/**
 * Check AI APIs availability
 */
async function checkAIAPIs(): Promise<boolean> {
  try {
    // Quick check: just verify API keys are set
    const openaiKey = process.env.OPENAI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    
    return !!(openaiKey && anthropicKey);
  } catch (error) {
    logger.error('AI APIs health check failed:', error);
    return false;
  }
}

/**
 * Readiness probe (for Kubernetes/Railway)
 */
export async function readinessCheck(req: Request, res: Response) {
  const dbReady = await checkDatabase();
  const redisReady = await checkRedis();
  
  if (dbReady && redisReady) {
    res.status(200).json({ ready: true });
  } else {
    res.status(503).json({ ready: false });
  }
}

/**
 * Liveness probe (for Kubernetes/Railway)
 */
export function livenessCheck(req: Request, res: Response) {
  // Simple check: is the process running?
  res.status(200).json({ alive: true, uptime: process.uptime() });
}
