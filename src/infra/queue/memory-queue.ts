import { EventEmitter } from 'node:events';
import type { IMessageQueue, QueueMessage } from '../interfaces.js';

export class MemoryQueueProvider implements IMessageQueue {
  private emitter = new EventEmitter();
  private buffers = new Map<string, QueueMessage[]>();

  constructor() {
    this.emitter.setMaxListeners(100);
  }

  async publish(topic: string, key: string, value: unknown): Promise<void> {
    const message: QueueMessage = {
      topic,
      key,
      value,
      timestamp: Date.now(),
    };

    // Buffer for replay
    let buffer = this.buffers.get(topic);
    if (!buffer) {
      buffer = [];
      this.buffers.set(topic, buffer);
    }
    buffer.push(message);

    // Emit to subscribers asynchronously to mimic Kafka behavior
    setImmediate(() => {
      this.emitter.emit(topic, message);
    });
  }

  async subscribe(
    topic: string,
    _groupId: string,
    handler: (message: QueueMessage) => Promise<void>,
  ): Promise<void> {
    this.emitter.on(topic, (message: QueueMessage) => {
      handler(message).catch(err => {
        console.error(`[MemoryQueue] Error processing message on ${topic}:`, err);
      });
    });
  }

  async close(): Promise<void> {
    this.emitter.removeAllListeners();
    this.buffers.clear();
  }
}
