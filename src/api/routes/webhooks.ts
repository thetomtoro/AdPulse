import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { WebhookService } from '../../services/webhooks/webhookService.js';
import { authMiddleware } from '../middleware/auth.js';

const CreateWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
});

export const webhookRoutes: FastifyPluginAsync = async (app) => {
  const service = new WebhookService();

  app.addHook('onRequest', authMiddleware);

  // POST /v1/webhooks
  app.post('/', async (request, reply) => {
    const input = CreateWebhookSchema.parse(request.body);
    const webhook = await service.create(
      request.advertiserId!,
      input.url,
      input.events,
    );
    reply.status(201).send(webhook);
  });

  // GET /v1/webhooks
  app.get('/', async (request, reply) => {
    const webhooks = await service.list(request.advertiserId!);
    reply.send({ webhooks });
  });

  // DELETE /v1/webhooks/:id
  app.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    await service.delete(request.params.id);
    reply.status(204).send();
  });
};
