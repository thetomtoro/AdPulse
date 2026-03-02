import type { FastifyPluginAsync } from 'fastify';
import { AgentCreateCampaignSchema, AgentOptimizeSchema } from '../schemas/agent.schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { CampaignService } from '../../services/campaign/campaignService.js';
import { resolveAgentIntent } from '../../services/agent/intentResolver.js';
import { SignalsService } from '../../services/agent/signalsService.js';
import { OptimizationService } from '../../services/agent/optimizationService.js';
import { NotFoundError } from '../../shared/errors.js';
import { MemoryAnalyticsRepository } from '../../services/analytics/analytics.memory-repository.js';

export const agentRoutes: FastifyPluginAsync = async (app) => {
  const campaignService = new CampaignService(
    app.ctx.repos.campaigns,
    app.ctx.repos.creatives,
  );

  // Get or create analytics repo from context
  const analyticsRepo = (app.ctx as any).analyticsRepo ?? new MemoryAnalyticsRepository();

  const signalsService = new SignalsService(
    analyticsRepo,
    app.ctx.repos.creatives,
    app.ctx.providers.cache,
  );

  const optimizationService = new OptimizationService(
    app.ctx.repos.campaigns,
    app.ctx.repos.creatives,
    app.ctx.providers.cache,
  );

  app.addHook('onRequest', authMiddleware);

  // POST /v1/agent/campaigns — Declarative one-pass campaign creation
  app.post('/campaigns', async (request, reply) => {
    const agentInput = AgentCreateCampaignSchema.parse(request.body);

    // Resolve high-level intent into full campaign config
    const campaignInput = resolveAgentIntent(agentInput);

    // Create campaign using existing service
    const campaign = await campaignService.createCampaign(
      request.advertiserId!,
      campaignInput,
    );

    // Auto-activate the campaign
    const activated = await campaignService.activateCampaign(campaign.id);

    reply.status(201).send({
      ...activated,
      _agent: {
        resolvedObjective: campaignInput.objective,
        resolvedBidStrategy: campaignInput.budget.bidStrategy,
        resolvedPacingType: campaignInput.budget.pacingType,
        resolvedCompliance: {
          requireConsent: campaignInput.compliance.requireConsent,
          consentTypes: campaignInput.compliance.consentTypes,
        },
      },
    });
  });

  // GET /v1/agent/campaigns/:id/signals — Real-time performance signals
  app.get<{ Params: { id: string } }>('/campaigns/:id/signals', async (request, reply) => {
    const campaign = await app.ctx.repos.campaigns.findById(request.params.id);
    if (!campaign) throw new NotFoundError('Campaign', request.params.id);

    const signals = await signalsService.getSignals(campaign);
    reply.send(signals);
  });

  // POST /v1/agent/campaigns/:id/optimize — Apply AI-driven optimization
  app.post<{ Params: { id: string } }>('/campaigns/:id/optimize', async (request, reply) => {
    const campaign = await app.ctx.repos.campaigns.findById(request.params.id);
    if (!campaign) throw new NotFoundError('Campaign', request.params.id);

    const input = AgentOptimizeSchema.parse(request.body);
    const result = await optimizationService.applyOptimization(campaign, input);

    reply.send(result);
  });
};
