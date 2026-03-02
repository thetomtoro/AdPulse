import type { PacingType } from '../../shared/types.js';

/**
 * Calculate the bid pacing multiplier based on current spend rate vs ideal rate.
 * Returns a multiplier to apply to the base bid:
 *   > 1.0 = bid more aggressively (underspending)
 *   < 1.0 = bid less aggressively (overspending)
 *   0     = stop bidding (budget exhausted)
 */
export function calculatePaceMultiplier(
  currentSpend: number,
  dailyBudget: number,
  pacingType: PacingType | string,
  hoursElapsed: number,
): number {
  const hoursRemaining = 24 - hoursElapsed;
  const budgetRemaining = dailyBudget - currentSpend;

  if (budgetRemaining <= 0) return 0;

  const idealSpendRate = dailyBudget / 24;
  const actualSpendRate = currentSpend / Math.max(hoursElapsed, 0.1);

  switch (pacingType) {
    case 'EVEN': {
      const ratio = actualSpendRate / idealSpendRate;
      if (ratio < 0.8) return 1.3;  // Underspending — boost
      if (ratio > 1.2) return 0.7;  // Overspending — throttle
      return 1.0;
    }

    case 'ACCELERATED': {
      if (budgetRemaining <= 0) return 0;
      return Math.min(1.5, budgetRemaining / (idealSpendRate * hoursRemaining));
    }

    case 'FRONTLOADED': {
      const isFirstHalf = hoursElapsed < 12;
      const halfBudget = isFirstHalf ? dailyBudget * 0.6 : dailyBudget * 0.4;
      const halfElapsed = isFirstHalf ? hoursElapsed : hoursElapsed - 12;
      const halfRate = halfBudget / 12;
      const ratio = (currentSpend / Math.max(halfElapsed, 0.1)) / halfRate;
      if (ratio < 0.8) return 1.3;
      if (ratio > 1.2) return 0.7;
      return 1.0;
    }

    default:
      return 1.0;
  }
}
