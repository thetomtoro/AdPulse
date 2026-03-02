import type { IAnalyticsRepository, PerformanceResult } from './analytics.repository.js';
import { calculateAttribution } from './attribution.js';
import type { Touchpoint, AttributionModel } from '../../shared/types.js';

export class AnalyticsService {
  constructor(private repo: IAnalyticsRepository) {}

  async getCampaignPerformance(
    campaignId: string,
    startDate: string,
    endDate: string,
    granularity: 'HOURLY' | 'DAILY' = 'HOURLY',
    metrics: string[] = ['impressions', 'clicks', 'conversions', 'spend', 'ctr', 'cpm', 'cpa'],
  ): Promise<PerformanceResult> {
    return this.repo.getCampaignPerformance({
      campaignId,
      dateRange: { start: new Date(startDate), end: new Date(endDate) },
      granularity,
      metrics,
    });
  }

  getAttribution(
    touchpoints: Touchpoint[],
    model: AttributionModel | string,
    conversionValue: number,
  ) {
    return calculateAttribution(touchpoints, model as AttributionModel, conversionValue);
  }
}
