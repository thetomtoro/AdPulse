import { describe, it, expect } from 'vitest';
import { calculatePaceMultiplier } from '../../src/services/bidding/budgetPacer.js';

describe('budgetPacer', () => {
  const dailyBudget = 240000; // $2400 in cents

  describe('EVEN pacing', () => {
    it('returns 1.0 when spending at ideal rate', () => {
      // 12 hours in, spent half the budget = ideal rate
      const result = calculatePaceMultiplier(120000, dailyBudget, 'EVEN', 12);
      expect(result).toBe(1.0);
    });

    it('boosts when underspending', () => {
      // 12 hours in, spent much less than half
      const result = calculatePaceMultiplier(50000, dailyBudget, 'EVEN', 12);
      expect(result).toBe(1.3);
    });

    it('throttles when overspending', () => {
      // 12 hours in, spent much more than half
      const result = calculatePaceMultiplier(200000, dailyBudget, 'EVEN', 12);
      expect(result).toBe(0.7);
    });

    it('returns 0 when budget exhausted', () => {
      const result = calculatePaceMultiplier(240000, dailyBudget, 'EVEN', 12);
      expect(result).toBe(0);
    });
  });

  describe('ACCELERATED pacing', () => {
    it('returns positive multiplier when budget remains', () => {
      const result = calculatePaceMultiplier(0, dailyBudget, 'ACCELERATED', 1);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(1.5);
    });

    it('returns 0 when budget exhausted', () => {
      const result = calculatePaceMultiplier(dailyBudget, dailyBudget, 'ACCELERATED', 12);
      expect(result).toBe(0);
    });
  });

  describe('FRONTLOADED pacing', () => {
    it('boosts in first half when underspending', () => {
      // 3 hours in, spent very little
      const result = calculatePaceMultiplier(5000, dailyBudget, 'FRONTLOADED', 3);
      expect(result).toBe(1.3);
    });

    it('throttles in first half when overspending', () => {
      // 3 hours in, already spent a lot of the first-half budget
      const result = calculatePaceMultiplier(130000, dailyBudget, 'FRONTLOADED', 3);
      expect(result).toBe(0.7);
    });
  });
});
