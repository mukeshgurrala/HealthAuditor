/**
 * Rule testing framework (spec §25).
 *
 * Each rule is executed against two fixtures: a deliberately broken page that must FAIL it
 * and a well-built page that must PASS (or be skipped, when the rule does not apply).
 * Run with `npm test`.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { buildStaticContext } from "../src/lib/audit/context";
import { buildReport } from "../src/lib/audit/engine";
import { RULES, assertUniqueRuleIds, getRule } from "../src/lib/audit/registry";
import { categoryScore, isQuickWin, overallScore, priorityScore, reachFactor } from "../src/lib/audit/scoring";
import type { AuditContext, RuleOutcome } from "../src/lib/audit/types";

const fixture = (name: string) => readFileSync(join(import.meta.dirname, "fixtures", name), "utf8");

const badContext = (): AuditContext =>
  buildStaticContext({
    url: "http://bad.example.com/landing",
    html: fixture("bad-page.html"),
    headers: { "content-type": "text/html", server: "nginx/1.18.0", "x-powered-by": "PHP/7.4.3" },
    redirectChain: [
      { url: "http://bad.example.com", status: 301, location: "http://bad.example.com/l" },
      { url: "http://bad.example.com/l", status: 302, location: "http://bad.example.com/landing" },
    ],
  });

const goodContext = (): AuditContext => {
  const context = buildStaticContext({
    url: "https://good.example.com/",
    html: fixture("good-page.html"),
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-encoding": "br",
      "strict-transport-security": "max-age=31536000; includeSubDomains",
      "content-security-policy": "default-src 'self'; frame-ancestors 'self'",
      "x-content-type-options": "nosniff",
      "referrer-policy": "strict-origin-when-cross-origin",
      "permissions-policy": "camera=(), microphone=()",
    },
  });
  context.robots = {
    found: true,
    url: "https://good.example.com/robots.txt",
    status: 200,
    sitemaps: ["https://good.example.com/sitemap.xml"],
    disallowsEverything: false,
    content: "User-agent: *\nAllow: /\nSitemap: https://good.example.com/sitemap.xml",
  };
  context.sitemap = { found: true, url: "https://good.example.com/sitemap.xml", status: 200, urlCount: 24, isIndex: false };
  context.images = context.images.map((image) => ({
    ...image,
    bytes: 48_000,
    status: 200,
    contentType: "image/webp",
    cacheControl: "public, max-age=31536000, immutable",
    unverified: false,
    format: "WEBP",
    intrinsicWidth: 800,
    intrinsicHeight: 600,
  }));
  context.scripts = context.scripts.map((script) => ({
    ...script,
    bytes: 90_000,
    status: 200,
    cacheControl: "public, max-age=31536000, immutable",
    unverified: false,
  }));
  context.stylesheets = context.stylesheets.map((sheet) => ({
    ...sheet,
    bytes: 20_000,
    status: 200,
    cacheControl: "public, max-age=31536000, immutable",
    unverified: false,
  }));
  context.links = context.links.map((link) => ({ ...link, status: 200, unverified: false }));
  context.ttfbMs = 180;
  return context;
};

const run = async (id: string, context: AuditContext): Promise<RuleOutcome> => {
  const rule = getRule(id);
  assert.ok(rule, `rule ${id} is registered`);
  return rule.check(context);
};

/** Rules expected to FAIL on the broken fixture. */
const MUST_FAIL_ON_BAD = [
  "SEO-001", "SEO-002", "SEO-003", "SEO-004", "SEO-005", "SEO-006", "SEO-009", "SEO-010", "SEO-011", "SEO-012", "SEO-014", "SEO-015",
  "A11Y-001", "A11Y-002", "A11Y-003", "A11Y-004", "A11Y-005", "A11Y-006", "A11Y-008", "A11Y-009", "A11Y-010", "A11Y-011",
  "PERF-001", "PERF-IMG-003", "PERF-007",
  "BP-001", "BP-002", "BP-005", "BP-006",
  "SEC-001", "SEC-004", "SEC-005", "SEC-006", "SEC-009", "SEC-011", "SEC-012", "SEC-003", "SEC-008",
];

