import { z } from 'zod';

export const PerformanceQuerySchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  granularity: z.enum(['HOURLY', 'DAILY']).default('HOURLY'),
  metrics: z.string().optional(), // comma-separated
});

export const AttributionQuerySchema = z.object({
  model: z.enum(['LAST_CLICK', 'FIRST_CLICK', 'LINEAR', 'TIME_DECAY', 'POSITION_BASED']).default('LAST_CLICK'),
  lookbackDays: z.coerce.number().int().min(1).max(90).default(30),
});

export type PerformanceQueryInput = z.infer<typeof PerformanceQuerySchema>;
export type AttributionQueryInput = z.infer<typeof AttributionQuerySchema>;
