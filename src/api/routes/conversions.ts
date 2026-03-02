import type { FastifyPluginAsync } from 'fastify';
import { ConversionInputSchema } from '../schemas/event.schema.js';
import { EventProducer } from '../../services/events/eventProducer.js';
import { EventDeduplicator } from '../../services/events/deduplicator.js';
import { eventId } from '../../shared/ids.js';
import type { AdEvent, EventType } from '../../shared/types.js';
import { authMiddleware } from '../middleware/auth.js';

export const conversionRoutes: FastifyPluginAsync = async (app) => {
  const producer = new EventProducer(app.ctx.providers.queue);
  const dedup = new EventDeduplicator(app.ctx.providers.cache);

  app.addHook('onRequest', authMiddleware);

  // POST /v1/conversions — Record server-side conversion
  app.post('/', async (request, reply) => {
    const input = ConversionInputSchema.parse(request.body);

    if (await dedup.isDuplicate(`conv:${input.conversionId}`)) {
      reply.status(200).send({ status: 'duplicate', conversionId: input.conversionId });
      return;
    }

    const event: AdEvent = {
      id: eventId(),
      type: 'CONVERSION' as EventType,
      campaignId: '', // Will be resolved by attribution consumer
      creativeId: '',
      requestId: '',
      publisherId: '',
      userId: input.userId,
      timestamp: input.timestamp ? new Date(input.timestamp) : new Date(),
      metadata: {
        conversionId: input.conversionId,
        conversionType: input.type,
        ...(input.value !== undefined ? { conversionValue: String(input.value) } : {}),
        ...input.metadata,
      },
    };

    await producer.publishEvent(event);
    await dedup.markProcessed(`conv:${input.conversionId}`, 'CONVERSION');

    reply.status(201).send({
      status: 'accepted',
      conversionId: input.conversionId,
    });
  });
};
