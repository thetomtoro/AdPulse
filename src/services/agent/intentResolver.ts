import type { AgentCreateCampaignInput } from '../../api/schemas/agent.schema.js';
import type { CreateCampaignInput } from '../../api/schemas/campaign.schema.js';

const DOLLARS_TO_CENTS = 100;

const EU_COUNTRIES = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
]);

/**
 * Resolves a high-level AI agent intent into the full campaign configuration
 * that the existing CampaignService.createCampaign() expects.
 */
export function resolveAgentIntent(input: AgentCreateCampaignInput): CreateCampaignInput {
  return {
    name: input.name,
    objective: resolveObjective(input.goal),
    budget: resolveBudget(input),
    schedule: {
      startDate: input.schedule.startDate,
      endDate: input.schedule.endDate,
      timezone: input.schedule.timezone,
    },
    targeting: resolveTargeting(input),
    compliance: resolveCompliance(input),
    creatives: resolveCreatives(input),
  };
}

function resolveObjective(goal: AgentCreateCampaignInput['goal']): 'AWARENESS' | 'TRAFFIC' | 'CONVERSIONS' | 'REVENUE' {
  const map = {
    MAXIMIZE_CONVERSIONS: 'CONVERSIONS' as const,
    MAXIMIZE_CLICKS: 'TRAFFIC' as const,
    MAXIMIZE_REACH: 'AWARENESS' as const,
    TARGET_CPA: 'CONVERSIONS' as const,
  };
  return map[goal];
}

function resolveBudget(input: AgentCreateCampaignInput) {
  const totalBudget = Math.round(input.budget.totalDollars * DOLLARS_TO_CENTS);
  const dailyBudget = Math.round(input.budget.dailyDollars * DOLLARS_TO_CENTS);

  const bidStrategy = resolveBidStrategy(input.goal);

  let maxBidCpm: number;
  if (input.constraints?.maxCpmDollars) {
    maxBidCpm = Math.round(input.constraints.maxCpmDollars * DOLLARS_TO_CENTS);
  } else {
    // Heuristic: default max CPM = daily budget / 100, capped between $1-$15
    maxBidCpm = Math.max(100, Math.min(1500, Math.round(dailyBudget / 100)));
  }

  return {
    totalBudget,
    dailyBudget,
    bidStrategy,
    maxBidCpm,
    pacingType: resolvePacing(input),
  };
}

function resolveBidStrategy(goal: AgentCreateCampaignInput['goal']): 'MANUAL_CPM' | 'TARGET_CPA' | 'MAXIMIZE_CLICKS' | 'MAXIMIZE_CONVERSIONS' {
  const map = {
    MAXIMIZE_CONVERSIONS: 'MAXIMIZE_CONVERSIONS' as const,
    MAXIMIZE_CLICKS: 'MAXIMIZE_CLICKS' as const,
    MAXIMIZE_REACH: 'MANUAL_CPM' as const,
    TARGET_CPA: 'TARGET_CPA' as const,
  };
  return map[goal];
}

function resolvePacing(input: AgentCreateCampaignInput): 'EVEN' | 'ACCELERATED' | 'FRONTLOADED' {
  if (!input.schedule.endDate) return 'EVEN';

  const start = new Date(input.schedule.startDate).getTime();
  const end = new Date(input.schedule.endDate).getTime();
  const durationDays = (end - start) / 86400000;

  if (durationDays < 7) return 'FRONTLOADED';
  if (durationDays > 30) return 'ACCELERATED';
  return 'EVEN';
}

function resolveTargeting(input: AgentCreateCampaignInput) {
  return {
    segments: input.audience.segments.map(s => ({ segmentId: s, matchType: 'INCLUDE' as const })),
    geo: input.audience.geos.map(g => ({ type: 'COUNTRY' as const, value: g, matchType: 'INCLUDE' as const })),
    devices: input.audience.devices,
    dayParting: [] as any[],
    frequencyCap: {
      maxImpressions: input.constraints?.frequencyCap?.maxImpressions ?? 5,
      windowHours: input.constraints?.frequencyCap?.windowHours ?? 24,
      scope: 'CAMPAIGN' as const,
    },
    contextual: input.audience.contextualCategories.map(c => ({ categoryId: c, matchType: 'INCLUDE' as const })),
  };
}

function resolveCompliance(input: AgentCreateCampaignInput) {
  const geos = input.audience.geos;
  const hasUS = geos.includes('US');
  const hasEU = geos.some(g => EU_COUNTRIES.has(g));

  const consentTypes: ('GDPR_TCF' | 'CCPA_USP' | 'CUSTOM')[] = [];
  if (hasUS) consentTypes.push('CCPA_USP');
  if (hasEU) consentTypes.push('GDPR_TCF');

  return {
    requireConsent: consentTypes.length > 0,
    consentTypes,
    dataRetentionDays: hasEU ? 30 : 90,
    restrictedCategories: input.constraints?.brandSafetyLevel === 'STRICT' ? ['IAB25', 'IAB26'] : [],
    brandSafetyLevel: input.constraints?.brandSafetyLevel ?? 'MODERATE',
  };
}

function resolveCreatives(input: AgentCreateCampaignInput) {
  const weight = Math.round(100 / input.creatives.length);
  return input.creatives.map(c => ({
    type: c.type,
    name: c.name,
    content: {
      headline: c.headline,
      body: c.body,
      imageUrl: c.imageUrl,
      clickUrl: c.clickUrl,
    },
    weight,
  }));
}
