import type { IMessageQueue, QueueMessage } from '../infra/interfaces.js';
import { WebhookService } from '../services/webhooks/webhookService.js';
import { WebhookDispatcher } from '../services/webhooks/webhookDispatcher.js';
import { logger } from '../shared/logger.js';

export class WebhookConsumer {
  private dispatcher = new WebhookDispatcher();

  constructor(
    private queue: IMessageQueue,
    private webhookService: WebhookService,
  ) {}

  async start(): Promise<void> {
    await this.queue.subscribe('ad.budget-updates', 'webhook-consumer', async (msg) => {
      await this.handleBudgetUpdate(msg);
    });

    logger.info('Webhook consumer started');
  }

  private async handleBudgetUpdate(msg: QueueMessage): Promise<void> {
    const data = msg.value as Record<string, unknown>;
    const eventType = (data.exhausted as boolean)
      ? 'campaign.budget_exhausted'
      : 'campaign.budget_updated';

    const subscribers = await this.webhookService.getSubscribersForEvent(eventType);

    for (const webhook of subscribers) {
      // Fire and forget — don't block the consumer
      this.dispatcher.dispatch(webhook, eventType, data).catch(err => {
        logger.error({ err, webhookId: webhook.id }, 'Failed to dispatch webhook');
      });
    }
  }
}
