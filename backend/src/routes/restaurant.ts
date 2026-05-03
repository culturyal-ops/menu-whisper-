import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { db } from '../db/supabase';

const router = Router();

/**
 * Get dashboard stats
 */
router.get('/dashboard', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const restaurantId = req.restaurantId!;
    
    // Get today's orders
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data: todayOrders } = await db.supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .gte('created_at', today.toISOString());
    
    const totalOrders = todayOrders?.length || 0;
    const revenue = todayOrders?.reduce((sum, order) => sum + parseFloat(order.total), 0) || 0;
    const avgOrderValue = totalOrders > 0 ? revenue / totalOrders : 0;
    
    // Get recent orders
    const { data: recentOrders } = await db.supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(5);
    
    res.json({
      todayOrders: totalOrders,
      revenue: revenue.toFixed(2),
      avgOrderValue: avgOrderValue.toFixed(2),
      guestSatisfaction: 4.9, // TODO: Calculate from feedback
      recentOrders: recentOrders || []
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * Get menu items
 */
router.get('/menu', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const restaurantId = req.restaurantId!;
    const menuItems = await db.getMenuItems(restaurantId, false);
    
    res.json({ menuItems });
    
  } catch (error) {
    next(error);
  }
});

/**
 * Update menu item
 */
router.post('/menu', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const restaurantId = req.restaurantId!;
    const menuItem = req.body;
    
    const { data, error } = await db.supabase
      .from('menu_items')
      .upsert({
        ...menuItem,
        restaurant_id: restaurantId
      })
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({ menuItem: data });
    
  } catch (error) {
    next(error);
  }
});

export default router;
