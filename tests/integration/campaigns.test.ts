import { describe, it, expect, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createTestApp, authHeaders, sampleCampaignInput, TEST_API_KEY } from '../helpers/setup.js';

describe('Campaign API', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await createTestApp();
  });

  describe('POST /v1/campaigns', () => {
    it('creates a campaign with creatives', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/campaigns',
        headers: authHeaders(),
        payload: sampleCampaignInput(),
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.id).toMatch(/^cmp_/);
      expect(body.status).toBe('DRAFT');
      expect(body.name).toBe('Test Campaign');
      expect(body.creatives).toHaveLength(1);
      expect(body.creatives[0].id).toMatch(/^crt_/);
      expect(body.creatives[0].status).toBe('ACTIVE');
    });

    it('rejects missing auth', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/campaigns',
        headers: { 'content-type': 'application/json' },
        payload: sampleCampaignInput(),
      });
      expect(res.statusCode).toBe(401);
    });

    it('rejects invalid body', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/campaigns',
        headers: authHeaders(),
        payload: { name: 'Missing fields' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('validates dailyBudget <= totalBudget', async () => {
      const input = sampleCampaignInput();
      input.budget.dailyBudget = 9000000; // exceeds total
      const res = await app.inject({
        method: 'POST',
        url: '/v1/campaigns',
        headers: authHeaders(),
        payload: input,
      });
      expect(res.statusCode).toBe(400);
      const body = res.json();
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /v1/campaigns/:id', () => {
    it('returns campaign with creatives', async () => {
      const create = await app.inject({
        method: 'POST',
        url: '/v1/campaigns',
        headers: authHeaders(),
        payload: sampleCampaignInput(),
      });
      const { id } = create.json();

      const res = await app.inject({
        method: 'GET',
        url: `/v1/campaigns/${id}`,
        headers: authHeaders(),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().id).toBe(id);
      expect(res.json().creatives).toHaveLength(1);
    });

    it('returns 404 for non-existent campaign', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/v1/campaigns/cmp_nonexistent',
        headers: authHeaders(),
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('Campaign lifecycle', () => {
    it('activates a draft campaign', async () => {
      const create = await app.inject({
        method: 'POST',
        url: '/v1/campaigns',
        headers: authHeaders(),
        payload: sampleCampaignInput(),
      });
      const { id } = create.json();

      const res = await app.inject({
        method: 'POST',
        url: `/v1/campaigns/${id}/activate`,
        headers: { authorization: `Bearer ${TEST_API_KEY}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().status).toBe('ACTIVE');
    });

    it('pauses an active campaign', async () => {
      const create = await app.inject({
        method: 'POST',
        url: '/v1/campaigns',
        headers: authHeaders(),
        payload: sampleCampaignInput(),
      });
      const { id } = create.json();

      await app.inject({
        method: 'POST',
        url: `/v1/campaigns/${id}/activate`,
        headers: { authorization: `Bearer ${TEST_API_KEY}` },
      });

      const res = await app.inject({
        method: 'POST',
        url: `/v1/campaigns/${id}/pause`,
        headers: { authorization: `Bearer ${TEST_API_KEY}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().status).toBe('PAUSED');
    });

    it('archives a campaign', async () => {
      const create = await app.inject({
        method: 'POST',
        url: '/v1/campaigns',
        headers: authHeaders(),
        payload: sampleCampaignInput(),
      });
      const { id } = create.json();

      const res = await app.inject({
        method: 'DELETE',
        url: `/v1/campaigns/${id}`,
        headers: authHeaders(),
      });

      expect(res.statusCode).toBe(204);
    });
  });
});
