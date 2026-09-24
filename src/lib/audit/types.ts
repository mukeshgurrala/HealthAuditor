/**
 * Core types of the HealthAuditor rule engine.
 *
 * A rule is a self-contained object: metadata (id, category, severity, docs) plus a
 * `check(ctx)` function that inspects an already-collected `AuditContext` and returns a
 * pass / fail / skip outcome. Rules never touch the network themselves and never render
 * UI — everything they need is collected once, up-front, by the context builder.
 */

export type Category =
  | "performance"
  | "seo"
  | "accessibility"
  | "best-practices"
  | "security";

export type Severity = "critical" | "high" | "medium" | "low";

export type Effort = "easy" | "medium" | "hard";

export const CATEGORIES: Category[] = [
  "performance",
  "seo",
  "accessibility",
  "best-practices",
  "security",
];

export const CATEGORY_LABELS: Record<Category, string> = {
  performance: "Performance",
  seo: "SEO",
  accessibility: "Accessibility",
  "best-practices": "Best Practices",
  security: "Security",
};

export const CATEGORY_DESCRIPTIONS: Record<Category, string> = {
  performance: "How quickly the page loads and becomes usable.",
  seo: "How discoverable the page is for search engines.",
  accessibility: "Whether the page can be used by everyone, including assistive technology.",
  "best-practices": "Modern web implementation practices and correctness.",
  security: "Observable security configuration of the response and its resources.",
};

/** A single observed fact that justifies a finding. */
export interface Evidence {
  label: string;
  value: string;
}

/** What a rule returns for each problem it detects. The engine fills in the rest. */
export interface FindingDraft {
  /** Short, concrete description of the problem, in plain language. */
  problem: string;
  /** What was actually measured/seen. */
  observed: string;
  /** What HealthAuditor expected instead. */
  expected: string;
  /** Raw facts backing the detection. */
  evidence?: Evidence[];
  /** Page URL / resource URL the finding refers to. Defaults to the audited page. */
  url?: string;
  /** Element or resource identifier, e.g. `<img class="hero">`. */
  element?: string;
  /** Number of affected elements / resources. Used by the priority engine. */
  occurrences?: number;
  /** Rule-specific override of the generic recommendation. */
  howToFix?: string;
  /** Copy/paste-able technical solution shown in developer mode. */
  technicalFix?: string;
  /** Severity override for this particular instance. */
  severity?: Severity;
  /** Effort override for this particular instance. */
  effort?: Effort;
  /** Extra key/value pairs shown in developer mode. */
  technicalDetails?: Evidence[];
  /**
   * Stable key of the underlying problem. Two findings sharing a dedupeKey describe the
   * same root cause and are only scored once (spec §35: no double counting).
   */
  dedupeKey?: string;
}

/** A finding as exposed by the API: rule metadata + detected instance. */
export interface Finding extends Required<Pick<FindingDraft, "problem" | "observed" | "expected">> {
  ruleId: string;
  name: string;
  category: Category;
  severity: Severity;
  effort: Effort;
  whyItMatters: string;
  impact: string;
  howToFix: string;
  technicalFix?: string;
  url: string;
  element?: string;
  occurrences: number;
  evidence: Evidence[];
  technicalDetails: Evidence[];
  /** Priority score produced by the priority engine (higher = fix sooner). */
  priority: number;
  /** True when the finding qualifies as a quick win. */
  quickWin: boolean;
  dedupeKey: string;
  references: string[];
}

export interface PassedCheck {
  ruleId: string;
  name: string;
  category: Category;
  summary: string;
}

export interface SkippedCheck {
  ruleId: string;
  name: string;
  category: Category;
  reason: string;
}

export type RuleOutcome =
  | { status: "pass"; summary: string }
  | { status: "fail"; findings: FindingDraft[] }
  | { status: "skip"; reason: string };

export interface AuditRule {
  /** Stable unique ID, e.g. `SEO-001`. Never reuse or renumber. */
  id: string;
  name: string;
  category: Category;
  /** Default severity; a finding may override it. */
  severity: Severity;
  /** Default effort estimate for fixing it. */
  effort: Effort;
  /** Why this matters, in plain language (shown to users and in the docs). */
  description: string;
  /** How the rule detects the problem (documentation / transparency). */
  detection: string;
  /** Default fix advice. */
  recommendation: string;
  /** Plain-language impact statement used in the explanation block. */
  impact?: string;
  /** External references (specs, docs). */
  references?: string[];
  /**
   * Weight of this rule inside its category score. Defaults to the severity weight
   * (see METHODOLOGY.md). Use it to make a rule count more or less than its severity.
   */
  weight?: number;
  check(ctx: AuditContext): RuleOutcome | Promise<RuleOutcome>;
}

/* -------------------------------------------------------------------------- */
/* Audit context                                                              */
/* -------------------------------------------------------------------------- */

export interface RedirectHop {
  url: string;
  status: number;
  location: string;
}

export interface ResourceInfo {
  url: string;
  /** image | script | stylesheet | font | other */
  type: "image" | "script" | "stylesheet" | "font" | "other";
  /** Bytes, when the server reported or we measured a size. */
  bytes: number | null;
  contentType: string | null;
  cacheControl: string | null;
  status: number | null;
  /** True when the resource could not be fetched/measured. */
  unverified: boolean;
}

