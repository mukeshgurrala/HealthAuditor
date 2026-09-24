/**
 * The audit engine: collect context once, run every rule against it, then score,
 * prioritise and package the result.
 */

import { AuditError, collectContext } from "./context";
import { fetchPerformanceData, unmeasuredMetrics } from "./pagespeed";
import { RULES, RULESET_VERSION } from "./registry";
import {
  categoryScore,
  materialiseFinding,
  overallScore,
  ruleWeight,
  scoreLabel,
} from "./scoring";
import {
  AuditContext,
  AuditOptions,
  AuditReport,
  CATEGORIES,
  CATEGORY_DESCRIPTIONS,
  CATEGORY_LABELS,
  Category,
  CategoryReport,
  Finding,
  PassedCheck,
  Severity,
  SkippedCheck,
} from "./types";
import { sumBytes } from "./rules/helpers";

export { AuditError };

const EMPTY_COUNTS = (): Record<Severity, number> => ({ critical: 0, high: 0, medium: 0, low: 0 });

export async function runAudit(url: string, overrides: Partial<AuditOptions> = {}): Promise<AuditReport> {
  const startedAt = Date.now();
  const context = await collectContext(url, overrides);

  /* Stay inside the serverless function budget: only call PageSpeed if there is time left. */
  const elapsed = Date.now() - startedAt;
  if (context.options.usePageSpeed && elapsed < 20_000) {
    context.performance = await fetchPerformanceData(context.finalUrl, context.options.strategy).catch(() => null);
    if (!context.performance) {
      context.collectionNotes.push(
        process.env.PAGESPEED_API_KEY
          ? "Core Web Vitals were unavailable for this URL, so lab metrics are not shown."
          : "Core Web Vitals were not measured: no PageSpeed Insights API key is configured.",
      );
    }
  } else if (context.options.usePageSpeed) {
    context.collectionNotes.push(
      "Core Web Vitals were skipped because collecting the page took most of the time budget for this audit.",
    );
  }

  return buildReport(context, startedAt);
}

/** Runs the rules against an already-built context. Exported so tests can reuse it. */
export async function evaluateRules(context: AuditContext) {
  const findings: Finding[] = [];
  const passed: PassedCheck[] = [];
  const skipped: SkippedCheck[] = [];
  const scoreEntries: Array<{ category: Category; weight: number; passed: boolean }> = [];

  for (const rule of RULES) {
    let outcome;
    try {
      outcome = await rule.check(context);
    } catch (error) {
      skipped.push({
        ruleId: rule.id,
        name: rule.name,
        category: rule.category,
        reason: `The check could not complete (${error instanceof Error ? error.message : "unknown error"}).`,
      });
      continue;
    }

    if (outcome.status === "skip") {
      skipped.push({ ruleId: rule.id, name: rule.name, category: rule.category, reason: outcome.reason });
      continue;
    }
    if (outcome.status === "pass") {
      passed.push({ ruleId: rule.id, name: rule.name, category: rule.category, summary: outcome.summary });
      scoreEntries.push({ category: rule.category, weight: ruleWeight(rule), passed: true });
      continue;
    }

    const ruleFindings = outcome.findings.map((draft) => materialiseFinding(rule, draft, context.finalUrl));
    findings.push(...ruleFindings);
    const worst = ruleFindings.reduce<Severity>((acc, finding) => (severityRank(finding.severity) > severityRank(acc) ? finding.severity : acc), "low");
    scoreEntries.push({ category: rule.category, weight: ruleWeight(rule, worst), passed: false });
  }

  return { findings, passed, skipped, scoreEntries };
}

function severityRank(severity: Severity): number {
  return { low: 1, medium: 2, high: 3, critical: 4 }[severity];
}

/** Turn an already-collected context into a finished report (no network access). */
export function buildReport(context: AuditContext, startedAt: number = Date.now()): Promise<AuditReport> {
  return evaluateRules(context).then((result) => {
    const { findings, passed, skipped, scoreEntries } = result;

    /* Deduplicate for scoring: one underlying problem is only counted once (spec §35). */
    const seenKeys = new Set<string>();
    const dedupedFindings = findings.filter((finding) => {
      if (seenKeys.has(finding.dedupeKey)) return false;
      seenKeys.add(finding.dedupeKey);
      return true;
    });

    const categories: CategoryReport[] = CATEGORIES.map((category) => {
      const entries = scoreEntries.filter((entry) => entry.category === category);
      let score = categoryScore(entries);
      let scoreExplanation =
        entries.length === 0
          ? "No rules in this category applied to this page."
          : `${entries.filter((e) => e.passed).length} of ${entries.length} applicable checks passed, weighted by severity.`;

      /* Performance blends measured Lighthouse data with the static rules when available. */
      if (category === "performance" && context.performance?.lighthouseScore !== null && context.performance?.lighthouseScore !== undefined) {
        const measured = context.performance.lighthouseScore;
        score = Math.round(measured * 0.6 + score * 0.4);
        scoreExplanation = `60% measured Lighthouse performance score (${measured}) + 40% HealthAuditor resource rules.`;
      }

      const categoryFindings = dedupedFindings
        .filter((finding) => finding.category === category)
        .sort((a, b) => b.priority - a.priority);
      const counts = EMPTY_COUNTS();
      categoryFindings.forEach((finding) => {
        counts[finding.severity] += 1;
      });

      return {
        category,
        label: CATEGORY_LABELS[category],
        description: CATEGORY_DESCRIPTIONS[category],
        score,
        scoreExplanation,
        findings: categoryFindings,
        passed: passed.filter((check) => check.category === category),
        skipped: skipped.filter((check) => check.category === category),
        counts,
      };
    });

    const scores = Object.fromEntries(categories.map((c) => [c.category, c.score])) as Record<Category, number>;
    const score = overallScore(scores);

    const ranked = [...dedupedFindings].sort((a, b) => b.priority - a.priority || severityRank(b.severity) - severityRank(a.severity));
    const counts = EMPTY_COUNTS();
    ranked.forEach((finding) => {
      counts[finding.severity] += 1;
    });

    const report: AuditReport = {
      version: RULESET_VERSION,
      finishedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      requestedUrl: context.requestedUrl,
      finalUrl: context.finalUrl,
      statusCode: context.statusCode,
      score,
      scoreLabel: scoreLabel(score),
      categories,
      priorities: ranked.slice(0, 8),
      quickWins: ranked.filter((finding) => finding.quickWin).slice(0, 6),
      findings: ranked,
      summary: {
        totalFindings: ranked.length,
        counts,
        passedChecks: passed.length,
        rulesRun: RULES.length,
      },
      metrics: context.performance?.metrics ?? unmeasuredMetrics(),
      performanceSource: context.performance
        ? `Lighthouse ${context.performance.strategy} run via the PageSpeed Insights API`
        : "Static analysis only — no Core Web Vitals key configured",
      pageStats: {
        htmlBytes: context.htmlBytes,
        requestCount:
          context.images.length + context.scripts.length + context.stylesheets.length + context.fonts.length + context.otherResources.length,
        totalBytes: (() => {
          const resources = sumBytes([...context.images, ...context.scripts, ...context.stylesheets, ...context.fonts]);
          return resources === null ? null : resources + context.htmlBytes;
        })(),
        imageBytes: sumBytes(context.images),
        scriptBytes: sumBytes(context.scripts),
        stylesheetBytes: sumBytes(context.stylesheets),
        ttfbMs: context.ttfbMs,
      },
      images: context.images,
      links: context.links,
      redirectChain: context.redirectChain,
      technologies: context.technologies,
      notes: context.collectionNotes,
    };

    return report;
  });
}
