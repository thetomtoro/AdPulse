import Fastify from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import fastifyCors from '@fastify/cors';
import type { AppConfig } from '../config/index.js';
import type { InfraProviders } from '../infra/interfaces.js';
import type { ICampaignRepository } from '../services/campaign/campaign.repository.js';
import type { ICreativeRepository } from '../services/campaign/creative.repository.js';
import { ZodError } from 'zod';
import { AppError } from '../shared/errors.js';
import { logger } from '../shared/logger.js';
import { healthRoutes } from './routes/health.js';
import { campaignRoutes } from './routes/campaigns.js';
import { creativeRoutes } from './routes/creatives.js';
import { bidRoutes } from './routes/bid.js';
import { eventRoutes } from './routes/events.js';
import { conversionRoutes } from './routes/conversions.js';
import { analyticsRoutes } from './routes/analytics.js';
import { webhookRoutes } from './routes/webhooks.js';
import { agentRoutes } from './routes/agent.js';

export interface AppContext {
  config: AppConfig;
  providers: InfraProviders;
  repos: {
    campaigns: ICampaignRepository;
    creatives: ICreativeRepository;
  };
}

declare module 'fastify' {
  interface FastifyInstance {
    ctx: AppContext;
  }
  interface FastifyRequest {
    advertiserId?: string;
  }
}

export async function createServer(ctx: AppContext) {
  const app = Fastify({
    logger: false, // We use our own pino instance
    requestTimeout: 30000,
    genReqId: () => crypto.randomUUID(),
  });

  // Decorate with app context
  app.decorate('ctx', ctx);

  // CORS
  await app.register(fastifyCors, { origin: true });

  // Swagger
  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'AdPulse API',
        description: 'Real-Time Ad Bidding & Campaign Management API',
        version: '1.0.0',
      },
      servers: [
        { url: `http://localhost:${ctx.config.PORT}`, description: 'Local' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
          },
        },
      },
    },
  });

  await app.register(fastifySwaggerUi, { routePrefix: '/docs' });

  // Request logging
  app.addHook('onRequest', async (request) => {
    logger.debug({ method: request.method, url: request.url, reqId: request.id }, 'incoming request');
  });

  app.addHook('onResponse', async (request, reply) => {
    logger.debug(
      { method: request.method, url: request.url, statusCode: reply.statusCode, reqId: request.id },
      'request completed',
    );
  });

  // Global error handler
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          ...(error instanceof AppError && 'details' in error
            ? { details: (error as any).details }
            : {}),
        },
      });
      return;
    }

    // Zod validation errors
    if (error instanceof ZodError) {
      reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: error.errors,
        },
      });
      return;
    }

    // Fastify validation/parse errors
    if (error.validation || error.statusCode === 400) {
      reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message || 'Request validation failed',
          details: error.validation,
        },
      });
      return;
    }

    logger.error(error, 'Unhandled error');
    reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  });

  // Routes
  await app.register(healthRoutes, { prefix: '/health' });
  await app.register(campaignRoutes, { prefix: '/v1/campaigns' });
  await app.register(creativeRoutes, { prefix: '/v1/campaigns' });
  await app.register(bidRoutes, { prefix: '/v1/bid' });
  await app.register(eventRoutes, { prefix: '/v1/events' });
  await app.register(conversionRoutes, { prefix: '/v1/conversions' });
  await app.register(analyticsRoutes, { prefix: '/v1/analytics' });
  await app.register(webhookRoutes, { prefix: '/v1/webhooks' });
  await app.register(agentRoutes, { prefix: '/v1/agent' });

  return app;
}
