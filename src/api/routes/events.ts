import type { FastifyPluginAsync } from 'fastify';
import { verifyTrackingToken } from '../../services/events/trackingTokens.js';
import { EventProducer } from '../../services/events/eventProducer.js';
import { EventDeduplicator } from '../../services/events/deduplicator.js';
import { recordImpression } from '../../services/bidding/frequencyCapper.js';
import { eventId } from '../../shared/ids.js';
import type { AdEvent, EventType } from '../../shared/types.js';

// Smallest valid 1x1 transparent GIF
const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64',
);

export const eventRoutes: FastifyPluginAsync = async (app) => {
  const producer = new EventProducer(app.ctx.providers.queue);
  const dedup = new EventDeduplicator(app.ctx.providers.cache);

  // GET /v1/events/imp — Impression pixel (1x1 transparent GIF)
  app.get<{ Querystring: { t: string } }>('/imp', async (request, reply) => {
    const payload = verifyTrackingToken(
      request.query.t,
      app.ctx.config.TRACKING_SECRET,
    );
    if (!payload) {
      reply.status(400).send({ error: { code: 'INVALID_TOKEN', message: 'Invalid or expired tracking token' } });
      return;
    }

    const evtId = eventId();
    if (await dedup.isDuplicate(`imp:${payload.rid}`)) {
      reply.type('image/gif').send(TRANSPARENT_GIF);
      return;
    }

    const event: AdEvent = {
      id: evtId,
      type: 'IMPRESSION' as EventType,
      campaignId: payload.cid,
      creativeId: payload.crt,
      requestId: payload.rid,
      publisherId: payload.pid,
      userId: payload.uid,
      timestamp: new Date(),
      metadata: {},
    };

    await producer.publishEvent(event);
    await dedup.markProcessed(`imp:${payload.rid}`, 'IMPRESSION');

    // Record for frequency capping
    if (payload.uid) {
      await recordImpression(app.ctx.providers.cache, payload.uid, payload.cid);
    }

    // Update last impression time for recency scoring
    if (payload.uid) {
      await app.ctx.providers.cache.set(
        `last_imp:${payload.uid}:${payload.cid}`,
        String(Date.now()),
        86400 * 7,
      );
    }

    reply.type('image/gif').send(TRANSPARENT_GIF);
  });

  // GET /v1/events/clk — Click redirect
  app.get<{ Querystring: { t: string } }>('/clk', async (request, reply) => {
    const payload = verifyTrackingToken(
      request.query.t,
      app.ctx.config.TRACKING_SECRET,
    );
    if (!payload) {
      reply.status(400).send({ error: { code: 'INVALID_TOKEN', message: 'Invalid or expired tracking token' } });
      return;
    }

    const evtId = eventId();
    if (!(await dedup.isDuplicate(`clk:${payload.rid}`))) {
      const event: AdEvent = {
        id: evtId,
        type: 'CLICK' as EventType,
        campaignId: payload.cid,
        creativeId: payload.crt,
        requestId: payload.rid,
        publisherId: payload.pid,
        userId: payload.uid,
        timestamp: new Date(),
        metadata: {},
      };

      await producer.publishEvent(event);
      await dedup.markProcessed(`clk:${payload.rid}`, 'CLICK');
    }

    // Redirect — in a real implementation, we'd look up the click URL
    // For now, return 204 since we don't store click URLs in the token
    reply.status(204).send();
  });

  // GET /v1/events/view — Viewability beacon
  app.get<{ Querystring: { t: string } }>('/view', async (request, reply) => {
    const payload = verifyTrackingToken(
      request.query.t,
      app.ctx.config.TRACKING_SECRET,
    );
    if (!payload) {
      reply.status(400).send({ error: { code: 'INVALID_TOKEN', message: 'Invalid or expired tracking token' } });
      return;
    }

    if (!(await dedup.isDuplicate(`view:${payload.rid}`))) {
      const event: AdEvent = {
        id: eventId(),
        type: 'VIEWABLE' as EventType,
        campaignId: payload.cid,
        creativeId: payload.crt,
        requestId: payload.rid,
        publisherId: payload.pid,
        userId: payload.uid,
        timestamp: new Date(),
        metadata: {},
      };

      await producer.publishEvent(event);
      await dedup.markProcessed(`view:${payload.rid}`, 'VIEWABLE');
    }

    reply.status(204).send();
  });
};
