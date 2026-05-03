import axios from 'axios';
import { logger } from '../utils/logger';

interface PrintJobParams {
  orderId: string;
  tableNumber: string;
  items: Array<{
    name: string;
    quantity: number;
    modifications?: string;
  }>;
  notes?: string;
  restaurantId: string;
}

/**
 * Send order to kitchen printer
 * Supports multiple printer services
 */
export async function sendToKitchenPrinter(params: PrintJobParams): Promise<boolean> {
  const printerService = process.env.PRINTER_SERVICE || 'printnode';
  
  try {
    switch (printerService) {
      case 'printnode':
        return await sendToPrintNode(params);
      
      case 'webhook':
        return await sendToWebhook(params);
      
      case 'local':
        return await sendToLocalPrinter(params);
      
      default:
        logger.warn('No printer service configured, logging order instead');
        logOrderToConsole(params);
        return true;
    }
  } catch (error) {
    logger.error('Failed to send to kitchen printer:', error);
    
    // Retry logic
    await retryPrint(params);
    
    return false;
  }
}

/**
 * PrintNode integration (cloud printing service)
 */
async function sendToPrintNode(params: PrintJobParams): Promise<boolean> {
  const apiKey = process.env.PRINTNODE_API_KEY;
  const printerId = process.env.PRINTNODE_PRINTER_ID;
  
  if (!apiKey || !printerId) {
    throw new Error('PrintNode not configured');
  }
  
  const printContent = formatOrderForPrint(params);
  
  const response = await axios.post(
    'https://api.printnode.com/printjobs',
    {
      printerId: parseInt(printerId),
      title: `Order ${params.orderId}`,
      contentType: 'raw_base64',
      content: Buffer.from(printContent).toString('base64'),
      source: 'MenuWhisper'
    },
    {
      auth: {
        username: apiKey,
        password: ''
      }
    }
  );
  
  logger.info('Order sent to PrintNode:', { orderId: params.orderId, jobId: response.data });
  return true;
}

/**
 * Generic webhook integration (for custom printer setups)
 */
async function sendToWebhook(params: PrintJobParams): Promise<boolean> {
  const webhookUrl = process.env.KITCHEN_PRINTER_WEBHOOK;
  
  if (!webhookUrl) {
    throw new Error('Kitchen printer webhook not configured');
  }
  
  await axios.post(webhookUrl, {
    orderId: params.orderId,
    tableNumber: params.tableNumber,
    items: params.items,
    notes: params.notes,
    timestamp: new Date().toISOString()
  });
  
  logger.info('Order sent to kitchen webhook:', { orderId: params.orderId });
  return true;
}

/**
 * Local printer integration (for on-premise setups)
 */
async function sendToLocalPrinter(params: PrintJobParams): Promise<boolean> {
  const printerIp = process.env.LOCAL_PRINTER_IP;
  const printerPort = process.env.LOCAL_PRINTER_PORT || '9100';
  
  if (!printerIp) {
    throw new Error('Local printer not configured');
  }
  
  const printContent = formatOrderForPrint(params);
  
  // Send raw data to printer (ESC/POS format)
  await axios.post(`http://${printerIp}:${printerPort}/print`, {
    data: printContent
  });
  
  logger.info('Order sent to local printer:', { orderId: params.orderId });
  return true;
}

/**
 * Format order for thermal printer (ESC/POS style)
 */
function formatOrderForPrint(params: PrintJobParams): string {
  const lines = [
    '========================================',
    '           NEW ORDER',
    '========================================',
    '',
    `Order ID: ${params.orderId}`,
    `Table: ${params.tableNumber}`,
    `Time: ${new Date().toLocaleTimeString('en-IN')}`,
    '',
    '----------------------------------------',
    'ITEMS:',
    '----------------------------------------',
    ''
  ];
  
  params.items.forEach(item => {
    lines.push(`${item.quantity}x ${item.name}`);
    if (item.modifications) {
      lines.push(`   * ${item.modifications}`);
    }
  });
  
  if (params.notes) {
    lines.push('');
    lines.push('NOTES:');
    lines.push(params.notes);
  }
  
  lines.push('');
  lines.push('========================================');
  lines.push('');
  lines.push('');
  
  return lines.join('\n');
}

/**
 * Log order to console (fallback when no printer configured)
 */
function logOrderToConsole(params: PrintJobParams) {
  console.log('\n' + formatOrderForPrint(params));
}

/**
 * Retry print job with exponential backoff
 */
async function retryPrint(params: PrintJobParams, attempt: number = 1) {
  const maxRetries = 3;
  
  if (attempt > maxRetries) {
    logger.error('Max print retries reached:', { orderId: params.orderId });
    
    // Send alert to restaurant staff via Slack/SMS
    await sendPrinterFailureAlert(params);
    return;
  }
  
  const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
  
  logger.info(`Retrying print job in ${delay}ms (attempt ${attempt}/${maxRetries})`);
  
  setTimeout(async () => {
    const success = await sendToKitchenPrinter(params);
    
    if (!success) {
      await retryPrint(params, attempt + 1);
    }
  }, delay);
}

/**
 * Send alert when printer fails
 */
async function sendPrinterFailureAlert(params: PrintJobParams) {
  const slackWebhook = process.env.SLACK_WEBHOOK_URL;
  
  if (!slackWebhook) {
    return;
  }
  
  try {
    await axios.post(slackWebhook, {
      text: `⚠️ Kitchen Printer Failure`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Kitchen printer failed for Order ${params.orderId}*\n\nTable: ${params.tableNumber}\nItems: ${params.items.length}\n\nPlease check printer status and manually relay order to kitchen.`
          }
        }
      ]
    });
    
    logger.info('Printer failure alert sent to Slack');
  } catch (error) {
    logger.error('Failed to send Slack alert:', error);
  }
}
