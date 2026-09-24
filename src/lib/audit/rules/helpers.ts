import type { Evidence, FindingDraft } from "../types";

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return "unknown";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "unknown";
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${Math.round(ms)} ms`;
}

export function sumBytes(items: Array<{ bytes: number | null }>): number | null {
  const known = items.filter((item) => typeof item.bytes === "number");
  if (!known.length) return null;
  return known.reduce((total, item) => total + (item.bytes as number), 0);
}

export function evidence(...pairs: Array<[string, string | number | null | undefined]>): Evidence[] {
  return pairs
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([label, value]) => ({ label, value: String(value) }));
}

export function pass(summary: string) {
  return { status: "pass", summary } as const;
}

export function skip(reason: string) {
  return { status: "skip", reason } as const;
}

export function fail(...findings: FindingDraft[]) {
  return { status: "fail", findings } as const;
}

export function shortUrl(url: string, max = 70): string {
  try {
    const parsed = new URL(url);
    const value = `${parsed.pathname}${parsed.search}` || "/";
    return value.length > max ? `${value.slice(0, max)}…` : value;
  } catch {
    return url.length > max ? `${url.slice(0, max)}…` : url;
  }
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
