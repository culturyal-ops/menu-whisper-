import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../db/supabase';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET!;

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password required', 400);
    }

    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !restaurant) {
      throw new AppError('Invalid credentials', 401);
    }

    const token = jwt.sign(
      { userId: restaurant.owner_user_id, restaurantId: restaurant.id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      restaurant: { id: restaurant.id, name: restaurant.name, slug: restaurant.slug }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
