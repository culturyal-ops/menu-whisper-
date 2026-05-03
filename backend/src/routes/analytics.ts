import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { supabase } from '../db/supabase';

const router = Router();

router.get('/conversations', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const restaurantId = req.restaurantId!;
    const { startDate, endDate } = req.query;

    let query = supabase
      .from('conversation_logs')
      .select('*')
      .eq('restaurant_id', restaurantId);

    if (startDate) query = query.gte('created_at', startDate as string);
    if (endDate)   query = query.lte('created_at', endDate as string);

    const { data: logs, error } = await query;
    if (error) throw error;

    const totalMessages = logs?.length || 0;
    const totalCost = logs?.reduce((sum: number, log: any) => sum + (parseFloat(log.cost_usd) || 0), 0) || 0;
    const intentBreakdown = logs?.reduce((acc: Record<string, number>, log: any) => {
      const intent = log.intent_detected || 'unknown';
      acc[intent] = (acc[intent] || 0) + 1;
      return acc;
    }, {});

    res.json({ totalMessages, totalCost: totalCost.toFixed(4), intentBreakdown, logs: logs || [] });
  } catch (error) {
    next(error);
  }
});

export default router;
