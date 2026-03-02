import type { FastifyPluginAsync } from 'fastify';
import { CreateCreativeInputSchema } from '../schemas/campaign.schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { NotFoundError } from '../../shared/errors.js';

export const creativeRoutes: FastifyPluginAsync = async (app) => {
  const { creatives: creativeRepo, campaigns: campaignRepo } = app.ctx.repos;

  app.addHook('onRequest', authMiddleware);

  // GET /v1/campaigns/:id/creatives
  app.get<{ Params: { id: string } }>('/:id/creatives', async (request, reply) => {
    const campaign = await campaignRepo.findById(request.params.id);
    if (!campaign) throw new NotFoundError('Campaign', request.params.id);

    const creatives = await creativeRepo.findByCampaignId(request.params.id);
    reply.send({ creatives });
  });

  // POST /v1/campaigns/:id/creatives
  app.post<{ Params: { id: string } }>('/:id/creatives', async (request, reply) => {
    const campaign = await campaignRepo.findById(request.params.id);
    if (!campaign) throw new NotFoundError('Campaign', request.params.id);

    const input = CreateCreativeInputSchema.parse(request.body);
    const creative = await creativeRepo.create(request.params.id, input);
    reply.status(201).send(creative);
  });

  // PATCH /v1/campaigns/:id/creatives/:cid
  app.patch<{ Params: { id: string; cid: string } }>(
    '/:id/creatives/:cid',
    async (request, reply) => {
      const creative = await creativeRepo.findById(request.params.cid);
      if (!creative || creative.campaignId !== request.params.id) {
        throw new NotFoundError('Creative', request.params.cid);
      }

      const updates = request.body as Partial<{
        name: string;
        content: any;
        weight: number;
        status: 'ACTIVE' | 'PAUSED' | 'REJECTED';
        metadata: Record<string, string>;
      }>;

      const updated = await creativeRepo.update(request.params.cid, updates);
      reply.send(updated);
    },
  );

  // DELETE /v1/campaigns/:id/creatives/:cid
  app.delete<{ Params: { id: string; cid: string } }>(
    '/:id/creatives/:cid',
    async (request, reply) => {
      const creative = await creativeRepo.findById(request.params.cid);
      if (!creative || creative.campaignId !== request.params.id) {
        throw new NotFoundError('Creative', request.params.cid);
      }

      await creativeRepo.delete(request.params.cid);
      reply.status(204).send();
    },
  );
};
