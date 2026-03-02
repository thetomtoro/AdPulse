import type { Campaign } from '../../shared/types.js';
import type { ICacheProvider } from '../../infra/interfaces.js';
import type { IAnalyticsRepository } from '../analytics/analytics.repository.js';
import type { ICreativeRepository } from '../campaign/creative.repository.js';

export interface PerformanceSignals {
  campaignId: string;
  status: string;
  spend: {
    totalSpent: number;
    dailySpent: number;
    totalBudget: number;
    dailyBudget: number;
    paceRatio: number; // actual/expected — 1.0 = on pace
    budgetRemainingPercent: number;
  };
  performance: {
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    conversionRate: number;
    cpa: number;
    cpm: number;
  };
  byCreative: {
    creativeId: string;
    name: string;
    impressions: number;
    clicks: number;
    ctr: number;
  }[];
  recommendations: string[];
  timestamp: string;
}

export class SignalsService {
  constructor(
    private analyticsRepo: IAnalyticsRepository,
    private creativeRepo: ICreativeRepository,
    private cache: ICacheProvider,
  ) {}

  async getSignals(campaign: Campaign): Promise<PerformanceSignals> {
    // Fetch performance data
    const perf = await this.analyticsRepo.getCampaignPerformance({
      campaignId: campaign.id,
      dateRange: { start: campaign.schedule.startDate, end: new Date() },
      granularity: 'DAILY',
      metrics: ['impressions', 'clicks', 'conversions', 'spend', 'ctr', 'cpm', 'cpa'],
    });

    // Fetch spend counters from cache
    const totalSpent = await this.cache.getNumber(`budget:${campaign.id}:total:spend`);
    const dailySpent = await this.cache.getNumber(`budget:${campaign.id}:daily:spend`);

    // Calculate pace ratio: how fast are we spending vs expected
    const now = new Date();
    const startTime = campaign.schedule.startDate.getTime();
    const endTime = campaign.schedule.endDate?.getTime() ?? (startTime + 30 * 86400000);
    const totalDuration = endTime - startTime;
    const elapsed = Math.max(1, now.getTime() - startTime);
    const elapsedFraction = Math.min(1, elapsed / totalDuration);
    const expectedSpend = campaign.budget.totalBudget * elapsedFraction;
    const paceRatio = expectedSpend > 0 ? totalSpent / expectedSpend : 0;

    const budgetRemainingPercent = campaign.budget.totalBudget > 0
      ? ((campaign.budget.totalBudget - totalSpent) / campaign.budget.totalBudget) * 100
      : 0;

    // Get creative names
    const creatives = await this.creativeRepo.findByCampaignId(campaign.id);
    const creativeNames = new Map(creatives.map(c => [c.id, c.name]));

    const byCreative = perf.byCreative.map(c => ({
      creativeId: c.creativeId,
      name: creativeNames.get(c.creativeId) ?? 'Unknown',
      impressions: c.impressions,
      clicks: c.clicks,
      ctr: c.ctr,
    }));

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      paceRatio,
      perf.summary,
      byCreative,
      campaign,
    );

    return {
      campaignId: campaign.id,
      status: campaign.status,
      spend: {
        totalSpent,
        dailySpent,
        totalBudget: campaign.budget.totalBudget,
        dailyBudget: campaign.budget.dailyBudget,
        paceRatio: Math.round(paceRatio * 100) / 100,
        budgetRemainingPercent: Math.round(budgetRemainingPercent * 10) / 10,
      },
      performance: {
        impressions: perf.summary.impressions,
        clicks: perf.summary.clicks,
        conversions: perf.summary.conversions,
        ctr: Math.round(perf.summary.ctr * 10000) / 10000,
        conversionRate: perf.summary.clicks > 0
          ? Math.round((perf.summary.conversions / perf.summary.clicks) * 10000) / 10000
          : 0,
        cpa: perf.summary.cpa,
        cpm: perf.summary.cpm,
      },
      byCreative,
      recommendations,
      timestamp: new Date().toISOString(),
    };
  }

  private generateRecommendations(
    paceRatio: number,
    summary: { impressions: number; clicks: number; conversions: number; ctr: number; cpa: number },
    byCreative: { creativeId: string; ctr: number; impressions: number }[],
    campaign: Campaign,
  ): string[] {
    const recs: string[] = [];

    // Pace-based recommendations
    if (paceRatio < 0.5 && summary.impressions > 10) {
      recs.push('INCREASE_BID: Underpacing — spend rate is below 50% of target');
    } else if (paceRatio > 1.5) {
      recs.push('DECREASE_BID: Overpacing — spend rate exceeds 150% of target');
    }

    // CPA-based recommendations (for conversion campaigns)
    if (campaign.objective === 'CONVERSIONS' && campaign.budget.bidStrategy === 'TARGET_CPA') {
      const targetCpa = campaign.budget.maxBidCpm * 10; // rough heuristic
      if (summary.cpa > 0 && summary.cpa > targetCpa * 2) {
        recs.push('DECREASE_BID: CPA is more than 2x target');
      }
    }

    // Creative performance recommendations
    if (byCreative.length > 1) {
      const avgCtr = byCreative.reduce((s, c) => s + c.ctr, 0) / byCreative.length;
      for (const creative of byCreative) {
        if (creative.impressions > 20 && creative.ctr < avgCtr * 0.5) {
          recs.push(`PAUSE_CREATIVE:${creative.creativeId}: CTR significantly below average`);
        }
      }
    }

    // Low volume warning
    if (summary.impressions < 10) {
      recs.push('INCREASE_BID: Low impression volume — consider raising bid or broadening targeting');
    }

    return recs;
  }
}
