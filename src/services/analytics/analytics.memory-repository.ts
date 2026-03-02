import type { AdEvent } from '../../shared/types.js';
import type {
  IAnalyticsRepository,
  PerformanceQuery,
  PerformanceResult,
  TimeseriesBucket,
  CreativeBreakdown,
} from './analytics.repository.js';

export class MemoryAnalyticsRepository implements IAnalyticsRepository {
  private events: AdEvent[] = [];

  async insertEvent(event: AdEvent): Promise<void> {
    this.events.push(event);
  }

  async getCampaignPerformance(query: PerformanceQuery): Promise<PerformanceResult> {
    const filtered = this.events.filter(e => {
      if (e.campaignId !== query.campaignId) return false;
      const ts = new Date(e.timestamp).getTime();
      return ts >= query.dateRange.start.getTime() && ts <= query.dateRange.end.getTime();
    });

    const impressions = filtered.filter(e => e.type === 'IMPRESSION').length;
    const clicks = filtered.filter(e => e.type === 'CLICK').length;
    const conversions = filtered.filter(e => e.type === 'CONVERSION').length;
    const spend = filtered
      .filter(e => e.type === 'IMPRESSION')
      .reduce((sum, e) => sum + (parseInt(e.metadata?.bidPriceCpm ?? '0', 10)), 0);
    const uniqueUsers = new Set(filtered.filter(e => e.userId).map(e => e.userId)).size;

    const ctr = impressions > 0 ? clicks / impressions : 0;
    const cpm = impressions > 0 ? Math.round((spend / impressions) * 1000) : 0;
    const cpa = conversions > 0 ? Math.round(spend / conversions) : 0;

    // Build timeseries
    const bucketSize = query.granularity === 'HOURLY' ? 3600000 : 86400000;
    const bucketMap = new Map<string, TimeseriesBucket>();

    for (const event of filtered) {
      const ts = new Date(event.timestamp).getTime();
      const bucketTs = Math.floor(ts / bucketSize) * bucketSize;
      const bucketKey = new Date(bucketTs).toISOString();

      let bucket = bucketMap.get(bucketKey);
      if (!bucket) {
        bucket = { bucket: bucketKey, impressions: 0, clicks: 0, conversions: 0, spend: 0 };
        bucketMap.set(bucketKey, bucket);
      }

      switch (event.type) {
        case 'IMPRESSION':
          bucket.impressions++;
          bucket.spend += parseInt(event.metadata?.bidPriceCpm ?? '0', 10);
          break;
        case 'CLICK':
          bucket.clicks++;
          break;
        case 'CONVERSION':
          bucket.conversions++;
          break;
      }
    }

    // Build creative breakdown
    const creativeMap = new Map<string, { impressions: number; clicks: number }>();
    for (const event of filtered) {
      if (!event.creativeId) continue;
      let stats = creativeMap.get(event.creativeId);
      if (!stats) {
        stats = { impressions: 0, clicks: 0 };
        creativeMap.set(event.creativeId, stats);
      }
      if (event.type === 'IMPRESSION') stats.impressions++;
      if (event.type === 'CLICK') stats.clicks++;
    }

    const byCreative: CreativeBreakdown[] = [...creativeMap.entries()].map(
      ([creativeId, stats]) => ({
        creativeId,
        impressions: stats.impressions,
        clicks: stats.clicks,
        ctr: stats.impressions > 0 ? stats.clicks / stats.impressions : 0,
      }),
    );

    return {
      campaignId: query.campaignId,
      period: {
        start: query.dateRange.start.toISOString().split('T')[0],
        end: query.dateRange.end.toISOString().split('T')[0],
      },
      summary: { impressions, clicks, conversions, spend, ctr, cpm, cpa, uniqueUsers },
      timeseries: [...bucketMap.values()].sort((a, b) => a.bucket.localeCompare(b.bucket)),
      byCreative,
    };
  }
}
