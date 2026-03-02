import type { CreateCampaignInput } from '../../api/schemas/campaign.schema.js';
import { ValidationError } from '../../shared/errors.js';

/**
 * Business rule validation beyond what Zod schemas enforce.
 * These rules require cross-field logic.
 */
export function validateCampaignBusiness(input: CreateCampaignInput): void {
  const errors: Record<string, string[]> = {};

  // Budget: daily budget must not exceed total budget
  if (input.budget.dailyBudget > input.budget.totalBudget) {
    errors.budget = errors.budget ?? [];
    errors.budget.push('dailyBudget cannot exceed totalBudget');
  }

  // Schedule: endDate must be after startDate
  if (input.schedule.endDate) {
    const start = new Date(input.schedule.startDate);
    const end = new Date(input.schedule.endDate);
    if (end <= start) {
      errors.schedule = errors.schedule ?? [];
      errors.schedule.push('endDate must be after startDate');
    }
  }

  // Day parting: startHour must differ from endHour
  for (const dp of input.targeting.dayParting) {
    if (dp.startHour === dp.endHour) {
      errors.targeting = errors.targeting ?? [];
      errors.targeting.push('dayParting startHour and endHour must differ');
      break;
    }
  }

  // Compliance: if requireConsent, must have at least one consent type
  if (input.compliance.requireConsent && input.compliance.consentTypes.length === 0) {
    errors.compliance = errors.compliance ?? [];
    errors.compliance.push('consentTypes must not be empty when requireConsent is true');
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Campaign validation failed', errors);
  }
}
