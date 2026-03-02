import { Kafka, type Consumer, type Producer } from 'kafkajs';
import type { IMessageQueue, QueueMessage } from '../interfaces.js';

export class KafkaQueueProvider implements IMessageQueue {
  private kafka: Kafka;
  private producer: Producer;
  private consumers: Consumer[] = [];
  private connected = false;

  constructor(brokers: string[], clientId: string) {
    this.kafka = new Kafka({ clientId, brokers });
    this.producer = this.kafka.producer();
  }

  private async ensureConnected(): Promise<void> {
    if (!this.connected) {
      await this.producer.connect();
      this.connected = true;
    }
  }

  async publish(topic: string, key: string, value: unknown): Promise<void> {
    await this.ensureConnected();
    await this.producer.send({
      topic,
      messages: [
        {
          key,
          value: JSON.stringify(value),
          timestamp: String(Date.now()),
        },
      ],
    });
  }

  async subscribe(
    topic: string,
    groupId: string,
    handler: (message: QueueMessage) => Promise<void>,
  ): Promise<void> {
    const consumer = this.kafka.consumer({ groupId });
    await consumer.connect();
    await consumer.subscribe({ topic, fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ topic: t, message }) => {
        const queueMessage: QueueMessage = {
          topic: t,
          key: message.key?.toString() ?? '',
          value: message.value ? JSON.parse(message.value.toString()) : null,
          timestamp: parseInt(message.timestamp ?? '0', 10),
        };
        await handler(queueMessage);
      },
    });

    this.consumers.push(consumer);
  }

  async close(): Promise<void> {
    for (const consumer of this.consumers) {
      await consumer.disconnect();
    }
    if (this.connected) {
      await this.producer.disconnect();
    }
  }
}
