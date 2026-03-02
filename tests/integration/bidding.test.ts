import { describe, it, expect, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createTestApp, authHeaders, sampleCampaignInput, TEST_API_KEY } from '../helpers/setup.js';

describe('Bidding API', () => {
  let app: FastifyInstance;
  let campaignId: string;

  beforeEach(async () => {
    app = await createTestApp();

    // Create and activate a campaign
    const create = await app.inject({
      method: 'POST',
      url: '/v1/campaigns',
      headers: authHeaders(),
      payload: sampleCampaignInput(),
    });
    campaignId = create.json().id;

    await app.inject({
      method: 'POST',
      url: `/v1/campaigns/${campaignId}/activate`,
      headers: { authorization: `Bearer ${TEST_API_KEY}` },
    });
  });

  function sampleBidRequest() {
    return {
      id: 'req_test_001',
      publisherId: 'pub_retailer_abc',
      placementId: 'plc_homepage_hero',
      placementType: 'NATIVE',
      user: {
        id: 'usr_sha256_abc123',
        segments: ['seg_fashion'],
        geo: { country: 'US', region: 'NY', city: 'New York' },
        device: 'MOBILE',
        consentSignals: [{ type: 'CCPA_USP', granted: true }],
      },
      context: {
        pageUrl: 'https://retailer.com/home',
        categories: ['IAB18'],
        keywords: ['fashion', 'summer'],
      },
    };
  }

  it('returns a bid response for a matching request', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/bid',
      headers: { 'content-type': 'application/json' },
      payload: sampleBidRequest(),
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.requestId).toBe('req_test_001');
    expect(body.bids).toHaveLength(1);
    expect(body.bids[0].campaignId).toBe(campaignId);
    expect(body.bids[0].bidPriceCpm).toBeGreaterThan(0);
    expect(body.bids[0].creative.clickUrl).toBe('https://example.com/click');
    expect(body.bids[0].trackingUrls.impression).toContain('/v1/events/imp');
    expect(body.processingTimeMs).toBeDefined();
  });

  it('returns debug info when debug=true', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/bid?debug=true',
      headers: { 'content-type': 'application/json' },
      payload: sampleBidRequest(),
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.debugInfo).toBeDefined();
    expect(body.debugInfo.candidateCampaigns).toBeGreaterThanOrEqual(1);
    expect(body.debugInfo.scoringDetails).toHaveLength(1);
    expect(body.debugInfo.scoringDetails[0].finalScore).toBeGreaterThan(0);
  });

  it('returns empty bids for non-matching geo', async () => {
    const req = sampleBidRequest();
    req.user.geo = { country: 'JP' }; // Japan, not targeted

    const res = await app.inject({
      method: 'POST',
      url: '/v1/bid',
      headers: { 'content-type': 'application/json' },
      payload: req,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().bids).toHaveLength(0);
  });

  it('returns empty bids for non-matching device', async () => {
    const req = sampleBidRequest();
    req.user.device = 'CTV'; // Not targeted

    const res = await app.inject({
      method: 'POST',
      url: '/v1/bid',
      headers: { 'content-type': 'application/json' },
      payload: req,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().bids).toHaveLength(0);
  });

  it('processes bids in sub-50ms', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/bid',
      headers: { 'content-type': 'application/json' },
      payload: sampleBidRequest(),
    });

    expect(res.json().processingTimeMs).toBeLessThan(50);
  });
});
