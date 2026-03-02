import type { AdEvent } from '../../shared/types.js';
import type { IMessageQueue } from '../../infra/interfaces.js';

const TOPICS = {
  IMPRESSION: 'ad.impressions',
  VIEWABLE: 'ad.impressions',
  CLICK: 'ad.clicks',
  CONVERSION: 'ad.conversions',
} as const;

export class EventProducer {
  constructor(private queue: IMessageQueue) {}

  async publishEvent(event: AdEvent): Promise<void> {
    const topic = TOPICS[event.type] ?? 'ad.impressions';
    await this.queue.publish(topic, event.campaignId, event);
  }

  async publishBudgetUpdate(campaignId: string, data: Record<string, unknown>): Promise<void> {
    await this.queue.publish('ad.budget-updates', campaignId, data);
  }
}
