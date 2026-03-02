/**
 * Traffic simulation script — generates realistic ad traffic to demonstrate
 * the full AdPulse pipeline: bid → impression → click → conversion.
 *
 * Usage: npm run simulate
 * Requires: AdPulse API running and seeded (npm run seed first)
 */

const BASE_URL = `http://localhost:${process.env.PORT ?? 3000}`;
const DURATION_MS = parseInt(process.env.DURATION ?? '10000', 10);
const REQUESTS_PER_SECOND = parseInt(process.env.RPS ?? '10', 10);

const USERS = Array.from({ length: 50 }, (_, i) => `usr_sim_${i}`);
const SEGMENTS = ['seg_fashion_enthusiasts', 'seg_gift_shoppers', 'seg_new_visitors', 'seg_high_value'];
const GEOS = [
  { country: 'US', region: 'NY', city: 'New York' },
  { country: 'US', region: 'CA', city: 'Los Angeles' },
  { country: 'US', region: 'TX', city: 'Austin' },
  { country: 'CA', region: 'ON', city: 'Toronto' },
  { country: 'JP' },
];
const DEVICES = ['DESKTOP', 'MOBILE', 'TABLET', 'CTV'] as const;
const CATEGORIES = ['IAB18', 'IAB1', 'IAB9', 'IAB25'];

let stats = { bids: 0, impressions: 0, clicks: 0, conversions: 0, errors: 0, totalLatency: 0 };

function randomItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function sendBidRequest(): Promise<void> {
  const userId = randomItem(USERS);
  const userSegments = SEGMENTS.filter(() => Math.random() > 0.5);
  const requestId = `req_sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    const res = await fetch(`${BASE_URL}/v1/bid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: requestId,
        publisherId: 'pub_sim',
        placementId: 'plc_sim',
        placementType: 'NATIVE',
        user: {
          id: userId,
          segments: userSegments,
          geo: randomItem(GEOS),
          device: randomItem(DEVICES),
          consentSignals: [{ type: 'CCPA_USP', granted: Math.random() > 0.1 }],
        },
        context: {
          categories: [randomItem(CATEGORIES)],
          keywords: ['simulation'],
        },
      }),
    });

    const data = await res.json() as any;
    stats.bids++;
    stats.totalLatency += data.processingTimeMs ?? 0;

    // Fire impression for each bid
    if (data.bids?.length > 0) {
      for (const bid of data.bids) {
        await fireEvent(bid.trackingUrls.impression);
        stats.impressions++;

        // 15% click rate
        if (Math.random() < 0.15) {
          await fireEvent(bid.trackingUrls.click);
          stats.clicks++;

          // 4% conversion rate (of clicks)
          if (Math.random() < 0.04) {
            await recordConversion(userId);
            stats.conversions++;
          }
        }
      }
    }
  } catch {
    stats.errors++;
  }
}

async function fireEvent(url: string): Promise<void> {
  try {
    const parsed = new URL(url);
    await fetch(url, { method: 'GET' });
  } catch {
    // Ignore errors in simulation
  }
}

async function recordConversion(userId: string): Promise<void> {
  try {
    await fetch(`${BASE_URL}/v1/conversions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Dev-Advertiser-Id': 'adv_dev_default',
      },
      body: JSON.stringify({
        conversionId: `conv_sim_${Date.now()}`,
        type: 'PURCHASE',
        value: Math.floor(Math.random() * 20000) + 1000,
        userId,
      }),
    });
  } catch {
    // Ignore
  }
}

async function main() {
  console.log(`🚀 Simulating traffic for ${DURATION_MS / 1000}s at ${REQUESTS_PER_SECOND} req/s...\n`);

  const interval = 1000 / REQUESTS_PER_SECOND;
  const startTime = Date.now();

  const timer = setInterval(async () => {
    if (Date.now() - startTime > DURATION_MS) {
      clearInterval(timer);
      printSummary();
      return;
    }
    await sendBidRequest();
  }, interval);
}

function printSummary() {
  const avgLatency = stats.bids > 0 ? (stats.totalLatency / stats.bids).toFixed(2) : 0;
  console.log('\n📊 Simulation Summary:');
  console.log(`  Bid requests:  ${stats.bids}`);
  console.log(`  Impressions:   ${stats.impressions}`);
  console.log(`  Clicks:        ${stats.clicks}`);
  console.log(`  Conversions:   ${stats.conversions}`);
  console.log(`  Errors:        ${stats.errors}`);
  console.log(`  Avg latency:   ${avgLatency}ms`);
  console.log(`  Click rate:    ${stats.impressions > 0 ? ((stats.clicks / stats.impressions) * 100).toFixed(1) : 0}%`);
  console.log(`  Conv rate:     ${stats.clicks > 0 ? ((stats.conversions / stats.clicks) * 100).toFixed(1) : 0}%`);
  console.log('\n✅ Done!');
}

main().catch(console.error);
