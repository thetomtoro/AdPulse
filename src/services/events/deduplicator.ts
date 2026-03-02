import type { ICacheProvider } from '../../infra/interfaces.js';

const TTL_BY_TYPE: Record<string, number> = {
  IMPRESSION: 86400,    // 24 hours
  VIEWABLE: 86400,
  CLICK: 3600,          // 1 hour
  CONVERSION: 604800,   // 7 days
};

export class EventDeduplicator {
  constructor(private cache: ICacheProvider) {}

  async isDuplicate(eventId: string): Promise<boolean> {
    return this.cache.exists(`dedup:${eventId}`);
  }

  async markProcessed(eventId: string, eventType: string): Promise<void> {
    const ttl = TTL_BY_TYPE[eventType] ?? 86400;
    await this.cache.set(`dedup:${eventId}`, '1', ttl);
  }
}
