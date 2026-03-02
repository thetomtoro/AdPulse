import type { FastifyPluginAsync } from 'fastify';
import { CampaignService } from '../../services/campaign/campaignService.js';
import {
  CreateCampaignSchema,
  UpdateCampaignSchema,
  CampaignQuerySchema,
} from '../schemas/campaign.schema.js';
import { authMiddleware } from '../middleware/auth.js';

export const campaignRoutes: FastifyPluginAsync = async (app) => {
  const service = new CampaignService(app.ctx.repos.campaigns, app.ctx.repos.creatives);

  // All campaign routes require auth
  app.addHook('onRequest', authMiddleware);

  // POST /v1/campaigns — Create campaign with creatives (single-pass)
  app.post('/', async (request, reply) => {
    const input = CreateCampaignSchema.parse(request.body);
    const result = await service.createCampaign(request.advertiserId!, input);
    reply.status(201).send(result);
  });

  // GET /v1/campaigns — List campaigns
  app.get('/', async (request, reply) => {
    const query = CampaignQuerySchema.parse(request.query);
    const result = await service.listCampaigns(request.advertiserId!, query);
    reply.send(result);
  });

  // GET /v1/campaigns/:id — Get campaign details
  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const campaign = await service.getCampaign(request.params.id);
    reply.send(campaign);
  });

  // PATCH /v1/campaigns/:id — Update campaign
  app.patch<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const updates = UpdateCampaignSchema.parse(request.body);
    const campaign = await service.updateCampaign(request.params.id, updates);
    reply.send(campaign);
  });

  // POST /v1/campaigns/:id/activate — Activate draft campaign
  app.post<{ Params: { id: string } }>('/:id/activate', async (request, reply) => {
    const campaign = await service.activateCampaign(request.params.id);
    reply.send(campaign);
  });

  // POST /v1/campaigns/:id/pause — Pause active campaign
  app.post<{ Params: { id: string } }>('/:id/pause', async (request, reply) => {
    const campaign = await service.pauseCampaign(request.params.id);
    reply.send(campaign);
  });

  // DELETE /v1/campaigns/:id — Archive campaign (soft delete)
  app.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    await service.archiveCampaign(request.params.id);
    reply.status(204).send();
  });
};
