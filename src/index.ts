import { loadConfig } from './config/index.js';
import { createProviders } from './infra/provider.js';
import { createServer } from './api/server.js';
import { MemoryCampaignRepository } from './services/campaign/campaign.memory-repository.js';
import { MemoryCreativeRepository } from './services/campaign/creative.memory-repository.js';
import { logger } from './shared/logger.js';

async function main() {
  const config = loadConfig();

  logger.info(
    {
      env: config.NODE_ENV,
      memoryDb: config.USE_MEMORY_DB,
      memoryCache: config.USE_MEMORY_CACHE,
      memoryQueue: config.USE_MEMORY_QUEUE,
    },
    'Starting AdPulse API',
  );

  // Create infrastructure providers
  const providers = await createProviders(config);

  // Create repositories
  const campaignRepo = new MemoryCampaignRepository();
  const creativeRepo = new MemoryCreativeRepository();

  // Seed a dev advertiser in development mode
  if (config.NODE_ENV === 'development') {
    const crypto = await import('node:crypto');
    const devApiKey = 'adpulse_dev_key_12345678';
    const devKeyHash = crypto.createHash('sha256').update(devApiKey).digest('hex');

    await campaignRepo.createAdvertiser({
      id: 'adv_dev_default',
      name: 'Development Advertiser',
      apiKeyHash: devKeyHash,
      rateLimitRps: 1000,
      complianceDefaults: {},
    });
    await campaignRepo.createApiKey('adv_dev_default', devKeyHash, devApiKey.slice(0, 8));

    logger.info('Seeded dev advertiser (API key: %s)', devApiKey);
  }

  // Auto-seed demo data so the deployed demo isn't empty
  const autoSeed = async () => {
    const existing = await campaignRepo.findAll('adv_dev_default', { limit: 1, offset: 0 });
    if (existing.campaigns.length > 0) return; // already seeded

    const { CampaignService } = await import('./services/campaign/campaignService.js');
    const svc = new CampaignService(campaignRepo, creativeRepo);

    const campaigns = [
      {
        name: 'Summer Sale Awareness',
        objective: 'AWARENESS' as const,
        budget: { totalBudget: 5000000, dailyBudget: 500000, bidStrategy: 'MANUAL_CPM' as const, maxBidCpm: 850, pacingType: 'EVEN' as const },
        schedule: { startDate: '2026-01-01T00:00:00Z', endDate: '2027-01-01T00:00:00Z', timezone: 'America/New_York' },
        targeting: {
          segments: [{ segmentId: 'seg_fashion_enthusiasts', matchType: 'INCLUDE' as const }],
          geo: [{ type: 'COUNTRY' as const, value: 'US', matchType: 'INCLUDE' as const }],
          devices: ['DESKTOP' as const, 'MOBILE' as const],
          dayParting: [] as any[],
          frequencyCap: { maxImpressions: 5, windowHours: 24, scope: 'CAMPAIGN' as const },
          contextual: [{ categoryId: 'IAB18', matchType: 'INCLUDE' as const }],
        },
        compliance: { requireConsent: true, consentTypes: ['CCPA_USP' as const], dataRetentionDays: 90, restrictedCategories: [] as string[], brandSafetyLevel: 'MODERATE' as const },
        creatives: [
          { type: 'NATIVE' as const, name: 'Summer Sale Hero', content: { headline: 'Summer Sale — Up to 50% Off', body: 'Shop the best deals', clickUrl: 'https://shop.example.com/summer' }, weight: 70, metadata: {} },
          { type: 'NATIVE' as const, name: 'Summer Sale Secondary', content: { headline: "Don't Miss Our Summer Event", body: 'Limited time offers', clickUrl: 'https://shop.example.com/summer?v=b' }, weight: 30, metadata: {} },
        ],
      },
      {
        name: 'Holiday Gift Guide Traffic',
        objective: 'TRAFFIC' as const,
        budget: { totalBudget: 3000000, dailyBudget: 300000, bidStrategy: 'MAXIMIZE_CLICKS' as const, maxBidCpm: 600, pacingType: 'ACCELERATED' as const },
        schedule: { startDate: '2026-01-01T00:00:00Z', endDate: '2027-01-01T00:00:00Z', timezone: 'UTC' },
        targeting: {
          segments: [{ segmentId: 'seg_gift_shoppers', matchType: 'INCLUDE' as const }],
          geo: [{ type: 'COUNTRY' as const, value: 'US', matchType: 'INCLUDE' as const }, { type: 'COUNTRY' as const, value: 'CA', matchType: 'INCLUDE' as const }],
          devices: ['DESKTOP' as const, 'MOBILE' as const, 'TABLET' as const],
          dayParting: [] as any[],
          frequencyCap: { maxImpressions: 3, windowHours: 12, scope: 'CAMPAIGN' as const },
          contextual: [{ categoryId: 'IAB1', matchType: 'INCLUDE' as const }],
        },
        compliance: { requireConsent: false, consentTypes: [] as ('GDPR_TCF' | 'CCPA_USP' | 'CUSTOM')[], dataRetentionDays: 60, restrictedCategories: [] as string[], brandSafetyLevel: 'PERMISSIVE' as const },
        creatives: [
          { type: 'BANNER' as const, name: 'Gift Guide Banner', content: { headline: 'Holiday Gift Guide 2026', clickUrl: 'https://shop.example.com/gifts' }, weight: 100, metadata: {} },
        ],
      },
    ];

    for (const c of campaigns) {
      try {
        const created = await svc.createCampaign('adv_dev_default', c);
        await svc.activateCampaign(created.id);
        logger.info('Auto-seeded campaign: %s', c.name);
      } catch (e) {
        logger.warn(e, 'Failed to auto-seed campaign: %s', c.name);
      }
    }
  };

  // Create and start server
  const app = await createServer({
    config,
    providers,
    repos: {
      campaigns: campaignRepo,
      creatives: creativeRepo,
    },
  });

  try {
    await app.listen({ port: config.PORT, host: config.HOST });
    logger.info('AdPulse API listening on http://%s:%d', config.HOST, config.PORT);
    logger.info('Swagger docs at http://localhost:%d/docs', config.PORT);

    // Auto-seed after server is ready
    await autoSeed();
  } catch (err) {
    logger.fatal(err, 'Failed to start server');
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info('Received %s, shutting down gracefully...', signal);
    await app.close();
    await providers.cache.close();
    await providers.queue.close();
    logger.info('Shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch(err => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
