import { describe, it, expect } from 'vitest';
import { calculateSegmentOverlap, calculateContextMatch } from '../../src/services/bidding/scorer.js';

describe('scorer', () => {
  describe('calculateSegmentOverlap', () => {
    it('returns 0.5 for empty campaign segments', () => {
      expect(calculateSegmentOverlap([], ['seg_a'])).toBe(0.5);
    });

    it('returns 1.0 for full overlap', () => {
      const segments = [
        { segmentId: 'seg_a', matchType: 'INCLUDE' },
        { segmentId: 'seg_b', matchType: 'INCLUDE' },
      ];
      expect(calculateSegmentOverlap(segments, ['seg_a', 'seg_b'])).toBe(1.0);
    });

    it('returns 0.5 for partial overlap', () => {
      const segments = [
        { segmentId: 'seg_a', matchType: 'INCLUDE' },
        { segmentId: 'seg_b', matchType: 'INCLUDE' },
      ];
      expect(calculateSegmentOverlap(segments, ['seg_a'])).toBe(0.5);
    });

    it('returns 0 for no overlap', () => {
      const segments = [{ segmentId: 'seg_a', matchType: 'INCLUDE' }];
      expect(calculateSegmentOverlap(segments, ['seg_x'])).toBe(0);
    });
  });

  describe('calculateContextMatch', () => {
    it('returns 0.5 for empty contextual rules', () => {
      expect(calculateContextMatch([], ['IAB1'])).toBe(0.5);
    });

    it('returns 1.0 for full match', () => {
      const rules = [{ categoryId: 'IAB18', matchType: 'INCLUDE' }];
      expect(calculateContextMatch(rules, ['IAB18'])).toBe(1.0);
    });

    it('returns 0 for no match', () => {
      const rules = [{ categoryId: 'IAB18', matchType: 'INCLUDE' }];
      expect(calculateContextMatch(rules, ['IAB1'])).toBe(0);
    });
  });
});
