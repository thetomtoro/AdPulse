import type { Webhook } from '../../shared/types.js';
import { webhookId } from '../../shared/ids.js';
import crypto from 'node:crypto';

export class WebhookService {
  private webhooks = new Map<string, Webhook>();

  async create(
    advertiserId: string,
    url: string,
    events: string[],
  ): Promise<Webhook> {
    const id = webhookId();
    const secret = `whsec_${crypto.randomBytes(24).toString('hex')}`;

    const webhook: Webhook = {
      id,
      advertiserId,
      url,
      events,
      secret,
      active: true,
      createdAt: new Date(),
    };

    this.webhooks.set(id, webhook);
    return webhook;
  }

  async list(advertiserId: string): Promise<Webhook[]> {
    return [...this.webhooks.values()]
      .filter(w => w.advertiserId === advertiserId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async delete(id: string): Promise<void> {
    this.webhooks.delete(id);
  }

  async getSubscribersForEvent(eventType: string): Promise<Webhook[]> {
    return [...this.webhooks.values()].filter(
      w => w.active && w.events.includes(eventType),
    );
  }
}
