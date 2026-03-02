import { z } from 'zod';

// POST /v1/agent/campaigns — Declarative campaign creation
export const AgentCreateCampaignSchema = z.object({
  name: z.string().min(1).max(255),

  // High-level goal — system resolves to bidStrategy + objective
  goal: z.enum(['MAXIMIZE_CONVERSIONS', 'MAXIMIZE_CLICKS', 'MAXIMIZE_REACH', 'TARGET_CPA']),

  // Budget in DOLLARS — system converts to cents
  budget: z.object({
    totalDollars: z.number().positive().describe('Total campaign budget in dollars'),
    dailyDollars: z.number().positive().describe('Daily budget cap in dollars'),
    targetCpaDollars: z.number().positive().optional().describe('Target CPA in dollars (required for TARGET_CPA goal)'),
  }),

  schedule: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime().optional(),
    timezone: z.string().default('America/New_York'),
  }),

  // Simplified audience — flat arrays instead of nested match rules
  audience: z.object({
    segments: z.array(z.string()).default([]),
    geos: z.array(z.string()).min(1).describe('Country codes (e.g. ["US", "CA"])'),
    devices: z.array(z.enum(['DESKTOP', 'MOBILE', 'TABLET', 'CTV'])).default(['DESKTOP', 'MOBILE']),
    contextualCategories: z.array(z.string()).default([]).describe('IAB category IDs'),
  }),

  // Creatives — flattened content fields
  creatives: z.array(z.object({
    type: z.enum(['BANNER', 'NATIVE', 'SPONSORED_LISTING', 'VIDEO']),
    name: z.string().min(1).max(255),
    headline: z.string().optional(),
    body: z.string().optional(),
    imageUrl: z.string().url().optional(),
    clickUrl: z.string().url(),
  })).min(1),

  // Optional constraints / guardrails
  constraints: z.object({
    maxCpmDollars: z.number().positive().optional().describe('Maximum CPM bid in dollars'),
    brandSafetyLevel: z.enum(['STRICT', 'MODERATE', 'PERMISSIVE']).default('MODERATE'),
    frequencyCap: z.object({
      maxImpressions: z.number().int().positive().default(5),
      windowHours: z.number().int().positive().default(24),
    }).optional(),
  }).default({}),
});

// POST /v1/agent/campaigns/:id/optimize
export const AgentOptimizeSchema = z.object({
  action: z.enum(['ADJUST_BID', 'PAUSE_CREATIVE', 'RESUME_CREATIVE', 'SHIFT_BUDGET', 'UPDATE_TARGETING']),
  bidMultiplier: z.number().min(0.1).max(5.0).optional(),
  creativeId: z.string().optional(),
  newDailyDollars: z.number().positive().optional(),
  addSegments: z.array(z.string()).optional(),
  removeSegments: z.array(z.string()).optional(),
  reason: z.string().max(500).optional(),
});

export type AgentCreateCampaignInput = z.infer<typeof AgentCreateCampaignSchema>;
export type AgentOptimizeInput = z.infer<typeof AgentOptimizeSchema>;
