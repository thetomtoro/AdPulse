/**
 * Seed script — populates the API with demo data for testing and demos.
 *
 * Usage: npm run seed
 * Requires: AdPulse API running on localhost:3000 (or PORT env var)
 */

const BASE_URL = `http://localhost:${process.env.PORT ?? 3000}`;
async function api(method: string, path: string, body?: unknown) {
  const headers: Record<string, string> = { 'X-Dev-Advertiser-Id': 'adv_dev_default' };
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    console.error(`  ✗ ${method} ${path} → ${res.status}`, data);
    return null;
  }
  return data;
}

async function main() {
  console.log('🌱 Seeding AdPulse...\n');

  // Campaign 1: Awareness campaign
  console.log('Creating campaigns...');
  const cmp1 = await api('POST', '/v1/campaigns', {
    name: 'Summer Sale Awareness',
    objective: 'AWARENESS',
    budget: { totalBudget: 5000000, dailyBudget: 500000, bidStrategy: 'MANUAL_CPM', maxBidCpm: 850, pacingType: 'EVEN' },
    schedule: { startDate: '2026-01-01T00:00:00Z', endDate: '2027-01-01T00:00:00Z', timezone: 'America/New_York' },
    targeting: {
      segments: [{ segmentId: 'seg_fashion_enthusiasts', matchType: 'INCLUDE' }],
      geo: [{ type: 'COUNTRY', value: 'US', matchType: 'INCLUDE' }],
      devices: ['DESKTOP', 'MOBILE'],
      dayParting: [{ daysOfWeek: [1, 2, 3, 4, 5], startHour: 9, endHour: 21, timezone: 'America/New_York' }],
      frequencyCap: { maxImpressions: 5, windowHours: 24, scope: 'CAMPAIGN' },
      contextual: [{ categoryId: 'IAB18', matchType: 'INCLUDE' }],
    },
    compliance: { requireConsent: true, consentTypes: ['CCPA_USP'], dataRetentionDays: 90, restrictedCategories: ['IAB25'], brandSafetyLevel: 'MODERATE' },
    creatives: [
      { type: 'NATIVE', name: 'Summer Sale Hero', content: { headline: 'Summer Sale — Up to 50% Off', body: 'Shop the best deals', clickUrl: 'https://shop.example.com/summer' }, weight: 70 },
      { type: 'NATIVE', name: 'Summer Sale Secondary', content: { headline: 'Don\'t Miss Our Summer Event', body: 'Limited time offers', clickUrl: 'https://shop.example.com/summer?v=b' }, weight: 30 },
    ],
  });
  if (cmp1) {
    console.log(`  ✓ Campaign: ${cmp1.name} (${cmp1.id})`);
    await api('POST', `/v1/campaigns/${cmp1.id}/activate`);
    console.log(`  ✓ Activated`);
  }

  // Campaign 2: Traffic campaign
  const cmp2 = await api('POST', '/v1/campaigns', {
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
  });
  if (cmp2) {
    console.log(`  ✓ Campaign: ${cmp2.name} (${cmp2.id})`);
    await api('POST', `/v1/campaigns/${cmp2.id}/activate`);
    console.log(`  ✓ Activated`);
  }

  // Campaign 3: Conversion campaign (draft)
  const cmp3 = await api('POST', '/v1/campaigns', {
    name: 'New Customer Acquisition',
    objective: 'CONVERSIONS',
    budget: { totalBudget: 10000000, dailyBudget: 800000, bidStrategy: 'TARGET_CPA', maxBidCpm: 1200, pacingType: 'FRONTLOADED' },
    schedule: { startDate: '2026-06-01T00:00:00Z', endDate: '2026-12-31T00:00:00Z', timezone: 'America/Los_Angeles' },
    targeting: {
      segments: [{ segmentId: 'seg_new_visitors', matchType: 'INCLUDE' }, { segmentId: 'seg_existing_customers', matchType: 'EXCLUDE' }],
      geo: [{ type: 'COUNTRY', value: 'US', matchType: 'INCLUDE' }],
      devices: ['MOBILE'],
      dayParting: [],
      frequencyCap: { maxImpressions: 2, windowHours: 48, scope: 'CAMPAIGN' },
      contextual: [],
    },
    compliance: { requireConsent: true, consentTypes: ['GDPR_TCF', 'CCPA_USP'], dataRetentionDays: 30, restrictedCategories: ['IAB25', 'IAB26'], brandSafetyLevel: 'STRICT' },
    creatives: [
      { type: 'NATIVE', name: 'Signup CTA', content: { headline: 'Join Today — Get 20% Off', body: 'New customer exclusive', clickUrl: 'https://shop.example.com/signup' }, weight: 100 },
    ],
  });
  if (cmp3) {
    console.log(`  ✓ Campaign: ${cmp3.name} (${cmp3.id}) [DRAFT]`);
  }

  console.log('\n✅ Seed complete!');
  console.log(`\nActive campaigns ready for bidding. Try:`);
  console.log(`  curl -X POST http://localhost:${process.env.PORT ?? 3000}/v1/bid \\`);
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(`    -d '{"id":"req_1","publisherId":"pub_abc","placementId":"plc_hero","placementType":"NATIVE","user":{"id":"usr_1","segments":["seg_fashion_enthusiasts"],"geo":{"country":"US"},"device":"MOBILE","consentSignals":[{"type":"CCPA_USP","granted":true}]},"context":{"categories":["IAB18"]}}'`);
}

main().catch(console.error);
