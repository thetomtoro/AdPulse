interface BrandSafetyCheck {
  level: 'STRICT' | 'MODERATE' | 'PERMISSIVE';
  blockedCategories: string[];
  pageCategories: string[];
}

const RISKY_CATEGORIES: Record<string, string[]> = {
  STRICT: ['IAB25', 'IAB26', 'IAB7-39', 'IAB7-44', 'IAB14-1'],
  MODERATE: ['IAB25', 'IAB26'],
  PERMISSIVE: [],
};

/**
 * Check if page content is brand-safe for the campaign's requirements.
 * Returns false if the page should be blocked.
 */
export function checkBrandSafety(check: BrandSafetyCheck): boolean {
  // Explicit category blocks always apply
  const hasBlockedCategory = check.pageCategories.some(cat =>
    check.blockedCategories.includes(cat),
  );
  if (hasBlockedCategory) return false;

  // Level-based filtering
  const blocked = RISKY_CATEGORIES[check.level] ?? [];
  return !check.pageCategories.some(cat => blocked.includes(cat));
}
