import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/supabase';
import { sendWhatsAppMessage } from '../utils/whatsappSender';
import { logger } from '../utils/logger';

const router = Router();

const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET!;

/**
 * Razorpay payment webhook handler
 */
router.post('/razorpay', async (req: Request, res: Response) => {
  try {
    // Verify webhook signature
    const signature = req.headers['x-razorpay-signature'] as string;
    const body = JSON.stringify(req.body);
    
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest('hex');
    
    if (signature !== expectedSignature) {
      logger.warn('Invalid Razorpay webhook signature');
      return res.status(403).send('Invalid signature');
    }
    
    const event = req.body.event;
    const payload = req.body.payload.payment.entity;
    
    logger.info('Razorpay webhook received:', { event, paymentId: payload.id });
    
    // Handle payment captured event
    if (event === 'payment.captured') {
      await handlePaymentCaptured(payload);
    }
    
    // Handle payment failed event
    if (event === 'payment.failed') {
      await handlePaymentFailed(payload);
    }
    
    res.status(200).json({ status: 'ok' });
    
  } catch (error) {
    logger.error('Razorpay webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Handle successful payment
 */
async function handlePaymentCaptured(payment: any) {
  const orderId = payment.notes?.order_id;
  const restaurantId = payment.notes?.restaurant_id;
  
  if (!orderId) {
    logger.error('Payment captured but no order_id in notes');
    return;
  }
  
  // Update order payment status
  await db.updateOrderPaymentStatus(orderId, 'paid', payment.id);
  
  // Get order details
  const { data: order } = await db.supabase
    .from('orders')
    .select('*, sessions(*), restaurants(*)')
    .eq('id', orderId)
    .single();
  
  if (!order) {
    logger.error('Order not found:', orderId);
    return;
  }
  
  // Update guest profile total spent
  const { data: session } = await db.supabase
    .from('sessions')
    .select('guest_profile_id')
    .eq('id', order.session_id)
    .single();
  
  if (session) {
    await db.supabase.rpc('increment_guest_spent', {
      profile_id: session.guest_profile_id,
      amount: parseFloat(order.total)
    });
  }
  
  // Send thank you message
  const restaurant = order.restaurants;
  const thankYouMessage = `✅ Payment received! Thank you for dining with us.\n\nYour receipt: ${payment.id}\n\nWe'd love to hear your feedback. How was your experience?`;
  
  await sendWhatsAppMessage({
    phoneNumberId: restaurant.whatsapp_number_id,
    to: order.sessions.wa_phone_number,
    message: thankYouMessage
  });
  
  logger.info('Payment processed successfully:', { orderId, amount: payment.amount });
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(payment: any) {
  const orderId = payment.notes?.order_id;
  
  if (!orderId) {
    return;
  }
  
  // Update order payment status
  await db.updateOrderPaymentStatus(orderId, 'failed', payment.id);
  
  // Get order details
  const { data: order } = await db.supabase
    .from('orders')
    .select('*, sessions(*), restaurants(*)')
    .eq('id', orderId)
    .single();
  
  if (!order) {
    return;
  }
  
  // Send retry message
  const restaurant = order.restaurants;
  const retryMessage = `⚠️ Payment failed. Please try again or pay at the counter.\n\nIf you need assistance, please let our staff know.`;
  
  await sendWhatsAppMessage({
    phoneNumberId: restaurant.whatsapp_number_id,
    to: order.sessions.wa_phone_number,
    message: retryMessage
  });
  
  logger.warn('Payment failed:', { orderId, reason: payment.error_description });
}

/**
 * Stripe webhook handler (for international payments)
 */
router.post('/stripe', async (req: Request, res: Response) => {
  try {
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
    
    // Verify Stripe signature
    // const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    
    // Handle Stripe events similar to Razorpay
    
    res.status(200).json({ received: true });
    
  } catch (error) {
    logger.error('Stripe webhook error:', error);
    res.status(400).send('Webhook error');
  }
});

export default router;
