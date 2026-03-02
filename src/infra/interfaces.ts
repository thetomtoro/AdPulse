// ============================================================
// Core infrastructure interfaces
// All services program to these interfaces, not to concrete
// Redis/Kafka/PostgreSQL clients. This enables:
//   1. In-memory mode for zero-dependency development
//   2. Easy testing with deterministic mocks
//   3. Swappable backends via environment config
// ============================================================

export interface ICacheProvider {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  incr(key: string): Promise<number>;
  incrby(key: string, amount: number): Promise<number>;
  getNumber(key: string): Promise<number>;

  // Sorted set operations (used for frequency capping)
  zadd(key: string, score: number, member: string): Promise<void>;
  zremrangebyscore(key: string, min: number, max: number): Promise<number>;
  zcard(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<void>;

  // Existence check (used for deduplication)
  exists(key: string): Promise<boolean>;

  close(): Promise<void>;
}

export interface IMessageQueue {
  publish(topic: string, key: string, value: unknown): Promise<void>;
  subscribe(
    topic: string,
    groupId: string,
    handler: (message: QueueMessage) => Promise<void>,
  ): Promise<void>;
  close(): Promise<void>;
}

export interface QueueMessage {
  topic: string;
  key: string;
  value: unknown;
  timestamp: number;
}

export interface InfraProviders {
  cache: ICacheProvider;
  queue: IMessageQueue;
}
