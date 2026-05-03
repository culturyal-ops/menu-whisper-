import crypto from 'crypto';

/**
 * Hash phone number for privacy (SHA256)
 */
export function hashPhoneNumber(phoneNumber: string): string {
  return crypto.createHash('sha256').update(phoneNumber).digest('hex');
}

/**
 * Verify WhatsApp webhook signature
 */
export function verifyWhatsAppSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(`sha256=${expectedSignature}`)
    );
  } catch {
    return false;
  }
}

/**
 * Generate secure random token
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}
