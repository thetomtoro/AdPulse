import type { AdEvent } from '../../shared/types.js';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface PerformanceQuery {
  campaignId: string;
  dateRange: DateRange;
  granularity: 'HOURLY' | 'DAILY';
  metrics: string[];
}

export interface TimeseriesBucket {
  bucket: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
}

export interface CreativeBreakdown {
  creativeId: string;
  impressions: number;
  clicks: number;
  ctr: number;
}

export interface PerformanceResult {
  campaignId: string;
  period: { start: string; end: string };
  summary: {
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
    ctr: number;
    cpm: number;
    cpa: number;
    uniqueUsers: number;
  };
  timeseries: TimeseriesBucket[];
  byCreative: CreativeBreakdown[];
}

export interface IAnalyticsRepository {
  insertEvent(event: AdEvent): Promise<void>;
  getCampaignPerformance(query: PerformanceQuery): Promise<PerformanceResult>;
}
