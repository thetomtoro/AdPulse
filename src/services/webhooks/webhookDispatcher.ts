import crypto from 'node:crypto';
import type { Webhook } from '../../shared/types.js';
import { logger } from '../../shared/logger.js';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 5000, 15000]; // ms

export class WebhookDispatcher {
  /**
   * Dispatch a webhook payload to a subscriber.
   * Signs the payload with HMAC-SHA256 and retries on failure.
   */
  async dispatch(
    webhook: Webhook,
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<boolean> {
    const body = JSON.stringify({ event: eventType, data: payload, timestamp: new Date().toISOString() });
    const signature = crypto
      .createHmac('sha256', webhook.secret)
      .update(body)
      .digest('hex');

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-AdPulse-Signature': signature,
            'X-AdPulse-Event': eventType,
          },
          body,
          signal: AbortSignal.timeout(10000),
        });

        if (response.ok) {
          logger.debug(
            { webhookId: webhook.id, eventType, attempt },
            'Webhook delivered',
          );
          return true;
        }

        logger.warn(
          { webhookId: webhook.id, status: response.status, attempt },
          'Webhook delivery failed',
        );
      } catch (err) {
        logger.warn(
          { webhookId: webhook.id, err, attempt },
          'Webhook delivery error',
        );
      }

      // Wait before retry (except on last attempt)
      if (attempt < MAX_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]));
      }
    }

    logger.error(
      { webhookId: webhook.id, eventType },
      'Webhook delivery exhausted all retries',
    );
    return false;
  }
}
