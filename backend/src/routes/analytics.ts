import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { db } from '../db/supabase';

const router = Router();

/**
 * Get conversation analytics
 */
router.get('/conversations', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const restaurantId = req.restaurantId!;
    const { startDate, endDate } = req.query;
    
    let query = db.supabase
      .from('conversation_logs')
      .select('*')
      .eq('restaurant_id', restaurantId);
    
    if (startDate) {
      query = query.gte('created_at', startDate as string);
    }
    
    if (endDate) {
      query = query.lte('created_at', endDate as string);
    }
    
    const { data: logs, error } = await query;
    
    if (error) throw error;
    
    // Calculate metrics
    const totalMessages = logs?.length || 0;
    const totalCost = logs?.reduce((sum, log) => sum + (parseFloat(log.cost_usd) || 0), 0) || 0;
    const intentBreakdown = logs?.reduce((acc: any, log) => {
      const intent = log.intent_detected || 'unknown';
      acc[intent] = (acc[intent] || 0) + 1;
      return acc;
    }, {});
    
    res.json({
      totalMessages,
      totalCost: totalCost.toFixed(4),
      intentBreakdown,
      logs: logs || []
    });
    
  } catch (error) {
    next(error);
  }
});

export default router;
