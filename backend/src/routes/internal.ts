import { Router } from 'express';
import { hashPhoneNumber } from '../utils/crypto';
import { sendWhatsAppMessage } from '../utils/whatsappSender';
import { db } from '../db/supabase';
import { cache } from '../db/redis';
import { processMessage } from '../ai/router';
import { sendToKitchenPrinter } from '../automation/kitchenPrinter';
import { broadcastNewOrder } from '../automation/realtimeUpdates';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Internal endpoint for n8n to process WhatsApp messages
 * This separates webhook receiving (fast) from processing (slow)
 */
router.post('/process-whatsapp', async (req, res) => {
  try {
    const { from, text, phoneNumberId, messageId } = req.body;
    
    if (!from || !text || !phoneNumberId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Get restaurant
    const restaurant = await db.getRestaurantByWhatsAppNumber(phoneNumberId);
    
    if (!restaurant) {
      logger.error('Restaurant not found for phone number ID:', phoneNumberId);
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    
    // Hash guest phone
    const phoneHash = hashPhoneNumber(from);
    
    // Find or create guest profile
    const guestProfile = await db.findOrCreateGuestProfile(restaurant.id, phoneHash);
    
    // Create or update session
    const session = await db.createOrUpdateSession(restaurant.id, guestProfile.id, from);
    
    // Log user message
    await db.logConversation(restaurant.id, session.id, 'user', text);
    
    // Process with AI
    const aiResponse = await processMessage({
      restaurantId: restaurant.id,
      sessionId: session.id,
      guestProfileId: guestProfile.id,
      userMessage: text,
      phoneNumber: from
    });
    
    // Send reply
    await sendWhatsAppMessage({
      phoneNumberId,
      to: from,
      message: aiResponse.reply
    });
    
    // Log AI response
    await db.logConversation(
      restaurant.id,
      session.id,
      'ai',
      aiResponse.reply,
      aiResponse.intent,
      aiResponse.tokensUsed,
      aiResponse.costUsd
    );
    
    // Handle special intents
    if (aiResponse.intent === 'ORDER' && aiResponse.orderData) {
      await handleOrderIntent(restaurant, session, aiResponse.orderData);
    }
    
    res.json({
      success: true,
      messageId,
      intent: aiResponse.intent
    });
    
  } catch (error: any) {
    logger.error('Error processing WhatsApp message:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Process marketing queue
 */
router.post('/marketing/process-queue', async (req, res) => {
  try {
    const { data: pendingMessages } = await db.supabase
      .from('marketing_queue')
      .select('*, guest_profiles(*), restaurants(*)')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .limit(100);
    
    if (!pendingMessages || pendingMessages.length === 0) {
      return res.json({ messagesSent: 0 });
    }
    
    let sentCount = 0;
    
    for (const message of pendingMessages) {
      try {
        const restaurant = message.restaurants;
        const guest = message.guest_profiles;
        
        const messageText = `We miss you! 🌿\n\nIt's been a while since your last visit to ${restaurant.name}. Come back this week and enjoy 15% off your next meal.`;
        
        await sendWhatsAppMessage({
          phoneNumberId: restaurant.whatsapp_number_id,
          to: guest.wa_phone_number,
          message: messageText
        });
        
        await db.supabase
          .from('marketing_queue')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', message.id);
        
        sentCount++;
        
      } catch (error) {
        logger.error('Failed to send marketing message:', error);
      }
    }
    
    res.json({ messagesSent: sentCount });
    
  } catch (error: any) {
    logger.error('Error processing marketing queue:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Handle order intent
 */
async function handleOrderIntent(restaurant: any, session: any, orderData: any) {
  try {
    // Create order
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
    
    // Send to kitchen printer
    await sendToKitchenPrinter({
      orderId: order.id,
      tableNumber: orderData.tableNumber,
      items: orderData.items,
      notes: orderData.notes,
      restaurantId: restaurant.id
    });
    
    // Broadcast to dashboard
    await broadcastNewOrder(order);
    
    logger.info('Order created and sent to kitchen:', { orderId: order.id });
    
  } catch (error) {
    logger.error('Error handling order intent:', error);
  }
}

export default router;
