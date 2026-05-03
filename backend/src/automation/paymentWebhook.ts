import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db, supabase } from '../db/supabase';
import { sendWhatsAppMessage } from '../utils/whatsappSender';
import { logger } from '../utils/logger';

const router = Router();

router.post('/razorpay', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const body = JSON.stringify(req.body);
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET!;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      logger.warn('Invalid Razorpay webhook signature');
      res.status(403).send('Invalid signature');
      return;
    }

    const event = req.body.event;
    const payment = req.body.payload?.payment?.entity;

    if (event === 'payment.captured') {
      await handlePaymentCaptured(payment);
    } else if (event === 'payment.failed') {
      await handlePaymentFailed(payment);
    }

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    logger.error('Razorpay webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function handlePaymentCaptured(payment: any) {
  const orderId = payment.notes?.order_id;
  if (!orderId) return;

  await db.updateOrderPaymentStatus(orderId, 'paid', payment.id);

  const { data: order } = await supabase
    .from('orders')
    .select('*, sessions(*), restaurants(*)')
    .eq('id', orderId)
    .single();

  if (!order) return;

  const restaurant = order.restaurants as any;
  const session = order.sessions as any;

  await sendWhatsAppMessage({
    phoneNumberId: restaurant.whatsapp_number_id,
    to: session.wa_phone_number,
    message: `✅ Payment received! Thank you for dining with us.\n\nReceipt: ${payment.id}`
  });

  logger.info('Payment processed:', { orderId, amount: payment.amount });
}

async function handlePaymentFailed(payment: any) {
  const orderId = payment.notes?.order_id;
  if (!orderId) return;

  await db.updateOrderPaymentStatus(orderId, 'failed', payment.id);

  const { data: order } = await supabase
    .from('orders')
    .select('*, sessions(*), restaurants(*)')
    .eq('id', orderId)
    .single();

  if (!order) return;

  const restaurant = order.restaurants as any;
  const session = order.sessions as any;

  await sendWhatsAppMessage({
    phoneNumberId: restaurant.whatsapp_number_id,
    to: session.wa_phone_number,
    message: `⚠️ Payment failed. Please try again or pay at the counter.`
  });

  logger.warn('Payment failed:', { orderId });
}

router.post('/stripe', async (_req: Request, res: Response) => {
  res.status(200).json({ received: true });
});

export default router;
