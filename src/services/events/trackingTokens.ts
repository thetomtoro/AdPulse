import crypto from 'node:crypto';
import type { TrackingPayload } from '../../shared/types.js';

export function createTrackingToken(
  payload: TrackingPayload,
  secret: string,
): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${signature}`;
}

export function verifyTrackingToken(
  token: string,
  secret: string,
): TrackingPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [encoded, signature] = parts;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(encoded)
    .digest('base64url');

  // Timing-safe comparison
  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return null;
  }

  try {
    const payload: TrackingPayload = JSON.parse(
      Buffer.from(encoded, 'base64url').toString(),
    );

    // Check expiry
    if (payload.exp < Date.now() / 1000) return null;

    return payload;
  } catch {
    return null;
  }
}
