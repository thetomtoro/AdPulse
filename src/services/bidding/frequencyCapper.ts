import crypto from 'node:crypto';
import type { FrequencyCap } from '../../shared/types.js';
import type { ICacheProvider } from '../../infra/interfaces.js';

/**
 * Check if a user has exceeded the frequency cap for a campaign.
 * Uses sorted sets in the cache with impression timestamps as scores.
 */
export async function checkFrequencyCap(
  cache: ICacheProvider,
  userId: string,
  campaignId: string,
  cap: FrequencyCap,
): Promise<boolean> {
  const key = `freq:${userId}:${campaignId}`;
  const windowStart = Date.now() - cap.windowHours * 3600000;

  // Remove expired entries
  await cache.zremrangebyscore(key, 0, windowStart);

  // Count remaining
  const count = await cache.zcard(key);

  return count < cap.maxImpressions;
}

/**
 * Record an impression for frequency cap tracking.
 */
export async function recordImpression(
  cache: ICacheProvider,
  userId: string,
  campaignId: string,
): Promise<void> {
  const key = `freq:${userId}:${campaignId}`;
  const now = Date.now();
  // Use random suffix to ensure unique members even at same timestamp
  await cache.zadd(key, now, `${now}:${crypto.randomBytes(4).toString('hex')}`);
  await cache.expire(key, 86400 * 7); // 7 day TTL
}
