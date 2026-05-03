import { Queue, Worker, Job } from 'bullmq';
import { redis } from '../db/redis';
import { logger } from '../utils/logger';

/**
 * Dead Letter Queue for failed operations
 */
export const deadLetterQueue = new Queue('dead-letter', {
  connection: redis
});

/**
 * Retry queue for transient failures
 */
export const retryQueue = new Queue('retry', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  }
});

/**
 * Add failed operation to retry queue
 */
export async function addToRetryQueue(
  operation: string,
  data: any,
  priority: number = 1
) {
  await retryQueue.add(operation, data, {
    priority,
    removeOnComplete: true,
    removeOnFail: false
  });
  
  logger.info('Added to retry queue:', { operation, priority });
}

/**
 * Add unrecoverable failure to dead letter queue
 */
export async function addToDeadLetterQueue(
  operation: string,
  data: any,
  error: any
) {
  await deadLetterQueue.add('failed-operation', {
    operation,
    data,
    error: {
      message: error.message,
      stack: error.stack
    },
    timestamp: new Date().toISOString()
  });
  
  logger.error('Added to dead letter queue:', { operation, error: error.message });
}

/**
 * Retry worker - processes failed operations
 */
export const retryWorker = new Worker(
  'retry',
  async (job: Job) => {
    logger.info('Processing retry job:', { operation: job.name, attempt: job.attemptsMade });
    
    try {
      switch (job.name) {
        case 'send-whatsapp-message':
          await retrySendWhatsAppMessage(job.data);
          break;
        
        case 'send-to-printer':
          await retrySendToPrinter(job.data);
          break;
        
        case 'process-payment':
          await retryProcessPayment(job.data);
          break;
        
        default:
          logger.warn('Unknown retry operation:', job.name);
      }
      
      logger.info('Retry job succeeded:', { operation: job.name });
      
    } catch (error: any) {
      logger.error('Retry job failed:', { operation: job.name, error: error.message });
      
      // If max attempts reached, move to dead letter queue
      if (job.attemptsMade >= (job.opts.attempts || 3)) {
        await addToDeadLetterQueue(job.name, job.data, error);
      }
      
      throw error; // Re-throw to trigger BullMQ retry
    }
  },
  {
    connection: redis,
    concurrency: 5
  }
);

/**
 * Retry sending WhatsApp message
 */
async function retrySendWhatsAppMessage(data: any) {
  const { sendWhatsAppMessage } = await import('../utils/whatsappSender');
  await sendWhatsAppMessage(data);
}

/**
 * Retry sending to kitchen printer
 */
async function retrySendToPrinter(data: any) {
  const { sendToKitchenPrinter } = await import('./kitchenPrinter');
  await sendToKitchenPrinter(data);
}

/**
 * Retry payment processing
 */
async function retryProcessPayment(data: any) {
  // Implement payment retry logic
  logger.info('Retrying payment processing:', data);
}

/**
 * Circuit breaker for external services
 */
class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private threshold: number = 5,
    private timeout: number = 60000 // 1 minute
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
        logger.info('Circuit breaker entering half-open state');
      } else {
        throw new Error('Circuit breaker is open');
      }
    }
    
    try {
      const result = await fn();
      
      if (this.state === 'half-open') {
        this.state = 'closed';
        this.failures = 0;
        logger.info('Circuit breaker closed');
      }
      
      return result;
      
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();
      
      if (this.failures >= this.threshold) {
        this.state = 'open';
        logger.error('Circuit breaker opened due to failures');
      }
      
      throw error;
    }
  }
  
  getState() {
    return this.state;
  }
}

// Export circuit breakers for external services
export const whatsappCircuitBreaker = new CircuitBreaker(5, 60000);
export const aiCircuitBreaker = new CircuitBreaker(10, 30000);
export const paymentCircuitBreaker = new CircuitBreaker(3, 120000);
