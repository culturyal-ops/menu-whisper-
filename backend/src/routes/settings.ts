import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { db } from '../db/supabase';

const router = Router();

/**
 * Update WhatsApp settings
 */
router.post('/whatsapp', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const restaurantId = req.restaurantId!;
    const { whatsapp_number_id, whatsapp_phone_number } = req.body;
    
    const { error } = await db.supabase
      .from('restaurants')
      .update({
        whatsapp_number_id,
        whatsapp_phone_number
      })
      .eq('id', restaurantId);
    
    if (error) throw error;
    
    res.json({ success: true });
    
  } catch (error) {
    next(error);
  }
});

/**
 * Update AI tone config
 */
router.post('/ai-tone', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const restaurantId = req.restaurantId!;
    const { personality, formality } = req.body;
    
    const { error } = await db.supabase
      .from('restaurants')
      .update({
        ai_tone_config: { personality, formality }
      })
      .eq('id', restaurantId);
    
    if (error) throw error;
    
    res.json({ success: true });
    
  } catch (error) {
    next(error);
  }
});

export default router;