export interface ImageInfo extends ResourceInfo {
  type: "image";
  alt: string | null;
  hasAltAttribute: boolean;
  widthAttr: string | null;
  heightAttr: string | null;
  loading: string | null;
  element: string;
  format: string | null;
  /** Intrinsic dimensions when detectable from the bytes we downloaded. */
  intrinsicWidth: number | null;
  intrinsicHeight: number | null;
  isLikelyLcp: boolean;
}

export interface LinkInfo {
  url: string;
  text: string;
  internal: boolean;
  rel: string | null;
  status: number | null;
  /** redirect target when status is 3xx */
  redirectTo?: string | null;
  /** true when the request failed or was blocked (not necessarily broken) */
  unverified: boolean;
  error?: string;
}

/** Optional real-world / lab performance data from PageSpeed Insights. */
export interface PerformanceData {
  source: "psi";
  strategy: "mobile" | "desktop";
  lighthouseScore: number | null;
  metrics: {
    lcp: MetricValue;
    inp: MetricValue;
    cls: MetricValue;
    fcp: MetricValue;
    tbt: MetricValue;
    speedIndex: MetricValue;
  };
  opportunities: Array<{ id: string; title: string; description: string; displayValue?: string; savingsMs?: number }>;
}

export interface MetricValue {
  /** Raw numeric value (ms, or unitless for CLS). */
  value: number | null;
  display: string;
  rating: "good" | "needs-improvement" | "poor" | "unknown";
  /** Plain-language explanation of the metric. */
  explanation: string;
  /** Where the number came from. */
  source: "lab" | "field" | "measured" | "unavailable";
}

export interface RobotsInfo {
  found: boolean;
  url: string;
  status: number | null;
  sitemaps: string[];
  disallowsEverything: boolean;
  content: string | null;
}

export interface SitemapInfo {
  found: boolean;
  url: string | null;
  status: number | null;
  urlCount: number | null;
  isIndex: boolean;
}

export interface TechnologyInfo {
  name: string;
  category: "framework" | "cms" | "analytics" | "cdn" | "ecommerce" | "library" | "server";
  evidence: string;
}

export interface AuditContext {
  /** URL the user asked for (after normalisation). */
  requestedUrl: string;
  /** URL after following redirects — the page that was actually analysed. */
  finalUrl: string;
  origin: string;
  statusCode: number;
  redirectChain: RedirectHop[];
  headers: Record<string, string>;
  html: string;
  htmlBytes: number;
  /** Time to first byte of the HTML document, in ms (measured server-side). */
  ttfbMs: number;
  /** Total time to download the HTML document, in ms. */
  htmlLoadMs: number;
  /** Cheerio document. Typed loosely so rules stay easy to write and test. */
  $: import("cheerio").CheerioAPI;
  images: ImageInfo[];
  scripts: ResourceInfo[];
  stylesheets: ResourceInfo[];
  fonts: ResourceInfo[];
  otherResources: ResourceInfo[];
  links: LinkInfo[];
  robots: RobotsInfo;
  sitemap: SitemapInfo;
  performance: PerformanceData | null;
  technologies: TechnologyInfo[];
  /** Non-fatal problems encountered while collecting data. */
  collectionNotes: string[];
  /** Options the audit ran with. */
  options: AuditOptions;
}

export interface AuditOptions {
  checkLinks: boolean;
  maxLinks: number;
  measureResources: boolean;
  maxResources: number;
  usePageSpeed: boolean;
  strategy: "mobile" | "desktop";
}

export const DEFAULT_OPTIONS: AuditOptions = {
  checkLinks: true,
  maxLinks: 40,
  measureResources: true,
  maxResources: 40,
  usePageSpeed: true,
  strategy: "mobile",
};

/* -------------------------------------------------------------------------- */
/* Report                                                                     */
/* -------------------------------------------------------------------------- */

export interface CategoryReport {
  category: Category;
  label: string;
  description: string;
  score: number;
  /** How the score was produced, in one sentence. */
  scoreExplanation: string;
  findings: Finding[];
  passed: PassedCheck[];
  skipped: SkippedCheck[];
  counts: Record<Severity, number>;
}

export interface AuditSummary {
  totalFindings: number;
  counts: Record<Severity, number>;
  passedChecks: number;
  rulesRun: number;
}

export interface AuditReport {
  version: string;
  /** ISO timestamp. */
  finishedAt: string;
  durationMs: number;
  requestedUrl: string;
  finalUrl: string;
  statusCode: number;
  score: number;
  scoreLabel: "good" | "needs-improvement" | "poor";
  categories: CategoryReport[];
  /** Ranked "fix first" list across all categories. */
  priorities: Finding[];
  quickWins: Finding[];
  findings: Finding[];
  summary: AuditSummary;
  metrics: PerformanceData["metrics"] | null;
  performanceSource: string;
  pageStats: {
    htmlBytes: number;
    requestCount: number;
    totalBytes: number | null;
    imageBytes: number | null;
    scriptBytes: number | null;
    stylesheetBytes: number | null;
    ttfbMs: number;
  };
  images: ImageInfo[];
  links: LinkInfo[];
  redirectChain: RedirectHop[];
  technologies: TechnologyInfo[];
  notes: string[];
}
