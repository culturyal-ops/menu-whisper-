import { CronJob } from 'cron';
import { db } from '../db/supabase';
import { sendWhatsAppMessage } from '../utils/whatsappSender';
import { logger } from '../utils/logger';

/**
 * Marketing automation: Re-engage guests who haven't visited in 21 days
 */
export const marketingReengagementJob = new CronJob(
  '0 9 * * *', // Every day at 9 AM
  async () => {
    try {
      logger.info('Running marketing re-engagement job');
      
      const { data: inactiveGuests } = await db.supabase
        .from('guest_profiles')
        .select('*, restaurants(*)')
        .eq('opted_in_marketing', true)
        .lt('last_visit', new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString());
      
      if (!inactiveGuests || inactiveGuests.length === 0) {
        logger.info('No inactive guests to re-engage');
        return;
      }
      
      // Check frequency cap: max 2 marketing messages per month
      for (const guest of inactiveGuests) {
        const { data: recentMessages } = await db.supabase
          .from('marketing_queue')
          .select('*')
          .eq('guest_profile_id', guest.id)
          .gte('sent_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
        
        if (recentMessages && recentMessages.length >= 2) {
          logger.info(`Skipping guest ${guest.id} - frequency cap reached`);
          continue;
        }
        
        // Queue marketing message
        await db.supabase.from('marketing_queue').insert({
          restaurant_id: guest.restaurant_id,
          guest_profile_id: guest.id,
          message_template_id: 'reengagement_21day',
          scheduled_for: new Date().toISOString(),
          status: 'pending'
        });
      }
      
      logger.info(`Queued ${inactiveGuests.length} marketing messages`);
      
    } catch (error) {
      logger.error('Marketing re-engagement job failed:', error);
    }
  },
  null,
  false,
  'Asia/Kolkata'
);

/**
 * Process marketing queue: Send scheduled messages
 */
export const processMarketingQueueJob = new CronJob(
  '*/5 * * * *', // Every 5 minutes
  async () => {
    try {
      const { data: pendingMessages } = await db.supabase
        .from('marketing_queue')
        .select('*, guest_profiles(*), restaurants(*)')
        .eq('status', 'pending')
        .lte('scheduled_for', new Date().toISOString())
        .limit(50);
      
      if (!pendingMessages || pendingMessages.length === 0) {
        return;
      }
      
      for (const message of pendingMessages) {
        try {
          const restaurant = message.restaurants;
          const guest = message.guest_profiles;
          
          // Get message template
          const messageText = getMarketingTemplate(
            message.message_template_id,
            restaurant.name
          );
          
          // Send via WhatsApp
          await sendWhatsAppMessage({
            phoneNumberId: restaurant.whatsapp_number_id,
            to: guest.wa_phone_number,
            message: messageText
          });
          
          // Mark as sent
          await db.supabase
            .from('marketing_queue')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString()
            })
            .eq('id', message.id);
          
          logger.info(`Sent marketing message to guest ${guest.id}`);
          
        } catch (error) {
          logger.error(`Failed to send marketing message ${message.id}:`, error);
          
          // Mark as failed
          await db.supabase
            .from('marketing_queue')
            .update({ status: 'failed' })
            .eq('id', message.id);
        }
      }
      
    } catch (error) {
      logger.error('Process marketing queue job failed:', error);
    }
  },
  null,
  false,
  'Asia/Kolkata'
);

/**
 * Daily analytics report
 */
export const dailyAnalyticsReportJob = new CronJob(
  '0 23 * * *', // Every day at 11 PM
  async () => {
    try {
      logger.info('Generating daily analytics reports');
      
      const { data: restaurants } = await db.supabase
        .from('restaurants')
        .select('*');
      
      if (!restaurants) return;
      
      for (const restaurant of restaurants) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Get today's stats
        const { data: orders } = await db.supabase
          .from('orders')
          .select('*')
          .eq('restaurant_id', restaurant.id)
          .gte('created_at', today.toISOString());
        
        const totalOrders = orders?.length || 0;
        const revenue = orders?.reduce((sum, o) => sum + parseFloat(o.total), 0) || 0;
        const avgOrderValue = totalOrders > 0 ? revenue / totalOrders : 0;
        
        // Send report (email or Slack)
        logger.info(`Daily report for ${restaurant.name}:`, {
          totalOrders,
          revenue: revenue.toFixed(2),
          avgOrderValue: avgOrderValue.toFixed(2)
        });
        
        // TODO: Send via email/Slack
      }
      
    } catch (error) {
      logger.error('Daily analytics report job failed:', error);
    }
  },
  null,
  false,
  'Asia/Kolkata'
);

/**
 * Cleanup old logs (data retention)
 */
export const cleanupOldLogsJob = new CronJob(
  '0 2 * * *', // Every day at 2 AM
  async () => {
    try {
      logger.info('Cleaning up old logs');
      
      const retentionDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      
      await db.supabase
        .from('conversation_logs')
        .delete()
        .lt('created_at', retentionDate.toISOString());
      
      logger.info('Old logs cleaned up');
      
    } catch (error) {
      logger.error('Cleanup old logs job failed:', error);
    }
  },
  null,
  false,
  'Asia/Kolkata'
);

/**
 * Check unpaid orders and retry payment links
 */
export const retryUnpaidOrdersJob = new CronJob(
  '*/30 * * * *', // Every 30 minutes
  async () => {
    try {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      
      const { data: unpaidOrders } = await db.supabase
        .from('orders')
        .select('*, restaurants(*), sessions(*)')
        .eq('payment_status', 'unpaid')
        .eq('status', 'completed')
        .lt('created_at', twoHoursAgo.toISOString());
      
      if (!unpaidOrders || unpaidOrders.length === 0) {
        return;
      }
      
      for (const order of unpaidOrders) {
        // Regenerate payment link and send reminder
        logger.info(`Retrying payment for order ${order.id}`);
        
        // TODO: Generate new payment link and send via WhatsApp
      }
      
    } catch (error) {
      logger.error('Retry unpaid orders job failed:', error);
    }
  },
  null,
  false,
  'Asia/Kolkata'
);

/**
 * Get marketing message template
 */
function getMarketingTemplate(templateId: string, restaurantName: string): string {
  const templates: Record<string, string> = {
    reengagement_21day: `We miss you! 🌿\n\nIt's been a while since your last visit to ${restaurantName}. Come back this week and enjoy 15% off your next meal.\n\nTap here to reserve a table or ask me anything about our new menu!`,
    
    special_offer: `🎉 Special Offer at ${restaurantName}\n\nThis weekend only: Complimentary dessert with any main course. Reserve your table now!`,
    
    birthday: `🎂 Happy Birthday!\n\n${restaurantName} would love to celebrate with you. Enjoy a complimentary birthday dessert when you dine with us this month!`
  };
  
  return templates[templateId] || templates.reengagement_21day;
}

/**
 * Start all cron jobs
 */
export function startAllCronJobs() {
  marketingReengagementJob.start();
  processMarketingQueueJob.start();
  dailyAnalyticsReportJob.start();
  cleanupOldLogsJob.start();
  retryUnpaidOrdersJob.start();
  
  logger.info('All cron jobs started');
}

/**
 * Stop all cron jobs
 */
export function stopAllCronJobs() {
  marketingReengagementJob.stop();
  processMarketingQueueJob.stop();
  dailyAnalyticsReportJob.stop();
  cleanupOldLogsJob.stop();
  retryUnpaidOrdersJob.stop();
  
  logger.info('All cron jobs stopped');
}
