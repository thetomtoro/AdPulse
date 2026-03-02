import type { FastifyRequest, FastifyReply } from 'fastify';

export async function requestIdMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const requestId = (request.headers['x-request-id'] as string) || request.id;
  reply.header('x-request-id', requestId);
}
