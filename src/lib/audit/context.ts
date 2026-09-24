/**
 * Context collection: everything the rules need is gathered here, exactly once.
 *
 * Rules must stay pure functions of this context so they can be unit-tested against HTML
 * fixtures without any network access (see `docs/CONTRIBUTING`-style rule tests).
 */

import * as cheerio from "cheerio";
import { assertPublicUrl, isPublicUrl, normalizePublicUrl } from "@/lib/validation";
import { fetchText, mapWithConcurrency, measureResource, probeStatus, USER_AGENT } from "./fetcher";
import { readImageDimensions } from "./image-dimensions";
import { detectTechnologies } from "./technology";
import {
  AuditContext,
  AuditOptions,
  DEFAULT_OPTIONS,
  ImageInfo,
  LinkInfo,
  RedirectHop,
  ResourceInfo,
  RobotsInfo,
  SitemapInfo,
} from "./types";

export class AuditError extends Error {}

const HTML_TIMEOUT_MS = 20_000;

function absolute(base: string, href: string | undefined): string | null {
  if (!href) return null;
  const trimmed = href.trim();
  if (!trimmed || trimmed.startsWith("#") || /^(data|javascript|mailto|tel|sms|blob):/i.test(trimmed)) return null;
  try {
    return new URL(trimmed, base).href;
  } catch {
    return null;
  }
}

function formatOf(url: string, contentType: string | null): string | null {
  if (contentType?.startsWith("image/")) return contentType.split(";")[0].replace("image/", "").toUpperCase();
  const match = url.split("?")[0].match(/\.([a-z0-9]{2,5})$/i);
  return match ? match[1].toUpperCase() : null;
}

/** Follow redirects manually so we can report the chain (spec §13). */
async function fetchDocument(startUrl: string) {
  const chain: RedirectHop[] = [];
  let current = startUrl;

  for (let hop = 0; hop < 6; hop += 1) {
    assertPublicUrl(current);
    const started = Date.now();
    let response: Response;
    try {
      response = await fetch(current, {
        redirect: "manual",
        cache: "no-store",
        headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml" },
        signal: AbortSignal.timeout(HTML_TIMEOUT_MS),
      });
    } catch (error) {
      const reason = error instanceof Error && error.name === "TimeoutError"
        ? "The website took too long to respond (over 20 seconds)."
        : "We couldn't reach this website. Check the address and that the site is publicly online.";
      throw new AuditError(reason);
    }
    const ttfbMs = Date.now() - started;

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      const next = location ? absolute(current, location) : null;
      chain.push({ url: current, status: response.status, location: next ?? location ?? "(missing Location header)" });
      if (!next) throw new AuditError("This website returned a redirect without a destination.");
      current = next;
      continue;
    }

    const buffer = await response.arrayBuffer();
    const html = new TextDecoder("utf-8").decode(buffer);
    return {
      finalUrl: response.url || current,
      status: response.status,
      headers: Object.fromEntries([...response.headers.entries()].map(([k, v]) => [k.toLowerCase(), v])),
      html,
      bytes: buffer.byteLength,
      ttfbMs,
      totalMs: Date.now() - started,
      redirectChain: chain,
    };
  }
  throw new AuditError("This website redirects too many times (redirect loop).");
}

