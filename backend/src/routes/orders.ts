import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { db } from '../db/supabase';

const router = Router();

/**
 * Get orders
 */
router.get('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const restaurantId = req.restaurantId!;
    const { status, date } = req.query;
    
    let query = db.supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (date) {
      const startOfDay = new Date(date as string);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date as string);
      endOfDay.setHours(23, 59, 59, 999);
      
      query = query
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString());
    }
    
    const { data: orders, error } = await query;
    
    if (error) throw error;
    
    res.json({ orders });
    
  } catch (error) {
    next(error);
  }
});

/**
 * Confirm order
 */
router.post('/:id/confirm', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    
    await db.updateOrderStatus(id, 'confirmed');
    
    res.json({ success: true });
    
  } catch (error) {
    next(error);
  }
});

export default router;
