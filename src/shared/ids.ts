import crypto from 'node:crypto';

/**
 * Generates a UUIDv7 (time-sortable UUID).
 * Format: 8-4-4-4-12 hex, with version=7 and variant bits set.
 */
export function uuidv7(): string {
  const now = Date.now();

  // 48-bit timestamp
  const timeBits = new Uint8Array(6);
  for (let i = 5; i >= 0; i--) {
    timeBits[i] = now & 0xff;
    // Use bitwise shift for the lower bits, division for upper bits
    if (i > 0) {
      // Safe: we're shifting within 32-bit range on lower iterations
    }
  }
  // Manual extraction since bitwise ops are 32-bit in JS
  const timeHex = now.toString(16).padStart(12, '0');

  // 74 bits of randomness
  const randomBytes = crypto.randomBytes(10);

  // Build the UUID
  // Positions: time_high(8) - time_mid(4) - ver+time_low(4) - var+rand(4) - rand(12)
  const hex = timeHex + crypto.randomBytes(10).toString('hex');

  // Set version (7) and variant (10xx)
  const uuid = [
    hex.slice(0, 8),
    hex.slice(8, 12),
    '7' + hex.slice(13, 16),                     // version 7
    ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16) + hex.slice(17, 20), // variant 10xx
    hex.slice(20, 32),
  ].join('-');

  return uuid;
}

// Prefixed ID generators
export const campaignId = () => `cmp_${uuidv7()}`;
export const creativeId = () => `crt_${uuidv7()}`;
export const requestId = () => `req_${uuidv7()}`;
export const eventId = () => `evt_${uuidv7()}`;
export const advertiserId = () => `adv_${uuidv7()}`;
export const apiKeyId = () => `key_${uuidv7()}`;
export const webhookId = () => `whk_${uuidv7()}`;
export const conversionId = () => `cnv_${uuidv7()}`;
