/**
 * k6 load test for the AdPulse bid endpoint.
 *
 * Usage:
 *   k6 run tests/load/k6-bid-load.js
 *   k6 run --vus 50 --duration 60s tests/load/k6-bid-load.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const bidLatency = new Trend('bid_latency_ms', true);
const bidFailRate = new Rate('bid_fail_rate');

export const options = {
  stages: [
    { duration: '10s', target: 10 },  // ramp up
    { duration: '30s', target: 50 },  // sustained load
    { duration: '10s', target: 100 }, // peak
    { duration: '10s', target: 0 },   // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<100', 'p(99)<200'],
    bid_latency_ms: ['p(99)<50'],
    bid_fail_rate: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

const SEGMENTS = ['seg_fashion_enthusiasts', 'seg_gift_shoppers', 'seg_new_visitors', 'seg_high_value'];
const GEOS = [
  { country: 'US', region: 'NY' },
  { country: 'US', region: 'CA' },
  { country: 'CA', region: 'ON' },
];
const DEVICES = ['DESKTOP', 'MOBILE', 'TABLET', 'CTV'];
const CATEGORIES = ['IAB18', 'IAB1', 'IAB9', 'IAB25'];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function () {
  const payload = JSON.stringify({
    id: `req_k6_${__VU}_${__ITER}_${Date.now()}`,
    publisherId: 'pub_k6',
    placementId: 'plc_k6',
    placementType: 'NATIVE',
    user: {
      id: `usr_k6_${__VU}`,
      segments: SEGMENTS.filter(() => Math.random() > 0.5),
      geo: randomItem(GEOS),
      device: randomItem(DEVICES),
      consentSignals: [{ type: 'CCPA_USP', granted: true }],
    },
    context: {
      categories: [randomItem(CATEGORIES)],
      keywords: ['load-test'],
    },
  });

  const res = http.post(`${BASE_URL}/v1/bid`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });

  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'has bids array': (r) => {
      try {
        return JSON.parse(r.body).bids !== undefined;
      } catch {
        return false;
      }
    },
  });

  bidFailRate.add(!success);

  if (res.status === 200) {
    try {
      const body = JSON.parse(res.body);
      if (body.processingTimeMs) {
        bidLatency.add(body.processingTimeMs);
      }
    } catch {
      // ignore parse errors
    }
  }

  sleep(0.1);
}
