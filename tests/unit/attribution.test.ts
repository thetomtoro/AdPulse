import { describe, it, expect } from 'vitest';
import { calculateAttribution, timeDecayAttribution } from '../../src/services/analytics/attribution.js';
import type { Touchpoint, EventType } from '../../src/shared/types.js';

function makeTouchpoints(count: number, hoursApart = 24): Touchpoint[] {
  const base = new Date('2026-03-01T00:00:00Z').getTime();
  return Array.from({ length: count }, (_, i) => ({
    eventId: `evt_${i}`,
    eventType: (i === count - 1 ? 'CLICK' : 'IMPRESSION') as EventType,
    campaignId: `cmp_${i % 2}`,
    creativeId: `crt_${i}`,
    timestamp: new Date(base + i * hoursApart * 3600000),
  }));
}

describe('attribution', () => {
  describe('LAST_CLICK', () => {
    it('gives 100% to last touchpoint', () => {
      const credits = calculateAttribution(makeTouchpoints(3), 'LAST_CLICK', 10000);
      expect(credits).toHaveLength(1);
      expect(credits[0].credit).toBe(1.0);
      expect(credits[0].creativeId).toBe('crt_2'); // last one
    });

    it('handles single touchpoint', () => {
      const credits = calculateAttribution(makeTouchpoints(1), 'LAST_CLICK', 10000);
      expect(credits).toHaveLength(1);
      expect(credits[0].credit).toBe(1.0);
    });
  });

  describe('FIRST_CLICK', () => {
    it('gives 100% to first touchpoint', () => {
      const credits = calculateAttribution(makeTouchpoints(3), 'FIRST_CLICK', 10000);
      expect(credits).toHaveLength(1);
      expect(credits[0].credit).toBe(1.0);
      expect(credits[0].creativeId).toBe('crt_0');
    });
  });

  describe('LINEAR', () => {
    it('distributes equally across touchpoints', () => {
      const credits = calculateAttribution(makeTouchpoints(4), 'LINEAR', 10000);
      expect(credits).toHaveLength(4);
      for (const c of credits) {
        expect(c.credit).toBe(0.25);
      }
    });

    it('handles single touchpoint', () => {
      const credits = calculateAttribution(makeTouchpoints(1), 'LINEAR', 10000);
      expect(credits).toHaveLength(1);
      expect(credits[0].credit).toBe(1.0);
    });

    it('credits sum to ~1.0', () => {
      const credits = calculateAttribution(makeTouchpoints(3), 'LINEAR', 10000);
      const total = credits.reduce((sum, c) => sum + c.credit, 0);
      expect(total).toBeCloseTo(1.0, 2);
    });
  });

  describe('TIME_DECAY', () => {
    it('gives more credit to recent touchpoints', () => {
      const touchpoints = makeTouchpoints(3, 168); // 7 days apart (= halfLife)
      const credits = calculateAttribution(touchpoints, 'TIME_DECAY', 10000);
      expect(credits).toHaveLength(3);

      // Last touchpoint should have highest credit
      expect(credits[2].credit).toBeGreaterThan(credits[1].credit);
      expect(credits[1].credit).toBeGreaterThan(credits[0].credit);
    });

    it('credits sum to ~1.0', () => {
      const credits = calculateAttribution(makeTouchpoints(5, 48), 'TIME_DECAY', 10000);
      const total = credits.reduce((sum, c) => sum + c.credit, 0);
      expect(total).toBeCloseTo(1.0, 2);
    });
  });

  describe('POSITION_BASED', () => {
    it('gives 40/20/40 for 3+ touchpoints', () => {
      const credits = calculateAttribution(makeTouchpoints(5), 'POSITION_BASED', 10000);
      expect(credits).toHaveLength(5);
      expect(credits[0].credit).toBe(0.4);  // first
      expect(credits[4].credit).toBe(0.4);  // last
      // Middle 3 share 20%
      const middleCredit = 0.2 / 3;
      expect(credits[1].credit).toBeCloseTo(middleCredit, 3);
      expect(credits[2].credit).toBeCloseTo(middleCredit, 3);
      expect(credits[3].credit).toBeCloseTo(middleCredit, 3);
    });

    it('gives 50/50 for 2 touchpoints', () => {
      const credits = calculateAttribution(makeTouchpoints(2), 'POSITION_BASED', 10000);
      expect(credits).toHaveLength(2);
      expect(credits[0].credit).toBe(0.5);
      expect(credits[1].credit).toBe(0.5);
    });

    it('gives 100% for 1 touchpoint', () => {
      const credits = calculateAttribution(makeTouchpoints(1), 'POSITION_BASED', 10000);
      expect(credits).toHaveLength(1);
      expect(credits[0].credit).toBe(1.0);
    });

    it('credits sum to ~1.0', () => {
      const credits = calculateAttribution(makeTouchpoints(7), 'POSITION_BASED', 10000);
      const total = credits.reduce((sum, c) => sum + c.credit, 0);
      expect(total).toBeCloseTo(1.0, 2);
    });
  });
});
