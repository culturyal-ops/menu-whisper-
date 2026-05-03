import { supabase } from '../db/supabase';
import { logger } from '../utils/logger';

/**
 * Broadcast new order to dashboard in real-time
 */
export async function broadcastNewOrder(order: any) {
  try {
    await supabase
      .channel('orders')
      .send({
        type: 'broadcast',
        event: 'new_order',
        payload: order
      });
    
    logger.info('Broadcasted new order:', { orderId: order.id });
  } catch (error) {
    logger.error('Failed to broadcast new order:', error);
  }
}

/**
 * Broadcast order status update
 */
export async function broadcastOrderStatusUpdate(orderId: string, status: string) {
  try {
    await supabase
      .channel('orders')
      .send({
        type: 'broadcast',
        event: 'order_status_update',
        payload: { orderId, status, timestamp: new Date().toISOString() }
      });
    
    logger.info('Broadcasted order status update:', { orderId, status });
  } catch (error) {
    logger.error('Failed to broadcast order status update:', error);
  }
}

/**
 * Broadcast payment confirmation
 */
export async function broadcastPaymentConfirmation(orderId: string, amount: number) {
  try {
    await supabase
      .channel('payments')
      .send({
        type: 'broadcast',
        event: 'payment_confirmed',
        payload: { orderId, amount, timestamp: new Date().toISOString() }
      });
    
    logger.info('Broadcasted payment confirmation:', { orderId, amount });
  } catch (error) {
    logger.error('Failed to broadcast payment confirmation:', error);
  }
}

/**
 * Broadcast new conversation message (for live chat view)
 */
export async function broadcastConversationMessage(
  restaurantId: string,
  sessionId: string,
  message: any
) {
  try {
    await supabase
      .channel(`conversations:${restaurantId}`)
      .send({
        type: 'broadcast',
        event: 'new_message',
        payload: { sessionId, message, timestamp: new Date().toISOString() }
      });
    
    logger.info('Broadcasted conversation message:', { sessionId });
  } catch (error) {
    logger.error('Failed to broadcast conversation message:', error);
  }
}
