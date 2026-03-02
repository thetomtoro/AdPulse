import { describe, it, expect } from 'vitest';
import { validateCampaignBusiness } from '../../src/services/campaign/campaignValidator.js';
import { ValidationError } from '../../src/shared/errors.js';

function validInput() {
  return {
    name: 'Test',
    objective: 'AWARENESS' as const,
    budget: {
      totalBudget: 5000000,
      dailyBudget: 500000,
      bidStrategy: 'MANUAL_CPM' as const,
      maxBidCpm: 850,
      pacingType: 'EVEN' as const,
    },
    schedule: {
      startDate: '2026-04-01T00:00:00Z',
      endDate: '2026-05-01T00:00:00Z',
      timezone: 'America/New_York',
    },
    targeting: {
      segments: [],
      geo: [{ type: 'COUNTRY' as const, value: 'US', matchType: 'INCLUDE' as const }],
      devices: ['DESKTOP' as const],
      dayParting: [],
      frequencyCap: { maxImpressions: 5, windowHours: 24, scope: 'CAMPAIGN' as const },
      contextual: [],
    },
    compliance: {
      requireConsent: false,
      consentTypes: [],
      dataRetentionDays: 90,
      restrictedCategories: [],
      brandSafetyLevel: 'MODERATE' as const,
    },
    creatives: [
      {
        type: 'NATIVE' as const,
        name: 'Test',
        content: { clickUrl: 'https://example.com' },
        weight: 100,
        metadata: {},
      },
    ],
  };
}

describe('campaignValidator', () => {
  it('passes for valid input', () => {
    expect(() => validateCampaignBusiness(validInput())).not.toThrow();
  });

  it('rejects dailyBudget > totalBudget', () => {
    const input = validInput();
    input.budget.dailyBudget = 9000000;
    expect(() => validateCampaignBusiness(input)).toThrow(ValidationError);
  });

  it('rejects endDate before startDate', () => {
    const input = validInput();
    input.schedule.endDate = '2025-01-01T00:00:00Z';
    expect(() => validateCampaignBusiness(input)).toThrow(ValidationError);
  });

  it('rejects requireConsent without consentTypes', () => {
    const input = validInput();
    input.compliance.requireConsent = true;
    input.compliance.consentTypes = [];
    expect(() => validateCampaignBusiness(input)).toThrow(ValidationError);
  });

  it('rejects dayParting with same start/end hour', () => {
    const input = validInput();
    input.targeting.dayParting = [
      { daysOfWeek: [1], startHour: 9, endHour: 9, timezone: 'UTC' },
    ];
    expect(() => validateCampaignBusiness(input)).toThrow(ValidationError);
  });
});
