import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { supabase } from '../db/supabase';

const router = Router();

router.get('/dashboard', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const restaurantId = req.restaurantId!;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: todayOrders } = await supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .gte('created_at', today.toISOString());

    const totalOrders = todayOrders?.length || 0;
    const revenue = todayOrders?.reduce((sum: number, order: any) => sum + parseFloat(order.total), 0) || 0;
    const avgOrderValue = totalOrders > 0 ? revenue / totalOrders : 0;

    const { data: recentOrders } = await supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(5);

    res.json({
      todayOrders: totalOrders,
      revenue: revenue.toFixed(2),
      avgOrderValue: avgOrderValue.toFixed(2),
      guestSatisfaction: 4.9,
      recentOrders: recentOrders || []
    });
  } catch (error) {
    next(error);
  }
});

router.get('/menu', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const restaurantId = req.restaurantId!;

    const { data: menuItems, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', restaurantId);

    if (error) throw error;
    res.json({ menuItems });
  } catch (error) {
    next(error);
  }
});

router.post('/menu', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const restaurantId = req.restaurantId!;
    const menuItem = req.body;

    const { data, error } = await supabase
      .from('menu_items')
      .upsert({ ...menuItem, restaurant_id: restaurantId })
      .select()
      .single();

    if (error) throw error;
    res.json({ menuItem: data });
  } catch (error) {
    next(error);
  }
});

export default router;
