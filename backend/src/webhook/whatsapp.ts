import { Router, Request, Response } from 'express';
import { verifyWhatsAppSignature, hashPhoneNumber } from '../utils/crypto';
import { sendWhatsAppMessage } from '../utils/whatsappSender';
import { db } from '../db/supabase';
import { checkWhatsAppRateLimit } from '../middleware/rateLimiter';
import { processMessage } from '../ai/router';
import { logger } from '../utils/logger';

const router = Router();

const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'menu-whisper-verify';
const META_APP_SECRET = process.env.META_APP_SECRET || '';

// Webhook verification (GET)
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

// Webhook message receiver (POST)
router.post('/whatsapp', async (req: Request, res: Response) => {
  const signature = req.headers['x-hub-signature-256'] as string;
  const rawBody = req.body.toString();

  if (META_APP_SECRET && !verifyWhatsAppSignature(rawBody, signature, META_APP_SECRET)) {
    logger.warn('Invalid webhook signature');
    res.status(403).send('Invalid signature');
    return;
  }

  // Respond immediately to Meta
  res.status(200).send('OK');

  try {
    const body = JSON.parse(rawBody);
    const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message) return;

    const from: string = message.from;
    const messageText: string = message.text?.body;
    const phoneNumberId: string = body.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;

    if (!messageText) return;

    const allowed = await checkWhatsAppRateLimit(from);
    if (!allowed) {
      logger.warn(`Rate limit exceeded for ${from}`);
      return;
    }

    const restaurant = await db.getRestaurantByWhatsAppNumber(phoneNumberId);
    if (!restaurant) return;

    const phoneHash = hashPhoneNumber(from);
    const guestProfile = await db.findOrCreateGuestProfile(restaurant.id, phoneHash);
    const session = await db.createOrUpdateSession(restaurant.id, guestProfile.id, from);

    await db.logConversation(restaurant.id, session.id, 'user', messageText);

    const aiResponse = await processMessage({
      restaurantId: restaurant.id,
      sessionId: session.id,
      guestProfileId: guestProfile.id,
      userMessage: messageText,
      phoneNumber: from
    });

    await sendWhatsAppMessage({ phoneNumberId, to: from, message: aiResponse.reply });

    await db.logConversation(
      restaurant.id, session.id, 'ai',
      aiResponse.reply, aiResponse.intent,
      aiResponse.tokensUsed, aiResponse.costUsd
    );
  } catch (error) {
    logger.error('Error processing WhatsApp message:', error);
  }
});

export default router;
