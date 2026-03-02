import { describe, it, expect, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createTestApp, authHeaders } from '../helpers/setup.js';

function sampleAgentInput() {
  return {
    name: 'AI Agent Campaign',
    goal: 'MAXIMIZE_CLICKS',
    budget: { totalDollars: 500, dailyDollars: 50 },
    schedule: {
      startDate: '2026-01-01T00:00:00Z',
      endDate: '2026-04-01T00:00:00Z',
      timezone: 'America/New_York',
    },
    audience: {
      segments: ['seg_fashion'],
      geos: ['US'],
      devices: ['MOBILE', 'DESKTOP'],
      contextualCategories: ['IAB18'],
    },
    creatives: [{
      type: 'NATIVE',
      name: 'Agent Creative',
      headline: 'Shop Now',
      body: 'Best deals of the season',
      clickUrl: 'https://example.com/shop',
    }],
    constraints: {
      maxCpmDollars: 8,
      brandSafetyLevel: 'MODERATE',
    },
  };
}

describe('Agent API', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await createTestApp();
  });

  describe('POST /v1/agent/campaigns', () => {
    it('creates and activates a campaign in one pass', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/agent/campaigns',
        headers: authHeaders(),
        payload: sampleAgentInput(),
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.id).toMatch(/^cmp_/);
      expect(body.status).toBe('ACTIVE');
      expect(body.name).toBe('AI Agent Campaign');
    });

    it('resolves goal to correct bid strategy', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/agent/campaigns',
        headers: authHeaders(),
        payload: sampleAgentInput(),
      });

      const body = res.json();
      expect(body._agent.resolvedObjective).toBe('TRAFFIC');
      expect(body._agent.resolvedBidStrategy).toBe('MAXIMIZE_CLICKS');
    });

    it('auto-resolves compliance for US targeting', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/agent/campaigns',
        headers: authHeaders(),
        payload: sampleAgentInput(),
      });

      const body = res.json();
      expect(body._agent.resolvedCompliance.requireConsent).toBe(true);
      expect(body._agent.resolvedCompliance.consentTypes).toContain('CCPA_USP');
    });

    it('converts dollar amounts to cents', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/agent/campaigns',
        headers: authHeaders(),
        payload: sampleAgentInput(),
      });

      const body = res.json();
      expect(body.budget.totalBudget).toBe(50000);
      expect(body.budget.dailyBudget).toBe(5000);
    });

    it('requires authentication', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/agent/campaigns',
        headers: { 'content-type': 'application/json' },
        payload: sampleAgentInput(),
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /v1/agent/campaigns/:id/signals', () => {
    it('returns performance signals for a campaign', async () => {
      // Create a campaign first
      const createRes = await app.inject({
        method: 'POST',
        url: '/v1/agent/campaigns',
        headers: authHeaders(),
        payload: sampleAgentInput(),
      });
      const campaignId = createRes.json().id;

      const res = await app.inject({
        method: 'GET',
        url: `/v1/agent/campaigns/${campaignId}/signals`,
        headers: authHeaders(),
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.campaignId).toBe(campaignId);
      expect(body.spend).toBeDefined();
      expect(body.performance).toBeDefined();
      expect(body.recommendations).toBeInstanceOf(Array);
      expect(body.timestamp).toBeDefined();
    });

    it('returns 404 for non-existent campaign', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/v1/agent/campaigns/cmp_nonexistent/signals',
        headers: authHeaders(),
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('POST /v1/agent/campaigns/:id/optimize', () => {
    it('adjusts bid multiplier', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/v1/agent/campaigns',
        headers: authHeaders(),
        payload: sampleAgentInput(),
      });
      const campaignId = createRes.json().id;

      const res = await app.inject({
        method: 'POST',
        url: `/v1/agent/campaigns/${campaignId}/optimize`,
        headers: authHeaders(),
        payload: {
          action: 'ADJUST_BID',
          bidMultiplier: 1.5,
          reason: 'Underpacing — increasing bid',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.action).toBe('ADJUST_BID');
      expect(body.applied).toBe(true);
      expect(body.details.bidMultiplier).toBe(1.5);
    });

    it('shifts daily budget', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/v1/agent/campaigns',
        headers: authHeaders(),
        payload: sampleAgentInput(),
      });
      const campaignId = createRes.json().id;

      const res = await app.inject({
        method: 'POST',
        url: `/v1/agent/campaigns/${campaignId}/optimize`,
        headers: authHeaders(),
        payload: {
          action: 'SHIFT_BUDGET',
          newDailyDollars: 75,
          reason: 'Increasing daily spend',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.action).toBe('SHIFT_BUDGET');
      expect(body.applied).toBe(true);
      expect(body.details.newDailyBudget).toBe(7500);
    });

    it('returns 404 for non-existent campaign', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/agent/campaigns/cmp_nonexistent/optimize',
        headers: authHeaders(),
        payload: { action: 'ADJUST_BID', bidMultiplier: 1.5 },
      });

      expect(res.statusCode).toBe(404);
    });
  });
});
