/**
 * Bidding latency benchmark — measures p50/p95/p99 latency for the bid endpoint.
 *
 * Usage: npm run benchmark
 * Requires: AdPulse API running and seeded
 */

const BASE_URL = `http://localhost:${process.env.PORT ?? 3000}`;
const ITERATIONS = parseInt(process.env.ITERATIONS ?? '200', 10);

const sampleRequest = {
  id: 'req_bench',
  publisherId: 'pub_bench',
  placementId: 'plc_bench',
  placementType: 'NATIVE',
  user: {
    id: 'usr_bench',
    segments: ['seg_fashion_enthusiasts'],
    geo: { country: 'US', region: 'NY' },
    device: 'MOBILE',
    consentSignals: [{ type: 'CCPA_USP', granted: true }],
  },
  context: { categories: ['IAB18'], keywords: ['benchmark'] },
};

async function main() {
  console.log(`⚡ Benchmarking bid endpoint (${ITERATIONS} iterations)...\n`);

  // Warmup
  for (let i = 0; i < 10; i++) {
    await sendBid();
  }

  const latencies: number[] = [];

  for (let i = 0; i < ITERATIONS; i++) {
    const start = performance.now();
    const data = await sendBid();
    const elapsed = performance.now() - start;

    latencies.push(data?.processingTimeMs ?? elapsed);

    if ((i + 1) % 50 === 0) {
      process.stdout.write(`  ${i + 1}/${ITERATIONS} requests...\r`);
    }
  }

  latencies.sort((a, b) => a - b);

  const p50 = latencies[Math.floor(latencies.length * 0.5)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  const p99 = latencies[Math.floor(latencies.length * 0.99)];
  const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const min = latencies[0];
  const max = latencies[latencies.length - 1];

  console.log('\n📊 Bid Latency Results:');
  console.log('─'.repeat(40));
  console.log(`  Min:    ${min.toFixed(2)}ms`);
  console.log(`  Avg:    ${avg.toFixed(2)}ms`);
  console.log(`  p50:    ${p50.toFixed(2)}ms`);
  console.log(`  p95:    ${p95.toFixed(2)}ms`);
  console.log(`  p99:    ${p99.toFixed(2)}ms  ${p99 < 50 ? '✅ PASS (<50ms)' : '❌ FAIL (>50ms)'}`);
  console.log(`  Max:    ${max.toFixed(2)}ms`);
  console.log('─'.repeat(40));
}

async function sendBid(): Promise<any> {
  const res = await fetch(`${BASE_URL}/v1/bid`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...sampleRequest, id: `req_bench_${Date.now()}` }),
  });
  return res.json();
}

main().catch(console.error);
