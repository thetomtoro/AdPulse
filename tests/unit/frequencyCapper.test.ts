import { describe, it, expect, beforeEach } from 'vitest';
import { checkFrequencyCap, recordImpression } from '../../src/services/bidding/frequencyCapper.js';
import { MemoryCacheProvider } from '../../src/infra/cache/memory-cache.js';

describe('frequencyCapper', () => {
  let cache: MemoryCacheProvider;

  beforeEach(() => {
    cache = new MemoryCacheProvider();
  });

  const cap = { maxImpressions: 3, windowHours: 24, scope: 'CAMPAIGN' as const };

  it('allows when under cap', async () => {
    const result = await checkFrequencyCap(cache, 'user1', 'cmp1', cap);
    expect(result).toBe(true);
  });

  it('allows after some impressions but still under cap', async () => {
    await recordImpression(cache, 'user1', 'cmp1');
    await recordImpression(cache, 'user1', 'cmp1');
    const result = await checkFrequencyCap(cache, 'user1', 'cmp1', cap);
    expect(result).toBe(true);
  });

  it('blocks when at cap', async () => {
    await recordImpression(cache, 'user1', 'cmp1');
    await recordImpression(cache, 'user1', 'cmp1');
    await recordImpression(cache, 'user1', 'cmp1');
    const result = await checkFrequencyCap(cache, 'user1', 'cmp1', cap);
    expect(result).toBe(false);
  });

  it('does not cross-pollinate between users', async () => {
    await recordImpression(cache, 'user1', 'cmp1');
    await recordImpression(cache, 'user1', 'cmp1');
    await recordImpression(cache, 'user1', 'cmp1');

    const result = await checkFrequencyCap(cache, 'user2', 'cmp1', cap);
    expect(result).toBe(true);
  });

  it('does not cross-pollinate between campaigns', async () => {
    await recordImpression(cache, 'user1', 'cmp1');
    await recordImpression(cache, 'user1', 'cmp1');
    await recordImpression(cache, 'user1', 'cmp1');

    const result = await checkFrequencyCap(cache, 'user1', 'cmp2', cap);
    expect(result).toBe(true);
  });
});
