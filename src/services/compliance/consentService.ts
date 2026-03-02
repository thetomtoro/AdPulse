import type { AdRequest, Campaign, ConsentResult } from '../../shared/types.js';

/**
 * Evaluates consent requirements for a campaign against the user's consent signals.
 * This is the privacy gate that runs before any user data processing.
 */
export function evaluateConsent(
  request: AdRequest,
  campaign: Campaign,
): ConsentResult {
  if (!campaign.compliance.requireConsent) {
    return { allowed: true, dataScope: 'FULL' };
  }

  for (const requiredType of campaign.compliance.consentTypes) {
    const signal = request.user.consentSignals.find(s => s.type === requiredType);

    if (!signal || !signal.granted) {
      // No consent — can still serve contextual ads, but no user-level targeting
      return {
        allowed: true,
        dataScope: 'CONTEXTUAL_ONLY',
        restrictions: [
          'NO_USER_SEGMENTS',
          'NO_FREQUENCY_CAP',
          'NO_USER_LEVEL_ATTRIBUTION',
          'NO_USER_ID_STORAGE',
        ],
      };
    }
  }

  return { allowed: true, dataScope: 'FULL' };
}

/**
 * Strips user-level data from an ad request when consent is contextual-only.
 */
export function stripUserData(request: AdRequest): AdRequest {
  return {
    ...request,
    user: {
      ...request.user,
      id: undefined,
      segments: [],
      consentSignals: request.user.consentSignals,
    },
  };
}
