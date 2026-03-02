import type { Campaign, AdRequest, CreativeType } from '../../shared/types.js';
import type { ICacheProvider } from '../../infra/interfaces.js';

export interface EligibilityResult {
  eligible: Campaign[];
  filtered: Map<string, number>; // reason -> count
}

export async function filterEligibleCampaigns(
  campaigns: Campaign[],
  request: AdRequest,
  cache: ICacheProvider,
): Promise<EligibilityResult> {
  const filtered = new Map<string, number>();
  const eligible: Campaign[] = [];

  const addFilter = (reason: string) => {
    filtered.set(reason, (filtered.get(reason) ?? 0) + 1);
  };

  for (const campaign of campaigns) {
    // 1. Status check
    if (campaign.status !== 'ACTIVE') {
      addFilter('status_not_active');
      continue;
    }

    // 2. Schedule check
    const now = new Date();
    if (now < campaign.schedule.startDate) {
      addFilter('not_started');
      continue;
    }
    if (campaign.schedule.endDate && now > campaign.schedule.endDate) {
      addFilter('ended');
      continue;
    }

    // 3. Day parting check
    if (!passesDayParting(campaign, now)) {
      addFilter('outside_daypart');
      continue;
    }

    // 4. Budget remaining check
    const totalSpend = await cache.getNumber(`budget:${campaign.id}:total:spend`);
    if (totalSpend >= campaign.budget.totalBudget) {
      addFilter('budget_exhausted');
      continue;
    }

    const dailySpend = await cache.getNumber(`budget:${campaign.id}:daily:spend`);
    if (dailySpend >= campaign.budget.dailyBudget) {
      addFilter('daily_budget_exhausted');
      continue;
    }

    // 5. Geo targeting check
    if (!passesGeoTargeting(campaign, request)) {
      addFilter('geo_mismatch');
      continue;
    }

    // 6. Device targeting check
    if (!campaign.targeting.devices.includes(request.user.device)) {
      addFilter('device_mismatch');
      continue;
    }

    // 7. Contextual targeting check
    if (!passesContextualTargeting(campaign, request)) {
      addFilter('contextual_mismatch');
      continue;
    }

    eligible.push(campaign);
  }

  return { eligible, filtered };
}

function passesDayParting(campaign: Campaign, now: Date): boolean {
  if (campaign.targeting.dayParting.length === 0) return true;

  return campaign.targeting.dayParting.some(rule => {
    const day = now.getDay();
    if (!rule.daysOfWeek.includes(day)) return false;

    const hour = now.getHours();
    if (rule.startHour < rule.endHour) {
      return hour >= rule.startHour && hour < rule.endHour;
    }
    // Wraps midnight (e.g., 22 to 6)
    return hour >= rule.startHour || hour < rule.endHour;
  });
}

function passesGeoTargeting(campaign: Campaign, request: AdRequest): boolean {
  if (campaign.targeting.geo.length === 0) return true;

  const includes = campaign.targeting.geo.filter(g => g.matchType === 'INCLUDE');
  const excludes = campaign.targeting.geo.filter(g => g.matchType === 'EXCLUDE');

  // Check excludes first
  for (const ex of excludes) {
    if (matchesGeo(ex, request.user.geo)) return false;
  }

  // If no includes, everything not excluded is allowed
  if (includes.length === 0) return true;

  // Must match at least one include
  return includes.some(inc => matchesGeo(inc, request.user.geo));
}

function matchesGeo(
  target: { type: string; value: string },
  geo: { country: string; region?: string; city?: string },
): boolean {
  switch (target.type) {
    case 'COUNTRY':
      return geo.country === target.value;
    case 'REGION':
      return geo.region === target.value;
    case 'CITY':
      return geo.city === target.value;
    default:
      return false;
  }
}

function passesContextualTargeting(campaign: Campaign, request: AdRequest): boolean {
  if (campaign.targeting.contextual.length === 0) return true;

  const includes = campaign.targeting.contextual.filter(c => c.matchType === 'INCLUDE');
  const excludes = campaign.targeting.contextual.filter(c => c.matchType === 'EXCLUDE');

  // Check excludes
  for (const ex of excludes) {
    if (request.context.categories.includes(ex.categoryId)) return false;
  }

  if (includes.length === 0) return true;
  return includes.some(inc => request.context.categories.includes(inc.categoryId));
}
