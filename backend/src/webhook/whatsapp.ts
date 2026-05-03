import { Router, Request, Response } from 'express';
import { verifyWhatsAppSignature, hashPhoneNumber } from '../utils/crypto';
import { sendWhatsAppMessage } from '../utils/whatsappSender';
import { db } from '../db/supabase';
import { cache } from '../db/redis';
import { checkWhatsAppRateLimit } from '../middleware/rateLimiter';
import { processMessage } from '../ai/router';
import { logger } from '../utils/logger';

const router = Router();

const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'menu-whisper-verify';
const META_APP_SECRET = process.env.META_APP_SECRET!;

/**
 * Webhook verification (GET)
 */
router.get('/whatsapp', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
    logger.info('WhatsApp webhook verified');
    res.status(200).send(challenge);
  } else {
    res.status(403).send('Forbidden');
  }
});

/**
 * Webhook message receiver (POST)
 */
router.post('/whatsapp', async (req: Request, res: Response) => {
  // Verify signature
  const signature = req.headers['x-hub-signature-256'] as string;
  const rawBody = req.body.toString();
  
  if (!verifyWhatsAppSignature(rawBody, signature, META_APP_SECRET)) {
    logger.warn('Invalid webhook signature');
    return res.status(403).send('Invalid signature');
  }

  // Respond immediately to Meta (required within 15 seconds)
  res.status(200).send('OK');

  // Parse webhook payload
  const body = JSON.parse(rawBody);
  
  try {
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    if (!messages || messages.length === 0) {
      return;
    }

    const message = messages[0];
    const from = message.from; // Guest's phone number
    const messageText = message.text?.body;
    const messageId = message.id;

    if (!messageText) {
      return; // Ignore non-text messages for now
    }

    // Rate limiting
    const allowed = await checkWhatsAppRateLimit(from);
    if (!allowed) {
      logger.warn(`Rate limit exceeded for ${from}`);
      return;
    }

    // Get restaurant from phone number ID
    const phoneNumberId = value.metadata?.phone_number_id;
    const restaurant = await db.getRestaurantByWhatsAppNumber(phoneNumberId);

    if (!restaurant) {
      logger.error(`Restaurant not found for phone number ID: ${phoneNumberId}`);
      return;
    }

    // Hash guest phone number
    const phoneHash = hashPhoneNumber(from);

    // Find or create guest profile
    const guestProfile = await db.findOrCreateGuestProfile(restaurant.id, phoneHash);

    // Create or update session
    const session = await db.createOrUpdateSession(restaurant.id, guestProfile.id, from);

    // Log user message
    await db.logConversation(
      restaurant.id,
      session.id,
      'user',
      messageText
    );

    // Process message with AI
    const aiResponse = await processMessage({
      restaurantId: restaurant.id,
      sessionId: session.id,
      guestProfileId: guestProfile.id,
      userMessage: messageText,
      phoneNumber: from
    });

    // Send AI response
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

  } catch (error: any) {
    logger.error('Error processing WhatsApp message:', error);
  }
});

export default router;
