import type { Campaign, AdRequest, ScoringDetail } from '../../shared/types.js';
import type { ICacheProvider } from '../../infra/interfaces.js';
import { calculatePaceMultiplier } from './budgetPacer.js';

export async function scoreCampaign(
  campaign: Campaign,
  request: AdRequest,
  cache: ICacheProvider,
): Promise<ScoringDetail> {
  const base = campaign.budget.maxBidCpm;

  // Relevance: segment overlap + context match
  const segmentOverlap = calculateSegmentOverlap(
    campaign.targeting.segments,
    request.user.segments,
  );
  const contextMatch = calculateContextMatch(
    campaign.targeting.contextual,
    request.context.categories,
  );
  const relevanceMultiplier = Math.max(0.1, 0.6 * segmentOverlap + 0.4 * contextMatch);

  // Budget pacing multiplier
  const currentSpend = await cache.getNumber(`budget:${campaign.id}:daily:spend`);
  const now = new Date();
  const hoursElapsed = now.getHours() + now.getMinutes() / 60;
  const budgetMultiplier = calculatePaceMultiplier(
    currentSpend,
    campaign.budget.dailyBudget,
    campaign.budget.pacingType,
    hoursElapsed,
  );

  // Recency: penalize if user was recently shown this campaign
  let recencyMultiplier = 1.0;
  if (request.user.id) {
    const lastSeenStr = await cache.get(`last_imp:${request.user.id}:${campaign.id}`);
    if (lastSeenStr) {
      const lastSeen = parseInt(lastSeenStr, 10);
      const hoursSinceLastSeen = (Date.now() - lastSeen) / 3600000;
      recencyMultiplier = Math.min(1.0, hoursSinceLastSeen / 4);
    }
  }

  // AI agent bid multiplier (from optimization feedback loop)
  const agentMultiplierStr = await cache.get(`agent:bid_multiplier:${campaign.id}`);
  const agentMultiplier = agentMultiplierStr ? parseFloat(agentMultiplierStr) : 1.0;

  const finalScore = base * relevanceMultiplier * budgetMultiplier * recencyMultiplier * agentMultiplier;

  return {
    campaignId: campaign.id,
    baseScore: base,
    budgetMultiplier,
    relevanceMultiplier,
    finalScore,
    eligible: finalScore > 0,
    filterReason: finalScore <= 0 ? 'score_too_low' : undefined,
  };
}

export function calculateSegmentOverlap(
  campaignSegments: { segmentId: string; matchType: string }[],
  userSegments: string[],
): number {
  if (campaignSegments.length === 0) return 0.5; // neutral if no segment targeting

  const includes = campaignSegments
    .filter(s => s.matchType === 'INCLUDE')
    .map(s => s.segmentId);

  if (includes.length === 0) return 0.5;

  const matchCount = includes.filter(s => userSegments.includes(s)).length;
  return matchCount / includes.length;
}

export function calculateContextMatch(
  contextualRules: { categoryId: string; matchType: string }[],
  pageCategories: string[],
): number {
  if (contextualRules.length === 0) return 0.5; // neutral

  const includes = contextualRules
    .filter(r => r.matchType === 'INCLUDE')
    .map(r => r.categoryId);

  if (includes.length === 0) return 0.5;

  const matchCount = includes.filter(c => pageCategories.includes(c)).length;
  return matchCount / includes.length;
}
