/**
 * Scoring and prioritisation.
 *
 * Both algorithms are deliberately simple and fully documented in docs/METHODOLOGY.md so
 * that a user can recompute any number in the report by hand.
 */

import type { AuditRule, Category, Effort, Finding, FindingDraft, Severity } from "./types";

/** Weight a rule contributes to its category score, by severity. */
export const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 10,
  high: 6,
  medium: 3,
  low: 1,
};

/** How much of the overall score each category is worth. Must sum to 1. */
export const CATEGORY_WEIGHT: Record<Category, number> = {
  performance: 0.3,
  seo: 0.2,
  accessibility: 0.2,
  "best-practices": 0.1,
  security: 0.2,
};

/** Impact used by the priority engine. */
export const IMPACT_SCORE: Record<Severity, number> = {
  critical: 10,
  high: 7,
  medium: 4,
  low: 2,
};

/** Effort multiplier: cheap fixes are promoted, expensive ones demoted. */
export const EFFORT_MULTIPLIER: Record<Effort, number> = {
  easy: 1.3,
  medium: 1,
  hard: 0.75,
};

export function ruleWeight(rule: AuditRule, severity: Severity = rule.severity): number {
  return rule.weight ?? SEVERITY_WEIGHT[severity];
}

/**
 * Reach factor from the number of affected elements: 1 occurrence → 1.0, 10 → 1.5,
 * 100 → 2.0, capped at 2. Logarithmic so a page with 200 unlabelled images does not
 * completely dominate the list.
 */
export function reachFactor(occurrences: number): number {
  const safe = Math.max(1, occurrences);
  return Math.min(2, 1 + Math.log10(safe) / 2);
}

export function priorityScore(input: { severity: Severity; effort: Effort; occurrences: number; category: Category }): number {
  const base = IMPACT_SCORE[input.severity] * reachFactor(input.occurrences) * EFFORT_MULTIPLIER[input.effort];
  const categoryBoost = 0.85 + CATEGORY_WEIGHT[input.category]; // 0.95 – 1.15
  return Math.round(base * categoryBoost * 10) / 10;
}

/** Quick win: meaningful impact, little effort, small blast radius. */
export function isQuickWin(finding: { severity: Severity; effort: Effort; priority: number }): boolean {
  return finding.effort === "easy" && finding.severity !== "low" && finding.priority >= 5;
}

/**
 * Category score = 100 × (weight of passing rules ÷ weight of all applicable rules).
 * Skipped rules (not applicable to this page) are excluded from both sides so they can
 * neither help nor hurt. A category with no applicable rules scores 100.
 */
export function categoryScore(entries: Array<{ weight: number; passed: boolean }>): number {
  const possible = entries.reduce((sum, entry) => sum + entry.weight, 0);
  if (!possible) return 100;
  const earned = entries.reduce((sum, entry) => sum + (entry.passed ? entry.weight : 0), 0);
  return Math.round((earned / possible) * 100);
}

/**
 * Overall score = weighted mean of the category scores, renormalised over the categories
 * that actually produced a score.
 */
export function overallScore(scores: Partial<Record<Category, number>>): number {
  const entries = (Object.entries(scores) as Array<[Category, number]>).filter(([, value]) => Number.isFinite(value));
  if (!entries.length) return 0;
  const weight = entries.reduce((sum, [category]) => sum + CATEGORY_WEIGHT[category], 0);
  const total = entries.reduce((sum, [category, value]) => sum + value * CATEGORY_WEIGHT[category], 0);
  return Math.round(total / weight);
}

export function scoreLabel(score: number): "good" | "needs-improvement" | "poor" {
  if (score >= 90) return "good";
  if (score >= 50) return "needs-improvement";
  return "poor";
}

/** Build a complete Finding from a rule and one of its drafts. */
export function materialiseFinding(rule: AuditRule, draft: FindingDraft, pageUrl: string): Finding {
  const severity = draft.severity ?? rule.severity;
  const effort = draft.effort ?? rule.effort;
  const occurrences = draft.occurrences ?? 1;
  const priority = priorityScore({ severity, effort, occurrences, category: rule.category });
  const finding: Finding = {
    ruleId: rule.id,
    name: rule.name,
    category: rule.category,
    severity,
    effort,
    problem: draft.problem,
    whyItMatters: rule.description,
    impact: rule.impact ?? defaultImpact(rule.category, severity),
    howToFix: draft.howToFix ?? rule.recommendation,
    technicalFix: draft.technicalFix,
    url: draft.url ?? pageUrl,
    element: draft.element,
    observed: draft.observed,
    expected: draft.expected,
    occurrences,
    evidence: draft.evidence ?? [],
    technicalDetails: draft.technicalDetails ?? [],
    priority,
    quickWin: false,
    dedupeKey: draft.dedupeKey ?? `${rule.id}:${draft.url ?? pageUrl}`,
    references: rule.references ?? [],
  };
  finding.quickWin = isQuickWin(finding);
  return finding;
}

function defaultImpact(category: Category, severity: Severity): string {
  const strength = severity === "critical" ? "Severe" : severity === "high" ? "Significant" : severity === "medium" ? "Moderate" : "Minor";
  const area: Record<Category, string> = {
    performance: "impact on how fast the page feels to visitors.",
    seo: "impact on how well search engines can find and present this page.",
    accessibility: "impact on people using assistive technology or keyboard navigation.",
    "best-practices": "impact on the robustness and correctness of the page.",
    security: "impact on the security posture of the site.",
  };
  return `${strength} ${area[category]}`;
}
