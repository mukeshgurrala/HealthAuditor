import type { AuditRule, Category } from "./types";
import { accessibilityRules } from "./rules/accessibility";
import { bestPracticeRules } from "./rules/best-practices";
import { performanceRules } from "./rules/performance";
import { securityRules } from "./rules/security";
import { seoRules } from "./rules/seo";

/**
 * The rule registry.
 *
 * Adding a check means writing a rule object in `rules/<category>.ts` and adding it to the
 * relevant array — nothing in the engine, the API or the UI has to change.
 */
export const RULES: AuditRule[] = [
  ...performanceRules,
  ...seoRules,
  ...accessibilityRules,
  ...bestPracticeRules,
  ...securityRules,
];

/** Rule-set version. Bump the minor part whenever rules are added or thresholds change. */
export const RULESET_VERSION = "0.2.0";

export function rulesByCategory(category: Category): AuditRule[] {
  return RULES.filter((rule) => rule.category === category);
}

export function getRule(id: string): AuditRule | undefined {
  return RULES.find((rule) => rule.id === id);
}

/** Fails fast in development if two rules claim the same ID (spec §21). */
export function assertUniqueRuleIds(rules: AuditRule[] = RULES): void {
  const seen = new Set<string>();
  for (const rule of rules) {
    if (seen.has(rule.id)) throw new Error(`Duplicate rule ID: ${rule.id}`);
    seen.add(rule.id);
  }
}

assertUniqueRuleIds();