async function collectRobots(origin: string): Promise<RobotsInfo> {
  const url = `${origin}/robots.txt`;
  const result = await fetchText(url, { timeoutMs: 8_000, maxBytes: 200_000 });
  const content = result.ok && result.text && !/^\s*<(!doctype|html)/i.test(result.text) ? result.text : null;
  const sitemaps = content
    ? [...content.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map((m) => m[1].trim())
    : [];
  const disallowsEverything = content
    ? /user-agent:\s*\*[\s\S]*?disallow:\s*\/\s*$/im.test(content.split(/user-agent:/i).slice(1).map((b) => `user-agent:${b}`).find((b) => /^user-agent:\s*\*/i.test(b)) ?? "")
    : false;
  return { found: Boolean(content), url, status: result.status, sitemaps, disallowsEverything, content };
}

async function collectSitemap(origin: string, robots: RobotsInfo): Promise<SitemapInfo> {
  const candidates = [...robots.sitemaps, `${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`];
  for (const candidate of candidates) {
    if (!isPublicUrl(candidate)) continue;
    const result = await fetchText(candidate, { timeoutMs: 8_000, maxBytes: 1_000_000 });
    if (result.ok && result.text && /<(urlset|sitemapindex)/i.test(result.text)) {
      const isIndex = /<sitemapindex/i.test(result.text);
      const urlCount = (result.text.match(/<loc>/gi) ?? []).length;
      return { found: true, url: result.url, status: result.status, urlCount, isIndex };
    }
  }
  return { found: false, url: null, status: null, urlCount: null, isIndex: false };
}

/** Build a context from already-fetched HTML. Used by tests and by the live collector. */
export function buildStaticContext(params: {
  url: string;
  html: string;
  headers?: Record<string, string>;
  status?: number;
  redirectChain?: RedirectHop[];
  options?: Partial<AuditOptions>;
}): AuditContext {
  const finalUrl = params.url;
  const origin = new URL(finalUrl).origin;
  const $ = cheerio.load(params.html);
  const options: AuditOptions = { ...DEFAULT_OPTIONS, ...params.options, checkLinks: false, measureResources: false, usePageSpeed: false };

  const { images, scripts, stylesheets, fonts, otherResources, links } = extractFromDom($, finalUrl, origin);

  return {
    requestedUrl: finalUrl,
    finalUrl,
    origin,
    statusCode: params.status ?? 200,
    redirectChain: params.redirectChain ?? [],
    headers: params.headers ?? {},
    html: params.html,
    htmlBytes: Buffer.byteLength(params.html),
    ttfbMs: 0,
    htmlLoadMs: 0,
    $,
    images,
    scripts,
    stylesheets,
    fonts,
    otherResources,
    links,
    robots: { found: false, url: `${origin}/robots.txt`, status: null, sitemaps: [], disallowsEverything: false, content: null },
    sitemap: { found: false, url: null, status: null, urlCount: null, isIndex: false },
    performance: null,
    technologies: detectTechnologies($, params.headers ?? {}, params.html),
    collectionNotes: [],
    options,
  };
}

function extractFromDom($: cheerio.CheerioAPI, finalUrl: string, origin: string) {
  const images: ImageInfo[] = [];
  const seenImages = new Set<string>();

  $("img").each((index, node) => {
    const el = $(node);
    const src = absolute(finalUrl, el.attr("src") || el.attr("data-src") || el.attr("srcset")?.split(",")[0]?.trim().split(" ")[0]);
    if (!src || seenImages.has(src)) return;
    seenImages.add(src);
    const classAttr = el.attr("class");
    const element = `<img${classAttr ? ` class="${classAttr}"` : ""}${el.attr("id") ? ` id="${el.attr("id")}"` : ""}>`;
    images.push({
      url: src,
      type: "image",
      bytes: null,
      contentType: null,
      cacheControl: null,
      status: null,
      unverified: true,
      alt: el.attr("alt") ?? null,
      hasAltAttribute: el.attr("alt") !== undefined,
      widthAttr: el.attr("width") ?? null,
      heightAttr: el.attr("height") ?? null,
      loading: el.attr("loading") ?? null,
      element,
      format: formatOf(src, null),
      intrinsicWidth: null,
      intrinsicHeight: null,
      isLikelyLcp: index < 2 && el.attr("loading") !== "lazy",
    });
  });

  const resource = (url: string, type: ResourceInfo["type"]): ResourceInfo => ({
    url,
    type,
    bytes: null,
    contentType: null,
    cacheControl: null,
    status: null,
    unverified: true,
  });

  const scripts: ResourceInfo[] = [];
  $("script[src]").each((_, node) => {
    const src = absolute(finalUrl, $(node).attr("src"));
    if (src && !scripts.some((s) => s.url === src)) scripts.push(resource(src, "script"));
  });

  const stylesheets: ResourceInfo[] = [];
  $('link[rel~="stylesheet"]').each((_, node) => {
    const href = absolute(finalUrl, $(node).attr("href"));
    if (href && !stylesheets.some((s) => s.url === href)) stylesheets.push(resource(href, "stylesheet"));
  });

  const fonts: ResourceInfo[] = [];
  $('link[as="font"], link[type*="font"]').each((_, node) => {
    const href = absolute(finalUrl, $(node).attr("href"));
    if (href && !fonts.some((f) => f.url === href)) fonts.push(resource(href, "font"));
  });

  const otherResources: ResourceInfo[] = [];
  $("iframe[src], video[src], source[src], audio[src]").each((_, node) => {
    const src = absolute(finalUrl, $(node).attr("src"));
    if (src && !otherResources.some((r) => r.url === src)) otherResources.push(resource(src, "other"));
  });

  const links: LinkInfo[] = [];
  $("a[href]").each((_, node) => {
    const el = $(node);
    const href = absolute(finalUrl, el.attr("href"));
    if (!href || links.some((l) => l.url === href)) return;
    links.push({
      url: href,
      text: el.text().replace(/\s+/g, " ").trim().slice(0, 80),
      internal: href.startsWith(origin),
      rel: el.attr("rel") ?? null,
      status: null,
      unverified: true,
    });
  });

  return { images, scripts, stylesheets, fonts, otherResources, links };
}

export async function collectContext(
  inputUrl: string,
  overrides: Partial<AuditOptions> = {},
): Promise<AuditContext> {
  const options: AuditOptions = { ...DEFAULT_OPTIONS, ...overrides };
  const requestedUrl = normalizePublicUrl(inputUrl);
  const doc = await fetchDocument(requestedUrl);

  const contentType = doc.headers["content-type"] ?? "";
  if (doc.status >= 400) {
    throw new AuditError(`This website responded with HTTP ${doc.status}, so there was no page to analyse.`);
  }
  if (contentType && !/text\/html|application\/xhtml/i.test(contentType)) {
    throw new AuditError("That address does not return a web page (it returned a file or API response).");
  }

  const base = buildStaticContext({
    url: doc.finalUrl,
    html: doc.html,
    headers: doc.headers,
    status: doc.status,
    redirectChain: doc.redirectChain,
  });

  const context: AuditContext = {
    ...base,
    requestedUrl,
    htmlBytes: doc.bytes,
    ttfbMs: doc.ttfbMs,
    htmlLoadMs: doc.totalMs,
    options,
  };

  const notes: string[] = [];
  const [robots, measured, linkResults] = await Promise.all([
    collectRobots(context.origin).catch(() => base.robots),
    options.measureResources ? measureAll(context, options) : Promise.resolve(null),
    options.checkLinks ? checkLinks(context.links, options.maxLinks) : Promise.resolve(null),
  ]);

  context.robots = robots;
  context.sitemap = await collectSitemap(context.origin, robots).catch(() => base.sitemap);

  if (measured) {
    context.images = measured.images;
    context.scripts = measured.scripts;
    context.stylesheets = measured.stylesheets;
    context.fonts = measured.fonts;
    if (measured.skipped > 0) {
      notes.push(`${measured.skipped} resources were not measured to keep the audit fast.`);
    }
  } else {
    notes.push("Resource sizes were not measured in this run.");
  }

  if (linkResults) {
    context.links = linkResults.links;
    if (linkResults.skipped > 0) notes.push(`${linkResults.skipped} additional links were not checked in this run.`);
  }

  context.collectionNotes = notes;
  return context;
}

async function measureAll(context: AuditContext, options: AuditOptions) {
  const images = context.images.slice(0, Math.min(25, options.maxResources));
  const others = [...context.scripts, ...context.stylesheets, ...context.fonts].slice(
    0,
    Math.max(0, options.maxResources - images.length),
  );
  const skipped =
    Math.max(0, context.images.length - images.length) +
    Math.max(0, context.scripts.length + context.stylesheets.length + context.fonts.length - others.length);

  const measuredImages = await mapWithConcurrency(images, 6, async (image) => {
    const result = await measureResource(image.url, { timeoutMs: 10_000, sampleBytes: 65_536 });
    const dimensions = result.sample ? readImageDimensions(result.sample) : null;
    return {
      ...image,
      bytes: result.bytes,
      status: result.status,
      contentType: result.headers["content-type"] ?? null,
      cacheControl: result.headers["cache-control"] ?? null,
      unverified: result.bytes === null,
      format: formatOf(image.url, result.headers["content-type"] ?? null),
      intrinsicWidth: dimensions?.width ?? null,
      intrinsicHeight: dimensions?.height ?? null,
    } satisfies ImageInfo;
  });

  const measuredOthers = await mapWithConcurrency(others, 6, async (item) => {
    const result = await measureResource(item.url, { timeoutMs: 10_000 });
    return {
      ...item,
      bytes: result.bytes,
      status: result.status,
      contentType: result.headers["content-type"] ?? null,
      cacheControl: result.headers["cache-control"] ?? null,
      unverified: result.bytes === null,
    } satisfies ResourceInfo;
  });

  const byUrl = new Map(measuredOthers.map((item) => [item.url, item]));
  const merge = (list: ResourceInfo[]) => list.map((item) => byUrl.get(item.url) ?? item);

  return {
    images: context.images.map((image) => measuredImages.find((m) => m.url === image.url) ?? image),
    scripts: merge(context.scripts),
    stylesheets: merge(context.stylesheets),
    fonts: merge(context.fonts),
    skipped,
  };
}

async function checkLinks(links: LinkInfo[], maxLinks: number) {
  const internal = links.filter((l) => l.internal);
  const external = links.filter((l) => !l.internal);
  const budgetExternal = Math.min(external.length, Math.floor(maxLinks / 3));
  const selected = [...internal.slice(0, maxLinks - budgetExternal), ...external.slice(0, budgetExternal)];
  const skipped = links.length - selected.length;

  const checked = await mapWithConcurrency(selected, 6, async (link) => {
    const result = await probeStatus(link.url);
    const blocked = result.status === 403 || result.status === 429 || result.status === 999;
    return {
      ...link,
      status: result.status,
      redirectTo: result.redirectTo,
      // External sites frequently block bots: never call that a broken link (spec §14).
      unverified: result.status === null || (!link.internal && blocked),
      error: result.error,
    } satisfies LinkInfo;
  });

  const map = new Map(checked.map((l) => [l.url, l]));
  return { links: links.map((l) => map.get(l.url) ?? l), skipped };
}
