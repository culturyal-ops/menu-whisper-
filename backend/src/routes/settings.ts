import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { supabase } from '../db/supabase';

const router = Router();

router.post('/whatsapp', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const restaurantId = req.restaurantId!;
    const { whatsapp_number_id, whatsapp_phone_number } = req.body;

    const { error } = await supabase
      .from('restaurants')
      .update({ whatsapp_number_id, whatsapp_phone_number })
      .eq('id', restaurantId);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post('/ai-tone', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const restaurantId = req.restaurantId!;
    const { personality, formality } = req.body;

    const { error } = await supabase
      .from('restaurants')
      .update({ ai_tone_config: { personality, formality } })
      .eq('id', restaurantId);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
