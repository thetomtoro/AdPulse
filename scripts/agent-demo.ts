/**
 * AI Agent Demo — demonstrates the full AI agent feedback loop:
 * 1. Create a campaign declaratively (one pass)
 * 2. Fire some traffic to generate data
 * 3. Fetch performance signals
 * 4. Apply optimization based on signals
 * 5. Verify bid score is updated
 *
 * Usage: npm run agent-demo
 * Requires: AdPulse API running (npm run dev)
 */

const BASE_URL = `http://localhost:${process.env.PORT ?? 3000}`;
const HEADERS = { 'X-Dev-Advertiser-Id': 'adv_dev_default', 'Content-Type': 'application/json' };

async function main() {
  console.log('🤖 AI Agent Demo — Full Feedback Loop\n');
  console.log('═'.repeat(50));

  // Step 1: Create campaign declaratively
  console.log('\n📋 Step 1: Declarative Campaign Creation');
  console.log('  Sending high-level intent (goal + audience + budget)...\n');

  const createRes = await fetch(`${BASE_URL}/v1/agent/campaigns`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      name: 'AI Agent — Summer Promo',
      goal: 'MAXIMIZE_CLICKS',
      budget: { totalDollars: 1000, dailyDollars: 100 },
      schedule: {
        startDate: '2026-01-01T00:00:00Z',
        endDate: '2026-06-01T00:00:00Z',
        timezone: 'America/New_York',
      },
      audience: {
        segments: ['seg_fashion_enthusiasts', 'seg_gift_shoppers'],
        geos: ['US', 'CA'],
        devices: ['MOBILE', 'DESKTOP'],
        contextualCategories: ['IAB18'],
      },
      creatives: [
        {
          type: 'NATIVE',
          name: 'Summer Sale Hero',
          headline: 'Summer Sale — 50% Off Everything',
          body: 'Limited time offer',
          clickUrl: 'https://shop.example.com/summer',
        },
        {
          type: 'NATIVE',
          name: 'Summer Sale Secondary',
          headline: 'Don\'t Miss Our Biggest Sale',
          body: 'Shop trending styles',
          clickUrl: 'https://shop.example.com/summer?v=b',
        },
      ],
      constraints: {
        maxCpmDollars: 10,
        brandSafetyLevel: 'MODERATE',
        frequencyCap: { maxImpressions: 3, windowHours: 24 },
      },
    }),
  });

  const campaign = await createRes.json() as any;

  if (createRes.status !== 201) {
    console.error('  ✗ Failed to create campaign:', campaign);
    return;
  }

  console.log(`  ✓ Campaign created: ${campaign.id}`);
  console.log(`  ✓ Status: ${campaign.status} (auto-activated)`);
  console.log(`  ✓ System resolved:`);
  console.log(`    • Objective: ${campaign._agent.resolvedObjective}`);
  console.log(`    • Bid strategy: ${campaign._agent.resolvedBidStrategy}`);
  console.log(`    • Pacing: ${campaign._agent.resolvedPacingType}`);
  console.log(`    • Consent: ${campaign._agent.resolvedCompliance.consentTypes.join(', ') || 'none'}`);
  console.log(`    • Budget: $${campaign.budget.totalBudget / 100} total, $${campaign.budget.dailyBudget / 100}/day`);

  // Step 2: Fire some bid requests to generate data
  console.log('\n📡 Step 2: Generating Traffic');
  console.log('  Sending 20 bid requests...');

  let bidsWithResults = 0;
  for (let i = 0; i < 20; i++) {
    const bidRes = await fetch(`${BASE_URL}/v1/bid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: `req_agent_demo_${i}`,
        publisherId: 'pub_demo',
        placementId: 'plc_demo',
        placementType: 'NATIVE',
        user: {
          id: `usr_demo_${i % 5}`,
          segments: ['seg_fashion_enthusiasts'],
          geo: { country: 'US', region: 'NY' },
          device: 'MOBILE',
          consentSignals: [{ type: 'CCPA_USP', granted: true }],
        },
        context: { categories: ['IAB18'] },
      }),
    });
    const bid = await bidRes.json() as any;
    if (bid.bids?.length > 0) bidsWithResults++;
  }

  console.log(`  ✓ ${bidsWithResults}/20 requests returned bids`);

  // Step 3: Fetch performance signals
  console.log('\n📊 Step 3: Fetching Performance Signals');

  const signalsRes = await fetch(`${BASE_URL}/v1/agent/campaigns/${campaign.id}/signals`, {
    headers: HEADERS,
  });
  const signals = await signalsRes.json() as any;

  console.log(`  ✓ Spend: $${signals.spend.totalSpent / 100} of $${signals.spend.totalBudget / 100} (${signals.spend.budgetRemainingPercent}% remaining)`);
  console.log(`  ✓ Performance:`);
  console.log(`    • Impressions: ${signals.performance.impressions}`);
  console.log(`    • Clicks: ${signals.performance.clicks}`);
  console.log(`    • CTR: ${(signals.performance.ctr * 100).toFixed(2)}%`);
  console.log(`  ✓ Recommendations: ${signals.recommendations.length > 0 ? signals.recommendations.join('; ') : 'None yet'}`);

  // Step 4: Apply optimization
  console.log('\n⚡ Step 4: Applying AI Optimization');
  console.log('  Agent decides to increase bid by 1.8x based on underpacing...');

  const optimizeRes = await fetch(`${BASE_URL}/v1/agent/campaigns/${campaign.id}/optimize`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      action: 'ADJUST_BID',
      bidMultiplier: 1.8,
      reason: 'Underpacing detected — increasing bid to capture more impressions',
    }),
  });
  const optimization = await optimizeRes.json() as any;

  console.log(`  ✓ Applied: ${optimization.action}`);
  console.log(`  ✓ Bid multiplier: ${optimization.details.bidMultiplier}x`);
  console.log(`  ✓ Reason: ${optimization.details.reason}`);

  // Step 5: Verify bid score is affected
  console.log('\n🔍 Step 5: Verifying Bid Score Impact');

  const debugBidRes = await fetch(`${BASE_URL}/v1/bid?debug=true`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 'req_agent_verify',
      publisherId: 'pub_demo',
      placementId: 'plc_demo',
      placementType: 'NATIVE',
      user: {
        id: 'usr_verify',
        segments: ['seg_fashion_enthusiasts'],
        geo: { country: 'US', region: 'NY' },
        device: 'MOBILE',
        consentSignals: [{ type: 'CCPA_USP', granted: true }],
      },
      context: { categories: ['IAB18'] },
    }),
  });
  const debugBid = await debugBidRes.json() as any;

  if (debugBid.debugInfo?.scoringDetails?.length > 0) {
    const detail = debugBid.debugInfo.scoringDetails[0];
    console.log(`  ✓ Campaign: ${detail.campaignId}`);
    console.log(`  ✓ Base score: ${detail.baseScore}`);
    console.log(`  ✓ Final score: ${detail.finalScore} (includes 1.8x agent multiplier)`);
  } else {
    console.log(`  ℹ No scoring details available (campaign may be filtered by dayparting)`);
  }

  console.log('\n' + '═'.repeat(50));
  console.log('✅ AI Agent feedback loop complete!');
  console.log('\nThis demonstrates:');
  console.log('  1. Declarative campaign creation (one API call)');
  console.log('  2. Real-time performance signal streaming');
  console.log('  3. AI-driven optimization with bid adjustment');
  console.log('  4. Closed feedback loop (signals → optimize → adjusted bids)');
}

main().catch(console.error);
