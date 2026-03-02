import type { FastifyPluginAsync } from 'fastify';
import { AdRequestSchema } from '../schemas/bid.schema.js';
import { BiddingEngine } from '../../services/bidding/biddingEngine.js';

export const bidRoutes: FastifyPluginAsync = async (app) => {
  const engine = new BiddingEngine(
    app.ctx.repos.campaigns,
    app.ctx.repos.creatives,
    app.ctx.providers.cache,
    app.ctx.providers.queue,
    app.ctx.config.TRACKING_SECRET,
    `http://localhost:${app.ctx.config.PORT}`,
  );

  // POST /v1/bid — Request bid
  app.post<{ Querystring: { debug?: string } }>('/', async (request, reply) => {
    const adRequest = AdRequestSchema.parse(request.body);
    const debug = request.query.debug === 'true';

    const response = await engine.evaluateBid(
      {
        ...adRequest,
        placementType: adRequest.placementType as any,
        timestamp: adRequest.timestamp ? new Date(adRequest.timestamp) : new Date(),
        user: {
          ...adRequest.user,
          device: adRequest.user.device as any,
          consentSignals: adRequest.user.consentSignals.map(s => ({
            ...s,
            type: s.type as any,
          })),
        },
      },
      debug,
    );

    reply.send(response);
  });
};
