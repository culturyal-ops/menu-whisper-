import { CronJob } from 'cron';
import { supabase } from '../db/supabase';
import { sendWhatsAppMessage } from '../utils/whatsappSender';
import { logger } from '../utils/logger';

export const marketingReengagementJob = new CronJob(
  '0 9 * * *',
  async () => {
    try {
      logger.info('Running marketing re-engagement job');

      const { data: inactiveGuests } = await supabase
        .from('guest_profiles')
        .select('*, restaurants(*)')
        .eq('opted_in_marketing', true)
        .lt('last_visit', new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString());

      if (!inactiveGuests || inactiveGuests.length === 0) {
        logger.info('No inactive guests to re-engage');
        return;
      }

      for (const guest of inactiveGuests) {
        const { data: recentMessages } = await supabase
          .from('marketing_queue')
          .select('*')
          .eq('guest_profile_id', guest.id)
          .gte('sent_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

        if (recentMessages && recentMessages.length >= 2) continue;

        await supabase.from('marketing_queue').insert({
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
  null, false, 'Asia/Kolkata'
);

export const processMarketingQueueJob = new CronJob(
  '*/5 * * * *',
  async () => {
    try {
      const { data: pendingMessages } = await supabase
        .from('marketing_queue')
        .select('*, guest_profiles(*), restaurants(*)')
        .eq('status', 'pending')
        .lte('scheduled_for', new Date().toISOString())
        .limit(50);

      if (!pendingMessages || pendingMessages.length === 0) return;

      for (const message of pendingMessages) {
        try {
          const restaurant = message.restaurants as any;
          const guest = message.guest_profiles as any;
          const messageText = getMarketingTemplate(message.message_template_id, restaurant.name);

          await sendWhatsAppMessage({
            phoneNumberId: restaurant.whatsapp_number_id,
            to: guest.wa_phone_number,
            message: messageText
          });

          await supabase
            .from('marketing_queue')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('id', message.id);

          logger.info(`Sent marketing message to guest ${guest.id}`);
        } catch (error) {
          logger.error(`Failed to send marketing message ${message.id}:`, error);
          await supabase
            .from('marketing_queue')
            .update({ status: 'failed' })
            .eq('id', message.id);
        }
      }
    } catch (error) {
      logger.error('Process marketing queue job failed:', error);
    }
  },
  null, false, 'Asia/Kolkata'
);

export const dailyAnalyticsReportJob = new CronJob(
  '0 23 * * *',
  async () => {
    try {
      logger.info('Generating daily analytics reports');

      const { data: restaurants } = await supabase.from('restaurants').select('*');
      if (!restaurants) return;

      for (const restaurant of restaurants) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data: orders } = await supabase
          .from('orders')
          .select('*')
          .eq('restaurant_id', restaurant.id)
          .gte('created_at', today.toISOString());

        const totalOrders = orders?.length || 0;
        const revenue = orders?.reduce((sum: number, o: any) => sum + parseFloat(o.total), 0) || 0;

        logger.info(`Daily report for ${restaurant.name}:`, {
          totalOrders,
          revenue: revenue.toFixed(2)
        });
      }
    } catch (error) {
      logger.error('Daily analytics report job failed:', error);
    }
  },
  null, false, 'Asia/Kolkata'
);

export const cleanupOldLogsJob = new CronJob(
  '0 2 * * *',
  async () => {
    try {
      const retentionDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      await supabase
        .from('conversation_logs')
        .delete()
        .lt('created_at', retentionDate.toISOString());
      logger.info('Old logs cleaned up');
    } catch (error) {
      logger.error('Cleanup old logs job failed:', error);
    }
  },
  null, false, 'Asia/Kolkata'
);

export const retryUnpaidOrdersJob = new CronJob(
  '*/30 * * * *',
  async () => {
    try {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const { data: unpaidOrders } = await supabase
        .from('orders')
        .select('*')
        .eq('payment_status', 'unpaid')
        .eq('status', 'completed')
        .lt('created_at', twoHoursAgo.toISOString());

      if (!unpaidOrders || unpaidOrders.length === 0) return;

      for (const order of unpaidOrders) {
        logger.info(`Retrying payment for order ${order.id}`);
      }
    } catch (error) {
      logger.error('Retry unpaid orders job failed:', error);
    }
  },
  null, false, 'Asia/Kolkata'
);

function getMarketingTemplate(templateId: string, restaurantName: string): string {
  const templates: Record<string, string> = {
    reengagement_21day: `We miss you! 🌿\n\nIt's been a while since your last visit to ${restaurantName}. Come back this week and enjoy 15% off your next meal.`,
    special_offer: `🎉 Special Offer at ${restaurantName}\n\nThis weekend only: Complimentary dessert with any main course.`,
    birthday: `🎂 Happy Birthday!\n\n${restaurantName} would love to celebrate with you.`
  };
  return templates[templateId] || templates['reengagement_21day'];
}

export function startAllCronJobs() {
  marketingReengagementJob.start();
  processMarketingQueueJob.start();
  dailyAnalyticsReportJob.start();
  cleanupOldLogsJob.start();
  retryUnpaidOrdersJob.start();
  logger.info('All cron jobs started');
}

export function stopAllCronJobs() {
  marketingReengagementJob.stop();
  processMarketingQueueJob.stop();
  dailyAnalyticsReportJob.stop();
  cleanupOldLogsJob.stop();
  retryUnpaidOrdersJob.stop();
  logger.info('All cron jobs stopped');
}