/** Rules that must NOT fail on the well-built fixture. */
const MUST_NOT_FAIL_ON_GOOD = [
  "SEO-001", "SEO-002", "SEO-003", "SEO-004", "SEO-005", "SEO-006", "SEO-007", "SEO-008", "SEO-009", "SEO-010", "SEO-011", "SEO-012", "SEO-014", "SEO-015",
  "A11Y-001", "A11Y-002", "A11Y-003", "A11Y-004", "A11Y-005", "A11Y-006", "A11Y-007", "A11Y-009", "A11Y-010", "A11Y-011",
  "PERF-001", "PERF-002", "PERF-003", "PERF-004", "PERF-005", "PERF-006", "PERF-007", "PERF-IMG-001", "PERF-IMG-002", "PERF-IMG-003",
  "BP-001", "BP-002", "BP-003", "BP-004", "BP-005", "BP-006", "BP-007", "BP-008",
  "SEC-001", "SEC-002", "SEC-003", "SEC-004", "SEC-005", "SEC-006", "SEC-007", "SEC-008", "SEC-009", "SEC-011", "SEC-012",
];

test("every rule has a unique ID and complete documentation", () => {
  assertUniqueRuleIds();
  for (const rule of RULES) {
    assert.match(rule.id, /^[A-Z0-9-]+$/, `${rule.id} uses the documented ID format`);
    assert.ok(rule.name.length > 3, `${rule.id} has a name`);
    assert.ok(rule.description.length > 40, `${rule.id} explains why it matters`);
    assert.ok(rule.detection.length > 20, `${rule.id} documents its detection method`);
    assert.ok(rule.recommendation.length > 20, `${rule.id} documents a fix`);
  }
});

test("broken fixture fails the rules it is designed to break", async () => {
  const context = badContext();
  for (const id of MUST_FAIL_ON_BAD) {
    const outcome = await run(id, context);
    assert.equal(outcome.status, "fail", `${id} should FAIL on the broken fixture (got ${outcome.status})`);
    if (outcome.status === "fail") {
      for (const finding of outcome.findings) {
        assert.ok(finding.problem, `${id} finding has a problem statement`);
        assert.ok(finding.observed, `${id} finding reports what was observed`);
        assert.ok(finding.expected, `${id} finding reports what was expected`);
      }
    }
  }
});

test("well-built fixture does not fail rules it satisfies", async () => {
  const context = goodContext();
  for (const id of MUST_NOT_FAIL_ON_GOOD) {
    const outcome = await run(id, context);
    assert.notEqual(outcome.status, "fail", `${id} should PASS or SKIP on the good fixture`);
  }
});

test("no rule throws on either fixture", async () => {
  for (const context of [badContext(), goodContext()]) {
    for (const rule of RULES) {
      await assert.doesNotReject(async () => rule.check(context), `${rule.id} must not throw`);
    }
  }
});

test("report scores the broken page far below the good page", async () => {
  const bad = await buildReport(badContext());
  const good = await buildReport(goodContext());
  assert.ok(bad.score < good.score - 20, `bad (${bad.score}) should score well below good (${good.score})`);
  assert.ok(bad.findings.length > good.findings.length);
  assert.equal(bad.summary.rulesRun, RULES.length);
  assert.ok(bad.priorities.length > 0, "the priority engine produced a fix-first list");
  assert.ok(bad.quickWins.length > 0, "quick wins were identified");
  assert.deepEqual(
    [...bad.priorities].sort((a, b) => b.priority - a.priority).map((f) => f.ruleId),
    bad.priorities.map((f) => f.ruleId),
    "priorities are sorted by priority score",
  );
  const keys = bad.findings.map((f) => f.dedupeKey);
  assert.equal(new Set(keys).size, keys.length, "the same underlying problem is only reported once");
});

test("scoring maths matches the documented formulas", () => {
  assert.equal(categoryScore([{ weight: 6, passed: true }, { weight: 6, passed: false }]), 50);
  assert.equal(categoryScore([]), 100);
  assert.equal(overallScore({ performance: 100, seo: 100, accessibility: 100, "best-practices": 100, security: 100 }), 100);
  assert.equal(reachFactor(1), 1);
  assert.equal(Number(reachFactor(100).toFixed(2)), 2);
  assert.ok(
    priorityScore({ severity: "critical", effort: "easy", occurrences: 10, category: "performance" }) >
      priorityScore({ severity: "medium", effort: "hard", occurrences: 1, category: "seo" }),
  );
  assert.equal(isQuickWin({ severity: "high", effort: "easy", priority: 9 }), true);
  assert.equal(isQuickWin({ severity: "high", effort: "hard", priority: 9 }), false);
  assert.equal(isQuickWin({ severity: "low", effort: "easy", priority: 9 }), false);
});
