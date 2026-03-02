import { describe, it, expect } from 'vitest';
import { resolveAgentIntent } from '../../src/services/agent/intentResolver.js';

const baseInput = {
  name: 'Test Campaign',
  goal: 'MAXIMIZE_CONVERSIONS' as const,
  budget: { totalDollars: 500, dailyDollars: 50 },
  schedule: {
    startDate: '2026-03-01T00:00:00Z',
    endDate: '2026-04-01T00:00:00Z',
    timezone: 'America/New_York',
  },
  audience: {
    segments: ['seg_fashion'],
    geos: ['US'],
    devices: ['MOBILE' as const, 'DESKTOP' as const],
    contextualCategories: ['IAB18'],
  },
  creatives: [{
    type: 'NATIVE' as const,
    name: 'Hero Creative',
    headline: 'Shop Now',
    body: 'Best deals',
    clickUrl: 'https://example.com',
  }],
  constraints: {
    maxCpmDollars: 8,
    brandSafetyLevel: 'MODERATE' as const,
  },
};

describe('resolveAgentIntent', () => {
  it('maps MAXIMIZE_CONVERSIONS to CONVERSIONS objective', () => {
    const result = resolveAgentIntent(baseInput);
    expect(result.objective).toBe('CONVERSIONS');
    expect(result.budget.bidStrategy).toBe('MAXIMIZE_CONVERSIONS');
  });

  it('maps MAXIMIZE_CLICKS to TRAFFIC objective', () => {
    const result = resolveAgentIntent({ ...baseInput, goal: 'MAXIMIZE_CLICKS' });
    expect(result.objective).toBe('TRAFFIC');
    expect(result.budget.bidStrategy).toBe('MAXIMIZE_CLICKS');
  });

  it('maps MAXIMIZE_REACH to AWARENESS objective', () => {
    const result = resolveAgentIntent({ ...baseInput, goal: 'MAXIMIZE_REACH' });
    expect(result.objective).toBe('AWARENESS');
    expect(result.budget.bidStrategy).toBe('MANUAL_CPM');
  });

  it('maps TARGET_CPA to CONVERSIONS objective', () => {
    const result = resolveAgentIntent({ ...baseInput, goal: 'TARGET_CPA' });
    expect(result.objective).toBe('CONVERSIONS');
    expect(result.budget.bidStrategy).toBe('TARGET_CPA');
  });

  it('converts dollars to cents', () => {
    const result = resolveAgentIntent(baseInput);
    expect(result.budget.totalBudget).toBe(50000);
    expect(result.budget.dailyBudget).toBe(5000);
    expect(result.budget.maxBidCpm).toBe(800); // $8 -> 800 cents
  });

  it('uses FRONTLOADED pacing for short campaigns (<7 days)', () => {
    const input = {
      ...baseInput,
      schedule: { ...baseInput.schedule, endDate: '2026-03-05T00:00:00Z' },
    };
    const result = resolveAgentIntent(input);
    expect(result.budget.pacingType).toBe('FRONTLOADED');
  });

  it('uses EVEN pacing for medium campaigns (7-30 days)', () => {
    const input = {
      ...baseInput,
      schedule: { ...baseInput.schedule, endDate: '2026-03-20T00:00:00Z' },
    };
    const result = resolveAgentIntent(input);
    expect(result.budget.pacingType).toBe('EVEN');
  });

  it('uses ACCELERATED pacing for long campaigns (>30 days)', () => {
    const input = {
      ...baseInput,
      schedule: { ...baseInput.schedule, endDate: '2026-06-01T00:00:00Z' },
    };
    const result = resolveAgentIntent(input);
    expect(result.budget.pacingType).toBe('ACCELERATED');
  });

  it('converts geo codes to targeting rules with INCLUDE matchType', () => {
    const input = { ...baseInput, audience: { ...baseInput.audience, geos: ['US', 'CA'] } };
    const result = resolveAgentIntent(input);
    expect(result.targeting.geo).toEqual([
      { type: 'COUNTRY', value: 'US', matchType: 'INCLUDE' },
      { type: 'COUNTRY', value: 'CA', matchType: 'INCLUDE' },
    ]);
  });

  it('sets CCPA consent for US targeting', () => {
    const result = resolveAgentIntent(baseInput);
    expect(result.compliance.requireConsent).toBe(true);
    expect(result.compliance.consentTypes).toContain('CCPA_USP');
  });

  it('sets GDPR consent for EU targeting', () => {
    const input = { ...baseInput, audience: { ...baseInput.audience, geos: ['DE'] } };
    const result = resolveAgentIntent(input);
    expect(result.compliance.requireConsent).toBe(true);
    expect(result.compliance.consentTypes).toContain('GDPR_TCF');
    expect(result.compliance.dataRetentionDays).toBe(30);
  });

  it('sets no consent requirement for non-US/EU geos', () => {
    const input = { ...baseInput, audience: { ...baseInput.audience, geos: ['JP'] } };
    const result = resolveAgentIntent(input);
    expect(result.compliance.requireConsent).toBe(false);
  });

  it('distributes creative weights evenly', () => {
    const input = {
      ...baseInput,
      creatives: [
        { type: 'NATIVE' as const, name: 'A', clickUrl: 'https://a.com' },
        { type: 'NATIVE' as const, name: 'B', clickUrl: 'https://b.com' },
      ],
    };
    const result = resolveAgentIntent(input);
    expect(result.creatives[0].weight).toBe(50);
    expect(result.creatives[1].weight).toBe(50);
  });
});
