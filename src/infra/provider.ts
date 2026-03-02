import type { AppConfig } from '../config/index.js';
import type { InfraProviders } from './interfaces.js';
import { MemoryCacheProvider } from './cache/memory-cache.js';
import { MemoryQueueProvider } from './queue/memory-queue.js';
import { logger } from '../shared/logger.js';

export async function createProviders(config: AppConfig): Promise<InfraProviders> {
  // Cache provider
  let cache;
  if (config.USE_MEMORY_CACHE) {
    logger.info('Using in-memory cache provider');
    cache = new MemoryCacheProvider();
  } else {
    const { RedisCacheProvider } = await import('./cache/redis-cache.js');
    logger.info('Connecting to Redis at %s', config.REDIS_URL);
    cache = new RedisCacheProvider(config.REDIS_URL!);
  }

  // Message queue provider
  let queue;
  if (config.USE_MEMORY_QUEUE) {
    logger.info('Using in-memory message queue provider');
    queue = new MemoryQueueProvider();
  } else {
    const { KafkaQueueProvider } = await import('./queue/kafka-queue.js');
    const brokers = config.KAFKA_BROKERS!.split(',');
    logger.info('Connecting to Kafka at %s', brokers.join(', '));
    queue = new KafkaQueueProvider(brokers, config.KAFKA_CLIENT_ID);
  }

  return { cache, queue };
}
