import { createServer, type AppContext } from '../../src/api/server.js';
import { MemoryCampaignRepository } from '../../src/services/campaign/campaign.memory-repository.js';
import { MemoryCreativeRepository } from '../../src/services/campaign/creative.memory-repository.js';
import { MemoryCacheProvider } from '../../src/infra/cache/memory-cache.js';
import { MemoryQueueProvider } from '../../src/infra/queue/memory-queue.js';
import type { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';

export const TEST_API_KEY = 'adpulse_test_key_12345678';
export const TEST_ADVERTISER_ID = 'adv_test_default';

export async function createTestApp(): Promise<FastifyInstance> {
  const cache = new MemoryCacheProvider();
  const queue = new MemoryQueueProvider();
  const campaignRepo = new MemoryCampaignRepository();
  const creativeRepo = new MemoryCreativeRepository();

  // Seed test advertiser
  const keyHash = crypto.createHash('sha256').update(TEST_API_KEY).digest('hex');
  await campaignRepo.createAdvertiser({
    id: TEST_ADVERTISER_ID,
    name: 'Test Advertiser',
    apiKeyHash: keyHash,
    rateLimitRps: 1000,
    complianceDefaults: {},
  });
  await campaignRepo.createApiKey(TEST_ADVERTISER_ID, keyHash, TEST_API_KEY.slice(0, 8));

  const ctx: AppContext = {
    config: {
      NODE_ENV: 'test',
      PORT: 0,
      HOST: '127.0.0.1',
      USE_MEMORY_DB: true,
      USE_MEMORY_CACHE: true,
      USE_MEMORY_QUEUE: true,
      TRACKING_SECRET: 'test-tracking-secret-at-least-16',
      WEBHOOK_SECRET: 'test-webhook-secret-at-least-16',
      KAFKA_CLIENT_ID: 'adpulse-test',
      RATE_LIMIT_MAX: 1000,
      RATE_LIMIT_WINDOW_MS: 60000,
      LOG_LEVEL: 'silent',
    },
    providers: { cache, queue },
    repos: { campaigns: campaignRepo, creatives: creativeRepo },
  };

  return createServer(ctx);
}

export function authHeaders() {
  return {
    authorization: `Bearer ${TEST_API_KEY}`,
    'content-type': 'application/json',
  };
}

export function devHeaders() {
  return {
    'x-dev-advertiser-id': TEST_ADVERTISER_ID,
    'content-type': 'application/json',
  };
}

export function sampleCampaignInput() {
  return {
    name: 'Test Campaign',
    objective: 'AWARENESS',
    budget: {
      totalBudget: 5000000,
      dailyBudget: 500000,
      bidStrategy: 'MANUAL_CPM',
      maxBidCpm: 850,
      pacingType: 'EVEN',
    },
    schedule: {
      startDate: '2026-01-01T00:00:00Z',
      endDate: '2027-01-01T00:00:00Z',
      timezone: 'America/New_York',
    },
    targeting: {
      segments: [{ segmentId: 'seg_fashion', matchType: 'INCLUDE' }],
      geo: [{ type: 'COUNTRY', value: 'US', matchType: 'INCLUDE' }],
      devices: ['DESKTOP', 'MOBILE'],
      dayParting: [],
      frequencyCap: { maxImpressions: 5, windowHours: 24, scope: 'CAMPAIGN' },
      contextual: [{ categoryId: 'IAB18', matchType: 'INCLUDE' }],
    },
    compliance: {
      requireConsent: true,
      consentTypes: ['CCPA_USP'],
      dataRetentionDays: 90,
      restrictedCategories: [],
      brandSafetyLevel: 'MODERATE',
    },
    creatives: [
      {
        type: 'NATIVE',
        name: 'Test Creative',
        content: {
          headline: 'Test Headline',
          body: 'Test Body',
          clickUrl: 'https://example.com/click',
        },
        weight: 100,
      },
    ],
  };
}
