import type { Creative } from '../../shared/types.js';

/**
 * Select a creative using weighted random selection.
 * Creatives with higher weights are more likely to be chosen.
 */
export function selectCreative(creatives: Creative[]): Creative {
  if (creatives.length === 0) {
    throw new Error('No creatives available for selection');
  }
  if (creatives.length === 1) return creatives[0];

  const totalWeight = creatives.reduce((sum, c) => sum + c.weight, 0);
  let random = Math.random() * totalWeight;

  for (const creative of creatives) {
    random -= creative.weight;
    if (random <= 0) return creative;
  }

  // Fallback (shouldn't reach here)
  return creatives[creatives.length - 1];
}
