import type {
  AdRequest,
  BidResponse,
  Bid,
  BidDebugInfo,
  ScoringDetail,
  Campaign,
  ConsentResult,
  TrackingPayload,
} from '../../shared/types.js';
import type { ICampaignRepository } from '../campaign/campaign.repository.js';
import type { ICreativeRepository } from '../campaign/creative.repository.js';
import type { ICacheProvider, IMessageQueue } from '../../infra/interfaces.js';
import { filterEligibleCampaigns } from './eligibilityFilter.js';
import { scoreCampaign } from './scorer.js';
import { checkFrequencyCap } from './frequencyCapper.js';
import { selectCreative } from './creativeSelector.js';
import { createTrackingToken } from '../events/trackingTokens.js';

export class BiddingEngine {
  constructor(
    private campaignRepo: ICampaignRepository,
    private creativeRepo: ICreativeRepository,
    private cache: ICacheProvider,
    private queue: IMessageQueue,
    private trackingSecret: string,
    private baseUrl: string = 'http://localhost:3000',
  ) {}

  async evaluateBid(
    request: AdRequest,
    debug = false,
  ): Promise<BidResponse> {
    const startTime = performance.now();
    const scoringDetails: ScoringDetail[] = [];

    // 1. Get all active campaigns
    const activeCampaigns = await this.campaignRepo.findActive();

    // 2. Eligibility filter
    const { eligible, filtered } = await filterEligibleCampaigns(
      activeCampaigns,
      request,
      this.cache,
    );

    // 3. Frequency cap check + scoring for eligible campaigns
    const scoredCampaigns: Array<{ campaign: Campaign; score: ScoringDetail }> = [];

    for (const campaign of eligible) {
      // Check frequency cap
      if (request.user.id && campaign.targeting.frequencyCap) {
        const withinCap = await checkFrequencyCap(
          this.cache,
          request.user.id,
          campaign.id,
          campaign.targeting.frequencyCap,
        );
        if (!withinCap) {
          filtered.set('frequency_capped', (filtered.get('frequency_capped') ?? 0) + 1);
          if (debug) {
            scoringDetails.push({
              campaignId: campaign.id,
              baseScore: 0,
              budgetMultiplier: 0,
              relevanceMultiplier: 0,
              finalScore: 0,
              eligible: false,
              filterReason: 'frequency_capped',
            });
          }
          continue;
        }
      }

      // Score the campaign
      const score = await scoreCampaign(campaign, request, this.cache);
      if (debug) scoringDetails.push(score);

      if (score.eligible && score.finalScore > 0) {
        scoredCampaigns.push({ campaign, score });
      }
    }

    // 4. Sort by score descending, take top N (return top 1 for now)
    scoredCampaigns.sort((a, b) => b.score.finalScore - a.score.finalScore);
    const winners = scoredCampaigns.slice(0, 1);

    // 5. Creative selection + bid assembly
    const bids: Bid[] = [];
    for (const { campaign, score } of winners) {
      const creatives = await this.creativeRepo.findActiveByCampaignId(campaign.id);
      if (creatives.length === 0) continue;

      const creative = selectCreative(creatives);

      const now = Math.floor(Date.now() / 1000);
      const trackingPayload: TrackingPayload = {
        rid: request.id,
        cid: campaign.id,
        crt: creative.id,
        pid: request.publisherId,
        uid: request.user.id,
        ts: now,
        exp: now + 86400, // 24h expiry
      };

      bids.push({
        campaignId: campaign.id,
        creativeId: creative.id,
        bidPriceCpm: Math.round(score.finalScore),
        creative: creative.content,
        trackingUrls: {
          impression: `${this.baseUrl}/v1/events/imp?t=${createTrackingToken(trackingPayload, this.trackingSecret)}`,
          click: `${this.baseUrl}/v1/events/clk?t=${createTrackingToken({ ...trackingPayload, exp: now + 3600 }, this.trackingSecret)}`,
          viewable: `${this.baseUrl}/v1/events/view?t=${createTrackingToken(trackingPayload, this.trackingSecret)}`,
        },
      });
    }

    // 6. Publish bid request event
    await this.queue.publish('ad.bid-requests', request.id, {
      requestId: request.id,
      publisherId: request.publisherId,
      bidsReturned: bids.length,
      timestamp: new Date().toISOString(),
    });

    const processingTimeMs = Math.round((performance.now() - startTime) * 100) / 100;

    const response: BidResponse = {
      requestId: request.id,
      bids,
      processingTimeMs,
    };

    if (debug) {
      response.debugInfo = {
        candidateCampaigns: activeCampaigns.length,
        filteredReasons: Object.fromEntries(filtered),
        scoringDetails,
      };
    }

    return response;
  }
}
