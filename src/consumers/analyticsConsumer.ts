import type { IMessageQueue, QueueMessage } from '../infra/interfaces.js';
import type { IAnalyticsRepository } from '../services/analytics/analytics.repository.js';
import type { AdEvent } from '../shared/types.js';
import { logger } from '../shared/logger.js';

export class AnalyticsConsumer {
  constructor(
    private queue: IMessageQueue,
    private analyticsRepo: IAnalyticsRepository,
  ) {}

  async start(): Promise<void> {
    const topics = ['ad.impressions', 'ad.clicks', 'ad.conversions'];

    for (const topic of topics) {
      await this.queue.subscribe(topic, 'analytics-consumer', async (msg) => {
        await this.handleEvent(msg);
      });
    }

    logger.info('Analytics consumer started');
  }

  private async handleEvent(msg: QueueMessage): Promise<void> {
    const event = msg.value as AdEvent;
    await this.analyticsRepo.insertEvent(event);
  }
}
