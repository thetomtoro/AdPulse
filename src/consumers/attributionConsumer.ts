import type { IMessageQueue, QueueMessage } from '../infra/interfaces.js';
import type { AdEvent, Touchpoint, AttributionModel } from '../shared/types.js';
import { calculateAttribution } from '../services/analytics/attribution.js';
import { logger } from '../shared/logger.js';

/**
 * Attribution consumer listens for conversion events and builds
 * touchpoint chains for multi-touch attribution.
 *
 * In a production system, this would look up prior touchpoints from
 * TimescaleDB. In the in-memory version, we maintain a simple
 * touchpoint store indexed by userId.
 */
export class AttributionConsumer {
  private touchpointStore = new Map<string, Touchpoint[]>();

  constructor(private queue: IMessageQueue) {}

  async start(): Promise<void> {
    // Track touchpoints from impressions and clicks
    await this.queue.subscribe('ad.impressions', 'attribution-consumer', async (msg) => {
      this.recordTouchpoint(msg);
    });
    await this.queue.subscribe('ad.clicks', 'attribution-consumer', async (msg) => {
      this.recordTouchpoint(msg);
    });

    // Process conversions
    await this.queue.subscribe('ad.conversions', 'attribution-consumer', async (msg) => {
      await this.handleConversion(msg);
    });

    logger.info('Attribution consumer started');
  }

  private recordTouchpoint(msg: QueueMessage): void {
    const event = msg.value as AdEvent;
    if (!event.userId) return;

    let touchpoints = this.touchpointStore.get(event.userId);
    if (!touchpoints) {
      touchpoints = [];
      this.touchpointStore.set(event.userId, touchpoints);
    }

    touchpoints.push({
      eventId: event.id,
      eventType: event.type,
      campaignId: event.campaignId,
      creativeId: event.creativeId,
      timestamp: event.timestamp,
    });

    // Keep only last 100 touchpoints per user
    if (touchpoints.length > 100) {
      touchpoints.splice(0, touchpoints.length - 100);
    }
  }

  private async handleConversion(msg: QueueMessage): Promise<void> {
    const event = msg.value as AdEvent;
    if (!event.userId) return;

    const touchpoints = this.touchpointStore.get(event.userId) ?? [];
    if (touchpoints.length === 0) return;

    const conversionValue = parseInt(event.metadata?.conversionValue ?? '0', 10);

    // Calculate attribution across all models
    const models: AttributionModel[] = [
      'LAST_CLICK' as AttributionModel,
      'LINEAR' as AttributionModel,
      'TIME_DECAY' as AttributionModel,
      'POSITION_BASED' as AttributionModel,
    ];

    for (const model of models) {
      const credits = calculateAttribution(touchpoints, model, conversionValue);
      logger.debug(
        { userId: event.userId, model, credits: credits.length },
        'Attribution calculated',
      );
    }
  }
}
