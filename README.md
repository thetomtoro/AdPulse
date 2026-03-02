# AdPulse — Real-Time Ad Bidding & Campaign Management API

A high-performance, privacy-compliant ad tech platform built with TypeScript/Node.js. Features real-time bidding (<50ms p99), a declarative AI agent API for autonomous campaign management, event-driven analytics, and multi-touch attribution.

**[Live Dashboard Demo](https://dashboard-eosin-iota-70.vercel.app)** · **[API & Swagger Docs](https://adpulse-production-3916.up.railway.app/docs)**

### Highlights

- **7-step bidding engine** — compliance → eligibility → freq cap → pacing → scoring → creative → response, all under 50ms
- **AI Agent API** — declare a goal like "maximize clicks for $500" and the system auto-resolves bid strategy, pacing, compliance, and creative weights
- **Closed-loop optimization** — agents read real-time signals, adjust bid multipliers, and the scorer picks them up instantly
- **Event pipeline** — HMAC-signed tracking pixels, deduplication, 5 attribution models, streaming budget updates
- **85 tests** passing in <1s, zero external dependencies needed to run

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         API Gateway                              │
│  Fastify + Zod validation + @fastify/swagger + rate limiting     │
└──────────┬──────────┬──────────┬──────────┬──────────┬──────────┘
           │          │          │          │          │
     Campaigns    Bidding    Events    Analytics   Webhooks
     (CRUD)      (<50ms)    (pixels)  (OLAP)      (push)
           │          │          │          │          │
           └──────────┴──────┬───┴──────────┴──────────┘
                             │
                    ┌────────┴────────┐
                    │  Message Queue  │
                    │ (Kafka/Memory)  │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
        Budget Consumer  Analytics     Attribution
        (spend tracking) Consumer     Consumer
```

### Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Infrastructure | Provider/adapter pattern | In-memory defaults for zero-dep dev; real Redis/Kafka/Postgres via env flags |
| IDs | UUIDv7 with type prefixes | Time-sortable, human-identifiable (`cmp_`, `crt_`, `req_`) |
| Validation | Zod schemas throughout | Single source for types, runtime validation, and OpenAPI generation |
| Bidding | 7-step pipeline | Compliance → Eligibility → Freq Cap → Pacing → Scoring → Creative → Response |
| Attribution | 5 multi-touch models | Last-click, first-click, linear, time-decay, position-based |
| Testing | Vitest + in-memory providers | Fast, deterministic, no external services needed |

## Quick Start

```bash
# Install dependencies
npm install

# Start the dev server (in-memory mode — no Docker required)
npm run dev

# In another terminal, seed demo data
npm run seed

# Simulate realistic traffic
npm run simulate

# Run the latency benchmark
npm run benchmark
```

The API starts on `http://localhost:3000` with Swagger docs at `http://localhost:3000/docs`.

### With Real Infrastructure (Optional)

```bash
# Start Postgres, Redis, Kafka, TimescaleDB
docker compose up -d

# Switch to real backends via env vars
USE_MEMORY_DB=false USE_MEMORY_CACHE=false USE_MEMORY_QUEUE=false npm run dev
```

## API Reference

### Campaigns

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/v1/campaigns` | Create a campaign with creatives |
| `GET` | `/v1/campaigns` | List campaigns (paginated) |
| `GET` | `/v1/campaigns/:id` | Get campaign details |
| `PATCH` | `/v1/campaigns/:id` | Update campaign |
| `DELETE` | `/v1/campaigns/:id` | Delete campaign |
| `POST` | `/v1/campaigns/:id/activate` | Activate a draft campaign |
| `POST` | `/v1/campaigns/:id/pause` | Pause an active campaign |

### Bidding

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/v1/bid` | Submit a bid request (<50ms p99 target) |
| `POST` | `/v1/bid?debug=true` | Bid with scoring breakdown |

### Events

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/v1/events/imp?t=<token>` | Impression pixel (1x1 GIF) |
| `GET` | `/v1/events/clk?t=<token>` | Click tracker |
| `GET` | `/v1/events/view?t=<token>` | Viewability beacon |
| `POST` | `/v1/conversions` | Record a conversion event |

### Analytics

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/v1/analytics/campaigns/:id/performance` | Campaign metrics (impressions, clicks, CTR, CPM, spend) |
| `GET` | `/v1/analytics/campaigns/:id/attribution` | Multi-touch attribution results |

### AI Agent API

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/v1/agent/campaigns` | Declarative one-pass campaign creation |
| `GET` | `/v1/agent/campaigns/:id/signals` | Real-time performance signals for AI consumption |
| `POST` | `/v1/agent/campaigns/:id/optimize` | Apply AI-driven optimizations |

### Webhooks

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/v1/webhooks` | Subscribe to events |
| `GET` | `/v1/webhooks` | List subscriptions |
| `DELETE` | `/v1/webhooks/:id` | Remove subscription |

### Authentication

All endpoints (except bid and event pixels) require a Bearer token:
```
Authorization: Bearer adpulse_dev_key_12345678
```

For development, you can also use the `X-Dev-Advertiser-Id` header to bypass auth.

## Bidding Engine

The 7-step bid evaluation pipeline processes requests in under 50ms:

1. **Compliance Gate** — Evaluate GDPR/CCPA consent signals; block or limit data scope
2. **Eligibility Filter** — Status, schedule, geo, device, placement, budget checks
3. **Frequency Cap** — Redis sorted-set sliding window per user/campaign
4. **Budget Pacing** — EVEN, ACCELERATED, or FRONTLOADED spend distribution
5. **Scoring** — Weighted formula: `baseBid × segmentOverlap × contextMatch × paceMultiplier × recency`
6. **Creative Selection** — Weighted random from eligible creatives
7. **Response Assembly** — Build response with HMAC-signed tracking URLs

## Event Pipeline

```
Bid Response → Impression Pixel → Click Tracker → Conversion API
     │               │                  │                │
     └───────────────┴──────────────────┴────────────────┘
                              │
                     ┌────────┴────────┐
                     │   Kafka Topics  │
                     │ (or in-memory)  │
                     └────────┬────────┘
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
      Budget Updates    Analytics Store    Attribution
      (spend counters)  (time-series)    (touchpoint chains)
```

- **Deduplication** — Redis SET with TTL prevents double-counting
- **Tracking tokens** — HMAC-SHA256 signed, time-expiring, tamper-proof
- **Budget consumer** — Real-time spend tracking from impression events

## Attribution Models

| Model | Algorithm |
|---|---|
| Last Click | 100% credit to last touchpoint |
| First Click | 100% credit to first touchpoint |
| Linear | Equal credit across all touchpoints |
| Time Decay | Exponential decay with 7-day half-life |
| Position Based | 40% first / 20% middle / 40% last |

## AI Agent API — Declarative Campaign Management

Built for AI agents and autonomous marketing systems to manage campaigns through a simplified, intent-driven interface.

### One-Pass Campaign Creation

Instead of requiring 15+ fields across budget, targeting, compliance, and creatives, the agent sends high-level intent:

```json
{
  "name": "Summer Promo",
  "goal": "MAXIMIZE_CLICKS",
  "budget": { "totalDollars": 1000, "dailyDollars": 100 },
  "audience": { "segments": ["seg_fashion"], "geos": ["US"], "devices": ["MOBILE"] },
  "creatives": [{ "type": "NATIVE", "name": "Hero", "headline": "50% Off", "clickUrl": "https://..." }],
  "constraints": { "maxCpmDollars": 10, "brandSafetyLevel": "MODERATE" }
}
```

The system auto-resolves: goal → bid strategy, dollars → cents, geos → compliance (US→CCPA, EU→GDPR), schedule duration → pacing type. Campaign is created and activated in one API call.

### Performance Signals for AI Feedback

`GET /v1/agent/campaigns/:id/signals` returns AI-consumable metrics with actionable recommendations:

- Spend pacing (actual vs expected), budget remaining
- CTR, conversion rate, CPA
- Per-creative breakdown
- Recommendations: `INCREASE_BID`, `DECREASE_BID`, `PAUSE_CREATIVE:crt_xxx`

### Closed-Loop Optimization

`POST /v1/agent/campaigns/:id/optimize` applies AI-driven adjustments:

- `ADJUST_BID` — updates bid score multiplier (0.1x–5.0x), read by the bidding engine in real-time
- `PAUSE_CREATIVE` / `RESUME_CREATIVE` — toggle creative status based on performance
- `SHIFT_BUDGET` — adjust daily budget allocation
- `UPDATE_TARGETING` — add/remove audience segments

```bash
# Run the full AI agent feedback loop demo
npm run agent-demo
```

## Project Structure

```
adpulse/
├── src/
│   ├── api/
│   │   ├── middleware/     # Auth, rate limiting, request IDs
│   │   ├── routes/         # Campaign, bid, event, analytics, webhook routes
│   │   ├── schemas/        # Zod validation schemas
│   │   └── server.ts       # Fastify factory with plugin registration
│   ├── config/             # Zod-validated environment config
│   ├── consumers/          # Kafka/memory queue consumers
│   ├── infra/
│   │   ├── cache/          # MemoryCacheProvider, RedisCacheProvider
│   │   ├── queue/          # MemoryQueueProvider, KafkaQueueProvider
│   │   ├── interfaces.ts   # ICacheProvider, IMessageQueue abstractions
│   │   └── provider.ts     # Factory for infrastructure backends
│   ├── services/
│   │   ├── analytics/      # Performance queries, attribution engine
│   │   ├── bidding/        # Eligibility, scoring, pacing, freq cap, creative selection
│   │   ├── campaign/       # CRUD, lifecycle, validation, repository pattern
│   │   ├── compliance/     # Consent, brand safety, data retention
│   │   ├── events/         # Tracking tokens, deduplication, event producer
│   │   ├── webhooks/       # HMAC-signed dispatch with retry
│   │   └── agent/          # AI agent intent resolver, signals, optimization
│   ├── shared/             # Types, errors, logger, ID generation
│   └── index.ts            # Entry point with graceful shutdown
├── db/
│   ├── migrations/         # PostgreSQL schema migrations
│   └── timescale-init/     # TimescaleDB hypertables and continuous aggregates
├── k8s/                    # Kubernetes deployments and HPA
├── scripts/                # Seed, traffic simulation, benchmarking
├── tests/
│   ├── unit/               # Validator, scorer, pacer, attribution, freq cap
│   ├── integration/        # Full API lifecycle tests
│   ├── load/               # k6 load testing scripts
│   └── helpers/            # Test harness with in-memory providers
├── dashboard/              # React + Vite + Tailwind dashboard
│   ├── src/pages/          # Campaigns, AI Agent, Live Bidding, Analytics
│   └── src/components/     # Layout, MetricCard, StatusBadge
└── docker-compose.yml      # Postgres, Redis, Kafka, TimescaleDB
```

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npx vitest run --coverage

# Run specific test file
npx vitest run tests/unit/attribution.test.ts
```

85 tests across 11 test files covering:
- Campaign validation and business rules
- Bid scoring, budget pacing, frequency capping
- Tracking token creation and verification
- Attribution model calculations (all 5 models)
- AI agent intent resolution and optimization
- Full API integration (CRUD, bidding, events, agent)

## Load Testing

```bash
# With k6 installed
k6 run tests/load/k6-bid-load.js

# Custom parameters
k6 run --vus 50 --duration 60s tests/load/k6-bid-load.js
```

## Demo Walkthrough

```bash
# 1. Start the server
npm run dev

# 2. Seed campaigns
npm run seed

# 3. Send a bid request
curl -s -X POST http://localhost:3000/v1/bid \
  -H "Content-Type: application/json" \
  -d '{
    "id": "req_demo_1",
    "publisherId": "pub_abc",
    "placementId": "plc_hero",
    "placementType": "NATIVE",
    "user": {
      "id": "usr_1",
      "segments": ["seg_fashion_enthusiasts"],
      "geo": { "country": "US", "region": "NY" },
      "device": "MOBILE",
      "consentSignals": [{ "type": "CCPA_USP", "granted": true }]
    },
    "context": { "categories": ["IAB18"] }
  }' | jq .

# 4. Fire the impression pixel (use trackingUrls.impression from bid response)
# curl "<impression_url>"

# 5. Check analytics
curl -s http://localhost:3000/v1/analytics/campaigns/<campaign_id>/performance \
  -H "Authorization: Bearer adpulse_dev_key_12345678" | jq .

# 6. Run traffic simulation
npm run simulate

# 7. Benchmark latency
npm run benchmark
```

## Technology Stack

- **Runtime:** Node.js 22 + TypeScript (strict mode)
- **Framework:** Fastify with Zod validation
- **Database:** PostgreSQL (or in-memory) with repository pattern
- **Cache:** Redis (or in-memory) with TTL, sorted sets
- **Queue:** Apache Kafka (or in-memory EventEmitter)
- **Analytics:** TimescaleDB hypertables with continuous aggregates
- **Testing:** Vitest (85 tests, <1s execution)
- **Observability:** Pino structured logging
- **Frontend:** React 18, Vite, Tailwind CSS, Recharts
- **Deployment:** Docker Compose, Kubernetes manifests with HPA, Railway + Vercel
