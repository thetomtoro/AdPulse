import { describe, it, expect, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createTestApp, authHeaders, sampleCampaignInput, TEST_API_KEY } from '../helpers/setup.js';

describe('Events API', () => {
  let app: FastifyInstance;
  let trackingUrls: { impression: string; click: string; viewable: string };

  beforeEach(async () => {
    app = await createTestApp();

    // Create & activate campaign
    const create = await app.inject({
      method: 'POST',
      url: '/v1/campaigns',
      headers: authHeaders(),
      payload: sampleCampaignInput(),
    });
    const campaignId = create.json().id;

    await app.inject({
      method: 'POST',
      url: `/v1/campaigns/${campaignId}/activate`,
      headers: { authorization: `Bearer ${TEST_API_KEY}` },
    });

    // Get bid to obtain tracking URLs
    const bid = await app.inject({
      method: 'POST',
      url: '/v1/bid',
      headers: { 'content-type': 'application/json' },
      payload: {
        id: 'req_test_evt',
        publisherId: 'pub_abc',
        placementId: 'plc_hero',
        placementType: 'NATIVE',
        user: {
          id: 'usr_test',
          segments: ['seg_fashion'],
          geo: { country: 'US' },
          device: 'MOBILE',
          consentSignals: [{ type: 'CCPA_USP', granted: true }],
        },
        context: { categories: ['IAB18'] },
      },
    });

    expect(bid.json().bids).toHaveLength(1);
    trackingUrls = bid.json().bids[0].trackingUrls;
  });

  it('records an impression and returns 1x1 GIF', async () => {
    const url = new URL(trackingUrls.impression);
    const res = await app.inject({
      method: 'GET',
      url: `${url.pathname}?${url.searchParams}`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('image/gif');
  });

  it('deduplicates impressions', async () => {
    const url = new URL(trackingUrls.impression);
    const path = `${url.pathname}?${url.searchParams}`;

    await app.inject({ method: 'GET', url: path });
    const res2 = await app.inject({ method: 'GET', url: path });

    // Should still return 200 (GIF) even if deduplicated
    expect(res2.statusCode).toBe(200);
  });

  it('handles viewability beacon', async () => {
    const url = new URL(trackingUrls.viewable);
    const res = await app.inject({
      method: 'GET',
      url: `${url.pathname}?${url.searchParams}`,
    });

    expect(res.statusCode).toBe(204);
  });

  it('handles click event', async () => {
    const url = new URL(trackingUrls.click);
    const res = await app.inject({
      method: 'GET',
      url: `${url.pathname}?${url.searchParams}`,
    });

    expect(res.statusCode).toBe(204);
  });

  it('rejects invalid tracking token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/events/imp?t=invalid.token',
    });

    expect(res.statusCode).toBe(400);
  });

  it('accepts a server-side conversion', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/conversions',
      headers: authHeaders(),
      payload: {
        conversionId: 'conv_test_001',
        type: 'PURCHASE',
        value: 8999,
        userId: 'usr_test',
        metadata: { orderId: 'ORD-123' },
      },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().status).toBe('accepted');
  });

  it('deduplicates conversions', async () => {
    await app.inject({
      method: 'POST',
      url: '/v1/conversions',
      headers: authHeaders(),
      payload: {
        conversionId: 'conv_test_dup',
        type: 'PURCHASE',
        value: 1000,
        userId: 'usr_test',
      },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/v1/conversions',
      headers: authHeaders(),
      payload: {
        conversionId: 'conv_test_dup',
        type: 'PURCHASE',
        value: 1000,
        userId: 'usr_test',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('duplicate');
  });
});
