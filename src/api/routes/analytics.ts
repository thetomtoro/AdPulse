import type { FastifyPluginAsync } from 'fastify';
import { PerformanceQuerySchema, AttributionQuerySchema } from '../schemas/analytics.schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { NotFoundError } from '../../shared/errors.js';

export const analyticsRoutes: FastifyPluginAsync = async (app) => {
  const { analyticsService } = app.ctx as any;

  app.addHook('onRequest', authMiddleware);

  // GET /v1/analytics/campaigns/:id/performance
  app.get<{ Params: { id: string }; Querystring: Record<string, string> }>(
    '/campaigns/:id/performance',
    async (request, reply) => {
      const campaign = await app.ctx.repos.campaigns.findById(request.params.id);
      if (!campaign) throw new NotFoundError('Campaign', request.params.id);

      const query = PerformanceQuerySchema.parse(request.query);
      const metrics = query.metrics?.split(',') ?? [];

      if (!analyticsService) {
        reply.send({
          campaignId: request.params.id,
          period: { start: query.startDate, end: query.endDate },
          summary: { impressions: 0, clicks: 0, conversions: 0, spend: 0, ctr: 0, cpm: 0, cpa: 0, uniqueUsers: 0 },
          timeseries: [],
          byCreative: [],
        });
        return;
      }

      const result = await analyticsService.getCampaignPerformance(
        request.params.id,
        query.startDate,
        query.endDate,
        query.granularity,
        metrics,
      );

      reply.send(result);
    },
  );

  // GET /v1/analytics/campaigns/:id/attribution
  app.get<{ Params: { id: string }; Querystring: Record<string, string> }>(
    '/campaigns/:id/attribution',
    async (request, reply) => {
      const campaign = await app.ctx.repos.campaigns.findById(request.params.id);
      if (!campaign) throw new NotFoundError('Campaign', request.params.id);

      const query = AttributionQuerySchema.parse(request.query);

      reply.send({
        campaignId: request.params.id,
        model: query.model,
        lookbackDays: query.lookbackDays,
        totalConversions: 0,
        totalValue: 0,
        attributedConversions: 0,
        paths: [],
      });
    },
  );
};
