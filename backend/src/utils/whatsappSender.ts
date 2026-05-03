import axios from 'axios';
import { logger } from './logger';

const META_API_URL = 'https://graph.facebook.com/v18.0';
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

interface SendMessageParams {
  phoneNumberId: string;
  to: string;
  message: string;
}

interface SendInteractiveButtonParams {
  phoneNumberId: string;
  to: string;
  bodyText: string;
  buttons: Array<{ id: string; title: string }>;
}

/**
 * Send text message via WhatsApp
 */
export async function sendWhatsAppMessage({
  phoneNumberId,
  to,
  message
}: SendMessageParams): Promise<void> {
  try {
    await axios.post(
      `${META_API_URL}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { body: message }
      },
      {
        headers: {
          'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    logger.info(`WhatsApp message sent to ${to}`);
  } catch (error: any) {
    logger.error('Failed to send WhatsApp message:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Send interactive button message
 */
export async function sendInteractiveButton({
  phoneNumberId,
  to,
  bodyText,
  buttons
}: SendInteractiveButtonParams): Promise<void> {
  try {
    await axios.post(
      `${META_API_URL}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: bodyText },
          action: {
            buttons: buttons.map(btn => ({
              type: 'reply',
              reply: { id: btn.id, title: btn.title }
            }))
          }
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    logger.info(`Interactive button sent to ${to}`);
  } catch (error: any) {
    logger.error('Failed to send interactive button:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Mark message as read
 */
export async function markMessageAsRead(
  phoneNumberId: string,
  messageId: string
): Promise<void> {
  try {
    await axios.post(
      `${META_API_URL}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId
      },
      {
        headers: {
          'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error: any) {
    logger.error('Failed to mark message as read:', error.response?.data || error.message);
  }
}
