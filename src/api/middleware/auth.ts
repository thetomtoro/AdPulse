import crypto from 'node:crypto';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { AuthenticationError } from '../../shared/errors.js';

export async function authMiddleware(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const { config, repos } = request.server.ctx;

  // Dev bypass: allow X-Dev-Advertiser-Id in development
  if (config.NODE_ENV === 'development') {
    const devId = request.headers['x-dev-advertiser-id'] as string | undefined;
    if (devId) {
      request.advertiserId = devId;
      return;
    }
  }

  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthenticationError('Missing Authorization header');
  }

  const apiKey = authHeader.slice(7);
  if (!apiKey) {
    throw new AuthenticationError('Empty API key');
  }

  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

  // Look up API key in campaign repo's advertiser lookup
  // For now, we store a simple mapping in the campaign repository context
  const advertiser = await repos.campaigns.findAdvertiserByKeyHash(keyHash);
  if (!advertiser) {
    throw new AuthenticationError('Invalid API key');
  }

  request.advertiserId = advertiser.id;
}
