import type { FastifyPluginAsync } from 'fastify';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (_request, reply) => {
    reply.send({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/ready', async (request, reply) => {
    const checks: Record<string, string> = {};
    let healthy = true;

    // Cache check
    try {
      await request.server.ctx.providers.cache.set('health:check', '1', 5);
      checks.cache = 'ok';
    } catch {
      checks.cache = 'error';
      healthy = false;
    }

    reply.status(healthy ? 200 : 503).send({
      status: healthy ? 'ready' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    });
  });
};
