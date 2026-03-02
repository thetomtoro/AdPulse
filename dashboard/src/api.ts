const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const headers: Record<string, string> = {
  'X-Dev-Advertiser-Id': 'adv_dev_default',
  'Content-Type': 'application/json',
};

const headersNoBody: Record<string, string> = {
  'X-Dev-Advertiser-Id': 'adv_dev_default',
};

export async function api<T = any>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? headers : headersNoBody,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null as T;
  return res.json();
}

// Campaigns
export const getCampaigns = () => api<{ campaigns: any[]; total: number }>('GET', '/v1/campaigns?limit=50');
export const getCampaign = (id: string) => api('GET', `/v1/campaigns/${id}`);

// Bidding
export const sendBid = (request: any, debug = false) =>
  api('POST', `/v1/bid${debug ? '?debug=true' : ''}`, request);

// Analytics
export const getPerformance = (id: string) =>
  api('GET', `/v1/analytics/campaigns/${id}/performance?startDate=2026-01-01&endDate=2027-01-01&granularity=DAILY`);

// Agent
export const agentCreateCampaign = (input: any) => api('POST', '/v1/agent/campaigns', input);
export const agentGetSignals = (id: string) => api('GET', `/v1/agent/campaigns/${id}/signals`);
export const agentOptimize = (id: string, input: any) => api('POST', `/v1/agent/campaigns/${id}/optimize`, input);

// Seed (uses the same endpoints as seed script)
export async function seedData() {
  const campaigns = [
    {
      name: 'Summer Sale Awareness',
      objective: 'AWARENESS',
      budget: { totalBudget: 5000000, dailyBudget: 500000, bidStrategy: 'MANUAL_CPM', maxBidCpm: 850, pacingType: 'EVEN' },
      schedule: { startDate: '2026-01-01T00:00:00Z', endDate: '2027-01-01T00:00:00Z', timezone: 'America/New_York' },
      targeting: {
        segments: [{ segmentId: 'seg_fashion_enthusiasts', matchType: 'INCLUDE' }],
        geo: [{ type: 'COUNTRY', value: 'US', matchType: 'INCLUDE' }],
        devices: ['DESKTOP', 'MOBILE'],
        dayParting: [],
        frequencyCap: { maxImpressions: 5, windowHours: 24, scope: 'CAMPAIGN' },
        contextual: [{ categoryId: 'IAB18', matchType: 'INCLUDE' }],
      },
      compliance: { requireConsent: true, consentTypes: ['CCPA_USP'], dataRetentionDays: 90, restrictedCategories: [], brandSafetyLevel: 'MODERATE' },
      creatives: [
        { type: 'NATIVE', name: 'Summer Sale Hero', content: { headline: 'Summer Sale — Up to 50% Off', body: 'Shop the best deals', clickUrl: 'https://shop.example.com/summer' }, weight: 70 },
        { type: 'NATIVE', name: 'Summer Sale Secondary', content: { headline: "Don't Miss Our Summer Event", body: 'Limited time offers', clickUrl: 'https://shop.example.com/summer?v=b' }, weight: 30 },
      ],
    },
    {
      name: 'Holiday Gift Guide Traffic',
      objective: 'TRAFFIC',
      budget: { totalBudget: 3000000, dailyBudget: 300000, bidStrategy: 'MAXIMIZE_CLICKS', maxBidCpm: 600, pacingType: 'ACCELERATED' },
      schedule: { startDate: '2026-01-01T00:00:00Z', endDate: '2027-01-01T00:00:00Z', timezone: 'UTC' },
      targeting: {
        segments: [{ segmentId: 'seg_gift_shoppers', matchType: 'INCLUDE' }],
        geo: [{ type: 'COUNTRY', value: 'US', matchType: 'INCLUDE' }, { type: 'COUNTRY', value: 'CA', matchType: 'INCLUDE' }],
        devices: ['DESKTOP', 'MOBILE', 'TABLET'],
        dayParting: [],
        frequencyCap: { maxImpressions: 3, windowHours: 12, scope: 'CAMPAIGN' },
        contextual: [{ categoryId: 'IAB1', matchType: 'INCLUDE' }],
      },
      compliance: { requireConsent: false, consentTypes: [], dataRetentionDays: 60, restrictedCategories: [], brandSafetyLevel: 'PERMISSIVE' },
      creatives: [
        { type: 'BANNER', name: 'Gift Guide Banner', content: { headline: 'Holiday Gift Guide 2026', clickUrl: 'https://shop.example.com/gifts' }, weight: 100 },
      ],
    },
  ];

  const results = [];
  for (const campaign of campaigns) {
    const created = await api('POST', '/v1/campaigns', campaign);
    if (created?.id) {
      await api('POST', `/v1/campaigns/${created.id}/activate`);
      results.push(created);
    }
  }
  return results;
}
