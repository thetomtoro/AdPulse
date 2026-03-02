import { z } from 'zod';

export const ConsentSignalSchema = z.object({
  type: z.enum(['GDPR_TCF', 'CCPA_USP', 'CUSTOM']),
  granted: z.boolean(),
  raw: z.string().optional(),
});

export const AdRequestUserSchema = z.object({
  id: z.string().optional(),
  segments: z.array(z.string()).default([]),
  geo: z.object({
    country: z.string(),
    region: z.string().optional(),
    city: z.string().optional(),
  }),
  device: z.enum(['DESKTOP', 'MOBILE', 'TABLET', 'CTV']),
  consentSignals: z.array(ConsentSignalSchema).default([]),
});

export const AdRequestContextSchema = z.object({
  pageUrl: z.string().optional(),
  categories: z.array(z.string()).default([]),
  keywords: z.array(z.string()).optional(),
});

export const AdRequestSchema = z.object({
  id: z.string(),
  publisherId: z.string(),
  placementId: z.string(),
  placementType: z.enum(['BANNER', 'NATIVE', 'SPONSORED_LISTING', 'VIDEO']),
  user: AdRequestUserSchema,
  context: AdRequestContextSchema,
  timestamp: z.string().datetime().optional(),
});

export type AdRequestInput = z.infer<typeof AdRequestSchema>;
