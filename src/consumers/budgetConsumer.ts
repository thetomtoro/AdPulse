import type { ICacheProvider, IMessageQueue, QueueMessage } from '../infra/interfaces.js';
import type { AdEvent } from '../shared/types.js';
import { logger } from '../shared/logger.js';

export class BudgetConsumer {
  constructor(
    private cache: ICacheProvider,
    private queue: IMessageQueue,
  ) {}

  async start(): Promise<void> {
    await this.queue.subscribe('ad.impressions', 'budget-consumer', async (msg) => {
      await this.handleImpression(msg);
    });
    logger.info('Budget consumer started');
  }

  private async handleImpression(msg: QueueMessage): Promise<void> {
    const event = msg.value as AdEvent;
    if (!event.campaignId) return;

    const bidPrice = parseInt(event.metadata?.bidPriceCpm ?? '0', 10);

    // Atomically increment daily and total spend
    await this.cache.incrby(`budget:${event.campaignId}:daily:spend`, bidPrice);
    await this.cache.incrby(`budget:${event.campaignId}:total:spend`, bidPrice);
    await this.cache.incr(`budget:${event.campaignId}:daily:imps`);

    logger.debug(
      { campaignId: event.campaignId, bidPrice },
      'Budget updated for impression',
    );
  }
}
