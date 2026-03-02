import { z } from 'zod';

export const BudgetConfigSchema = z.object({
  totalBudget: z.number().int().positive().describe('Total spend limit in cents'),
  dailyBudget: z.number().int().positive().describe('Daily spend cap in cents'),
  bidStrategy: z.enum(['MANUAL_CPM', 'TARGET_CPA', 'MAXIMIZE_CLICKS', 'MAXIMIZE_CONVERSIONS']),
  maxBidCpm: z.number().int().positive().describe('Maximum CPM bid in cents'),
  pacingType: z.enum(['EVEN', 'ACCELERATED', 'FRONTLOADED']),
});

export const ScheduleConfigSchema = z.object({
  startDate: z.string().datetime().describe('ISO 8601 start date'),
  endDate: z.string().datetime().optional().describe('ISO 8601 end date'),
  timezone: z.string().describe('IANA timezone'),
});

export const SegmentRuleSchema = z.object({
  segmentId: z.string().min(1),
  matchType: z.enum(['INCLUDE', 'EXCLUDE']),
});

export const GeoTargetSchema = z.object({
  type: z.enum(['COUNTRY', 'REGION', 'CITY', 'POSTAL']),
  value: z.string().min(1),
  matchType: z.enum(['INCLUDE', 'EXCLUDE']),
});

export const FrequencyCapSchema = z.object({
  maxImpressions: z.number().int().positive(),
  windowHours: z.number().int().positive(),
  scope: z.enum(['CAMPAIGN', 'AD_GROUP', 'CREATIVE']),
});

export const DayPartRuleSchema = z.object({
  daysOfWeek: z.array(z.number().int().min(0).max(6)),
  startHour: z.number().int().min(0).max(23),
  endHour: z.number().int().min(0).max(23),
  timezone: z.string(),
});

export const ContextualRuleSchema = z.object({
  categoryId: z.string().min(1),
  matchType: z.enum(['INCLUDE', 'EXCLUDE']),
});

export const TargetingConfigSchema = z.object({
  segments: z.array(SegmentRuleSchema).default([]),
  geo: z.array(GeoTargetSchema).min(1, 'At least one geo target required'),
  devices: z.array(z.enum(['DESKTOP', 'MOBILE', 'TABLET', 'CTV'])).min(1),
  dayParting: z.array(DayPartRuleSchema).default([]),
  frequencyCap: FrequencyCapSchema,
  contextual: z.array(ContextualRuleSchema).default([]),
});

export const ComplianceConfigSchema = z.object({
  requireConsent: z.boolean(),
  consentTypes: z.array(z.enum(['GDPR_TCF', 'CCPA_USP', 'CUSTOM'])).default([]),
  dataRetentionDays: z.number().int().min(1).max(730),
  restrictedCategories: z.array(z.string()).default([]),
  brandSafetyLevel: z.enum(['STRICT', 'MODERATE', 'PERMISSIVE']),
});

export const CreativeContentSchema = z.object({
  headline: z.string().optional(),
  body: z.string().optional(),
  imageUrl: z.string().url().optional(),
  clickUrl: z.string().url(),
  impressionTracker: z.string().url().optional(),
  displayUrl: z.string().optional(),
});

export const CreateCreativeInputSchema = z.object({
  type: z.enum(['BANNER', 'NATIVE', 'SPONSORED_LISTING', 'VIDEO']),
  name: z.string().min(1).max(255),
  content: CreativeContentSchema,
  weight: z.number().int().min(1).max(100).default(50),
  metadata: z.record(z.string()).default({}),
});

export const CreateCampaignSchema = z.object({
  name: z.string().min(1).max(255),
  objective: z.enum(['AWARENESS', 'TRAFFIC', 'CONVERSIONS', 'REVENUE']),
  budget: BudgetConfigSchema,
  schedule: ScheduleConfigSchema,
  targeting: TargetingConfigSchema,
  compliance: ComplianceConfigSchema,
  creatives: z.array(CreateCreativeInputSchema).min(1, 'At least one creative required'),
});

export const UpdateCampaignSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  objective: z.enum(['AWARENESS', 'TRAFFIC', 'CONVERSIONS', 'REVENUE']).optional(),
  budget: BudgetConfigSchema.partial().optional(),
  schedule: ScheduleConfigSchema.partial().optional(),
  targeting: TargetingConfigSchema.partial().optional(),
  compliance: ComplianceConfigSchema.partial().optional(),
});

export const CampaignQuerySchema = z.object({
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED']).optional(),
  objective: z.enum(['AWARENESS', 'TRAFFIC', 'CONVERSIONS', 'REVENUE']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type CreateCampaignInput = z.infer<typeof CreateCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof UpdateCampaignSchema>;
export type CreateCreativeInput = z.infer<typeof CreateCreativeInputSchema>;
export type CampaignQuery = z.infer<typeof CampaignQuerySchema>;
