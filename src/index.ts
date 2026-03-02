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
