/**
 * Network helpers used by the context collector.
 *
 * Every outbound request is (a) validated against the SSRF guard in `validation.ts`,
 * (b) time-limited, and (c) failure-tolerant: a blocked or slow resource must degrade the
 * audit gracefully, never crash it.
 */

import { assertPublicUrl } from "@/lib/validation";

export const USER_AGENT =
  "Mozilla/5.0 (compatible; HealthAuditorBot/0.2; +https://github.com/mukeshgurrala/HealthAuditor)";

export interface FetchTextResult {
  ok: boolean;
  status: number | null;
  url: string;
  headers: Record<string, string>;
  text: string | null;
  bytes: number;
  ttfbMs: number;
  totalMs: number;
  error?: string;
}

function headerMap(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key.toLowerCase()] = value;
  });
  return out;
}

export async function fetchText(
  url: string,
  { timeoutMs = 15_000, maxBytes = 5_000_000 }: { timeoutMs?: number; maxBytes?: number } = {},
): Promise<FetchTextResult> {
  const started = Date.now();
  try {
    assertPublicUrl(url);
    const response = await fetch(url, {
      redirect: "follow",
      cache: "no-store",
      headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml,*/*;q=0.8" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const ttfbMs = Date.now() - started;
    const buffer = await response.arrayBuffer();
    const bytes = buffer.byteLength;
    const text = new TextDecoder("utf-8").decode(buffer.slice(0, maxBytes));
    return {
      ok: response.ok,
      status: response.status,
      url: response.url || url,
      headers: headerMap(response.headers),
      text,
      bytes,
      ttfbMs,
      totalMs: Date.now() - started,
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      url,
      headers: {},
      text: null,
      bytes: 0,
      ttfbMs: Date.now() - started,
      totalMs: Date.now() - started,
      error: error instanceof Error ? error.message : "request failed",
    };
  }
}

export interface HeadResult {
  status: number | null;
  url: string;
  headers: Record<string, string>;
  bytes: number | null;
  /** First bytes of the body, when we had to download it (used for image dimensions). */
  sample: Uint8Array | null;
  error?: string;
  redirectTo?: string | null;
}

/**
 * Measure a resource. Tries HEAD first (cheap); when the server does not report a size we
 * fall back to a ranged GET so the number we show is always real, never estimated.
 */
export async function measureResource(
  url: string,
  { timeoutMs = 10_000, sampleBytes = 0 }: { timeoutMs?: number; sampleBytes?: number } = {},
): Promise<HeadResult> {
  try {
    assertPublicUrl(url);
  } catch (error) {
    return { status: null, url, headers: {}, bytes: null, sample: null, error: (error as Error).message };
  }

  const headers = { "user-agent": USER_AGENT };
  try {
    const head = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      cache: "no-store",
      headers,
      signal: AbortSignal.timeout(timeoutMs),
    });
    const map = headerMap(head.headers);
    const length = Number(map["content-length"]);
    if (head.ok && Number.isFinite(length) && length > 0 && !sampleBytes) {
      return { status: head.status, url: head.url || url, headers: map, bytes: length, sample: null };
    }
    if (head.ok || head.status === 405 || head.status === 501 || sampleBytes) {
      return await getResource(url, timeoutMs, sampleBytes, head.ok ? head.status : null);
    }
    return { status: head.status, url: head.url || url, headers: map, bytes: null, sample: null };
  } catch {
    return await getResource(url, timeoutMs, sampleBytes, null);
  }
}

async function getResource(
  url: string,
  timeoutMs: number,
  sampleBytes: number,
  fallbackStatus: number | null,
): Promise<HeadResult> {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      cache: "no-store",
      headers: { "user-agent": USER_AGENT },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const map = headerMap(response.headers);
    const buffer = await response.arrayBuffer();
    return {
      status: response.status ?? fallbackStatus,
      url: response.url || url,
      headers: map,
      bytes: buffer.byteLength,
      sample: sampleBytes ? new Uint8Array(buffer.slice(0, sampleBytes)) : null,
    };
  } catch (error) {
    return {
      status: fallbackStatus,
      url,
      headers: {},
      bytes: null,
      sample: null,
      error: error instanceof Error ? error.message : "request failed",
    };
  }
}

/** Status-only probe used by the broken-link checker. */
export async function probeStatus(
  url: string,
  timeoutMs = 8_000,
): Promise<{ status: number | null; redirectTo: string | null; error?: string }> {
  try {
    assertPublicUrl(url);
  } catch (error) {
    return { status: null, redirectTo: null, error: (error as Error).message };
  }
  const attempt = async (method: "HEAD" | "GET") =>
    fetch(url, {
      method,
      redirect: "manual",
      cache: "no-store",
      headers: { "user-agent": USER_AGENT, accept: "*/*" },
      signal: AbortSignal.timeout(timeoutMs),
    });
  try {
    let response = await attempt("HEAD");
    if (response.status === 405 || response.status === 501 || response.status === 403) {
      response = await attempt("GET");
    }
    const location = response.headers.get("location");
    return { status: response.status, redirectTo: location ? new URL(location, url).href : null };
  } catch (error) {
    return { status: null, redirectTo: null, error: error instanceof Error ? error.message : "request failed" };
  }
}

/** Run async tasks with a bounded concurrency so audits stay fast but polite. */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}
