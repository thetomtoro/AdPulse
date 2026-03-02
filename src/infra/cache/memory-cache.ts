import type { ICacheProvider } from '../interfaces.js';

interface CacheEntry {
  value: string;
  expiresAt?: number;
}

interface SortedSetEntry {
  score: number;
  member: string;
}

export class MemoryCacheProvider implements ICacheProvider {
  private store = new Map<string, CacheEntry>();
  private sortedSets = new Map<string, SortedSetEntry[]>();
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor() {
    // Periodic cleanup of expired keys every 10 seconds
    this.cleanupInterval = setInterval(() => this.cleanup(), 10_000);
  }

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
    this.sortedSets.delete(key);
  }

  async incr(key: string): Promise<number> {
    return this.incrby(key, 1);
  }

  async incrby(key: string, amount: number): Promise<number> {
    const entry = this.store.get(key);
    const current = entry ? parseInt(entry.value, 10) || 0 : 0;
    const next = current + amount;
    // Preserve existing TTL
    this.store.set(key, {
      value: String(next),
      expiresAt: entry?.expiresAt,
    });
    return next;
  }

  async getNumber(key: string): Promise<number> {
    const val = await this.get(key);
    return val ? parseInt(val, 10) || 0 : 0;
  }

  async zadd(key: string, score: number, member: string): Promise<void> {
    let set = this.sortedSets.get(key);
    if (!set) {
      set = [];
      this.sortedSets.set(key, set);
    }
    // Remove existing entry with same member
    const idx = set.findIndex(e => e.member === member);
    if (idx >= 0) set.splice(idx, 1);
    set.push({ score, member });
    set.sort((a, b) => a.score - b.score);
  }

  async zremrangebyscore(key: string, min: number, max: number): Promise<number> {
    const set = this.sortedSets.get(key);
    if (!set) return 0;
    const before = set.length;
    const filtered = set.filter(e => e.score < min || e.score > max);
    this.sortedSets.set(key, filtered);
    return before - filtered.length;
  }

  async zcard(key: string): Promise<number> {
    return this.sortedSets.get(key)?.length ?? 0;
  }

  async expire(key: string, seconds: number): Promise<void> {
    const entry = this.store.get(key);
    if (entry) {
      entry.expiresAt = Date.now() + seconds * 1000;
    }
    // For sorted sets, store expiry in the regular store
    if (this.sortedSets.has(key)) {
      this.store.set(key, {
        value: '__sorted_set__',
        expiresAt: Date.now() + seconds * 1000,
      });
    }
  }

  async exists(key: string): Promise<boolean> {
    const val = await this.get(key);
    return val !== null;
  }

  async close(): Promise<void> {
    clearInterval(this.cleanupInterval);
    this.store.clear();
    this.sortedSets.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.store.delete(key);
        this.sortedSets.delete(key);
      }
    }
  }
}
