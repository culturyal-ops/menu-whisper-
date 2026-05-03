import { Router, Request, Response } from 'express';
import { hashPhoneNumber } from '../utils/crypto';
import { sendWhatsAppMessage } from '../utils/whatsappSender';
import { db, supabase } from '../db/supabase';
import { processMessage } from '../ai/router';
import { sendToKitchenPrinter } from '../automation/kitchenPrinter';
import { broadcastNewOrder } from '../automation/realtimeUpdates';
import { logger } from '../utils/logger';

const router = Router();

router.post('/process-whatsapp', async (req: Request, res: Response) => {
  const { from, text, phoneNumberId } = req.body;

  if (!from || !text || !phoneNumberId) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  try {
    const restaurant = await db.getRestaurantByWhatsAppNumber(phoneNumberId);
    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant not found' });
      return;
    }

    const phoneHash = hashPhoneNumber(from);
    const guestProfile = await db.findOrCreateGuestProfile(restaurant.id, phoneHash);
    const session = await db.createOrUpdateSession(restaurant.id, guestProfile.id, from);

    await db.logConversation(restaurant.id, session.id, 'user', text);

    const aiResponse = await processMessage({
      restaurantId: restaurant.id,
      sessionId: session.id,
      guestProfileId: guestProfile.id,
      userMessage: text,
      phoneNumber: from
    });

    await sendWhatsAppMessage({ phoneNumberId, to: from, message: aiResponse.reply });

    await db.logConversation(
      restaurant.id, session.id, 'ai',
      aiResponse.reply, aiResponse.intent,
      aiResponse.tokensUsed, aiResponse.costUsd
    );

    if (aiResponse.intent === 'ORDER' && aiResponse.orderData) {
      await handleOrderIntent(restaurant, session, aiResponse.orderData);
    }

    res.json({ success: true, intent: aiResponse.intent });
  } catch (error: unknown) {
    logger.error('Error processing WhatsApp message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/marketing/process-queue', async (_req: Request, res: Response) => {
  try {
    const { data: pendingMessages } = await supabase
      .from('marketing_queue')
      .select('*, guest_profiles(*), restaurants(*)')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .limit(100);

    if (!pendingMessages || pendingMessages.length === 0) {
      res.json({ messagesSent: 0 });
      return;
    }

    let sentCount = 0;
    for (const message of pendingMessages) {
      try {
        const restaurant = message.restaurants as any;
        const messageText = `We miss you! 🌿\n\nIt's been a while since your last visit to ${restaurant.name}. Come back this week and enjoy 15% off your next meal.`;

        await sendWhatsAppMessage({
          phoneNumberId: restaurant.whatsapp_number_id,
          to: (message.guest_profiles as any).wa_phone_number,
          message: messageText
        });

        await supabase
          .from('marketing_queue')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', message.id);

        sentCount++;
      } catch (err) {
        logger.error('Failed to send marketing message:', err);
      }
    }

    res.json({ messagesSent: sentCount });
  } catch (error: unknown) {
    logger.error('Error processing marketing queue:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function handleOrderIntent(restaurant: any, session: any, orderData: any) {
  try {
    const order = await db.createOrder({
      restaurant_id: restaurant.id,
      session_id: session.id,
      guest_profile_id: session.guest_profile_id,
      table_number: orderData.tableNumber,
      items: orderData.items,
      subtotal: orderData.subtotal,
      tax: orderData.tax,
      total: orderData.total
    });

    await sendToKitchenPrinter({
      orderId: order.id,
      tableNumber: orderData.tableNumber,
      items: orderData.items,
      notes: orderData.notes,
      restaurantId: restaurant.id
    });

    await broadcastNewOrder(order);
    logger.info('Order created and sent to kitchen:', { orderId: order.id });
  } catch (error) {
    logger.error('Error handling order intent:', error);
  }
}

export default router;
