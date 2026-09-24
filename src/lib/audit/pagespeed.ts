/**
 * Optional Core Web Vitals enrichment via the PageSpeed Insights API.
 *
 * HealthAuditor works entirely without this: every static rule runs from our own fetch of
 * the page. When a PAGESPEED_API_KEY is configured we additionally get real Lighthouse
 * measurements (LCP, CLS, TBT, Speed Index) and, when Chrome UX data exists for the
 * origin, field INP. Nothing here is ever estimated — a missing value stays null.
 */

import type { MetricValue, PerformanceData } from "./types";

interface PsiAudit {
  title?: string;
  description?: string;
  score?: number | null;
  scoreDisplayMode?: string;
  displayValue?: string;
  numericValue?: number;
  details?: { overallSavingsMs?: number };
}

interface PsiResponse {
  lighthouseResult?: {
    categories?: Record<string, { score?: number | null }>;
    audits?: Record<string, PsiAudit>;
  };
  loadingExperience?: {
    metrics?: Record<string, { percentile?: number; category?: string }>;
  };
}

const cache = new Map<string, { expiresAt: number; data: PerformanceData }>();
const CACHE_TTL_MS = 5 * 60_000;

const EXPLANATIONS: Record<string, string> = {
  lcp: "How long until the largest visible element (usually the hero image or headline) has rendered. Good: under 2.5 s.",
  inp: "How quickly the page responds when someone taps or clicks. Good: under 200 ms.",
  cls: "How much the layout jumps around while loading. Good: under 0.1.",
  fcp: "How long until the first text or image appears. Good: under 1.8 s.",
  tbt: "How long the main thread was blocked and unable to respond to input during load. Good: under 200 ms.",
  speedIndex: "How quickly the visible part of the page fills in. Good: under 3.4 s.",
};

function rate(key: keyof PerformanceData["metrics"], value: number | null): MetricValue["rating"] {
  if (value === null) return "unknown";
  const thresholds: Record<string, [number, number]> = {
    lcp: [2500, 4000],
    inp: [200, 500],
    cls: [0.1, 0.25],
    fcp: [1800, 3000],
    tbt: [200, 600],
    speedIndex: [3400, 5800],
  };
  const [good, poor] = thresholds[key];
  if (value <= good) return "good";
  return value <= poor ? "needs-improvement" : "poor";
}

function metric(
  key: keyof PerformanceData["metrics"],
  value: number | null,
  display: string | undefined,
  source: MetricValue["source"],
): MetricValue {
  return {
    value,
    display: display ?? (value === null ? "Not measured" : key === "cls" ? value.toFixed(3) : `${Math.round(value)} ms`),
    rating: rate(key, value),
    explanation: EXPLANATIONS[key],
    source: value === null ? "unavailable" : source,
  };
}

export async function fetchPerformanceData(
  url: string,
  strategy: "mobile" | "desktop" = "mobile",
): Promise<PerformanceData | null> {
  const key = process.env.PAGESPEED_API_KEY;
  if (!key) return null;

  const cacheKey = `${strategy}:${url}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const endpoint = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("strategy", strategy);
  endpoint.searchParams.set("key", key);
  endpoint.searchParams.append("category", "performance");

  let response: Response;
  try {
    response = await fetch(endpoint, { signal: AbortSignal.timeout(70_000), cache: "no-store" });
  } catch {
    return null;
  }
  if (!response.ok) return null;

  const data = (await response.json()) as PsiResponse;
  const audits = data.lighthouseResult?.audits ?? {};
  const numeric = (id: string) => (typeof audits[id]?.numericValue === "number" ? (audits[id].numericValue as number) : null);
  const fieldInp = data.loadingExperience?.metrics?.INTERACTION_TO_NEXT_PAINT?.percentile ?? null;

  const performance: PerformanceData = {
    source: "psi",
    strategy,
    lighthouseScore:
      typeof data.lighthouseResult?.categories?.performance?.score === "number"
        ? Math.round(data.lighthouseResult.categories.performance.score * 100)
        : null,
    metrics: {
      lcp: metric("lcp", numeric("largest-contentful-paint"), audits["largest-contentful-paint"]?.displayValue, "lab"),
      inp: metric("inp", fieldInp, fieldInp === null ? undefined : `${fieldInp} ms`, "field"),
      cls: metric("cls", numeric("cumulative-layout-shift"), audits["cumulative-layout-shift"]?.displayValue, "lab"),
      fcp: metric("fcp", numeric("first-contentful-paint"), audits["first-contentful-paint"]?.displayValue, "lab"),
      tbt: metric("tbt", numeric("total-blocking-time"), audits["total-blocking-time"]?.displayValue, "lab"),
      speedIndex: metric("speedIndex", numeric("speed-index"), audits["speed-index"]?.displayValue, "lab"),
    },
    opportunities: Object.entries(audits)
      .filter(([, audit]) => audit.details?.overallSavingsMs && audit.details.overallSavingsMs > 100)
      .map(([id, audit]) => ({
        id,
        title: audit.title ?? id,
        description: (audit.description ?? "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1"),
        displayValue: audit.displayValue,
        savingsMs: audit.details?.overallSavingsMs,
      }))
      .sort((a, b) => (b.savingsMs ?? 0) - (a.savingsMs ?? 0))
      .slice(0, 8),
  };

  cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, data: performance });
  return performance;
}

/** Metric set used when no PageSpeed key is configured: honest "not measured" values. */
export function unmeasuredMetrics(): PerformanceData["metrics"] {
  return {
    lcp: metric("lcp", null, undefined, "unavailable"),
    inp: metric("inp", null, undefined, "unavailable"),
    cls: metric("cls", null, undefined, "unavailable"),
    fcp: metric("fcp", null, undefined, "unavailable"),
    tbt: metric("tbt", null, undefined, "unavailable"),
    speedIndex: metric("speedIndex", null, undefined, "unavailable"),
  };
}
