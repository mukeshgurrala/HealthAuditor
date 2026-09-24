import type { AuditRule } from "../types";
import { evidence, fail, formatBytes, pass, plural, shortUrl, skip } from "./helpers";

const DEPRECATED_ELEMENTS = ["center", "font", "marquee", "blink", "big", "strike", "frameset", "applet"];

export const bestPracticeRules: AuditRule[] = [
  {
    id: "BP-001",
    name: "HTML5 doctype",
    category: "best-practices",
    severity: "medium",
    effort: "easy",
    description:
      "Without <!DOCTYPE html> browsers fall back to quirks mode, where layout and CSS behave differently from every modern expectation.",
    detection: "Checks that the response starts with an HTML5 doctype declaration.",
    recommendation: "Make <!DOCTYPE html> the very first line of the document.",
    check(ctx) {
      const head = ctx.html.slice(0, 200).trim();
      if (/^<!doctype\s+html\s*>/i.test(head)) return pass("HTML5 doctype declared.");
      if (/^<!doctype/i.test(head)) {
        return fail({
          problem: "The page uses a legacy doctype instead of the HTML5 one.",
          observed: head.split("\n")[0].slice(0, 120),
          expected: "<!DOCTYPE html>",
          severity: "low",
          evidence: evidence(["First line", head.split("\n")[0].slice(0, 120)]),
          dedupeKey: "doctype",
        });
      }
      return fail({
        problem: "The page has no doctype, so browsers render it in quirks mode.",
        observed: head.split("\n")[0].slice(0, 120) || "(empty)",
        expected: "<!DOCTYPE html>",
        evidence: evidence(["Document start", head.slice(0, 120)]),
        technicalFix: "<!DOCTYPE html>",
        dedupeKey: "doctype",
      });
    },
  },
  {
    id: "BP-002",
    name: "Character encoding declared",
    category: "best-practices",
    severity: "medium",
    effort: "easy",
    description:
      "If the encoding is not declared early, browsers may guess wrong and display mojibake instead of accented characters and symbols.",
    detection: 'Looks for <meta charset> (or a charset in the Content-Type header) within the first 1024 bytes.',
    recommendation: 'Put <meta charset="utf-8"> as the first element inside <head>.',
    check(ctx) {
      const metaCharset = ctx.$("meta[charset]").attr("charset");
      const headerCharset = ctx.headers["content-type"]?.match(/charset=([\w-]+)/i)?.[1];
      const early = /charset/i.test(ctx.html.slice(0, 1024));
      if (metaCharset || headerCharset) {
        if (metaCharset && !early) {
          return fail({
            problem: "The character encoding is declared too late in the document.",
            observed: "charset meta appears after the first 1024 bytes",
            expected: "<meta charset=\"utf-8\"> in the first 1024 bytes of <head>",
            severity: "low",
            evidence: evidence(["Declared", metaCharset]),
            dedupeKey: "charset",
          });
        }
        return pass(`Character encoding declared (${metaCharset ?? headerCharset}).`);
      }
      return fail({
        problem: "No character encoding is declared.",
        observed: "No meta charset and no charset in Content-Type",
        expected: 'UTF-8 declared via <meta charset="utf-8">',
        evidence: evidence(["Content-Type", ctx.headers["content-type"] ?? "absent"]),
        technicalFix: '<meta charset="utf-8">',
        dedupeKey: "charset",
      });
    },
  },
  {
    id: "BP-003",
    name: "Text compression",
    category: "best-practices",
    severity: "medium",
    effort: "easy",
    description:
      "Gzip or Brotli typically shrink HTML, CSS and JavaScript by 70–80%. Serving them uncompressed wastes bandwidth on every visit.",
    detection: "Checks the Content-Encoding response header of the HTML document.",
    recommendation: "Enable Brotli (or gzip) compression for text responses on your server or CDN.",
    check(ctx) {
      const encoding = ctx.headers["content-encoding"];
      if (encoding && /br|gzip|deflate|zstd/i.test(encoding)) return pass(`HTML is compressed with ${encoding}.`);
      if (ctx.htmlBytes < 2048) return skip("The HTML document is too small for compression to matter.");
      return fail({
        problem: `The HTML document (${formatBytes(ctx.htmlBytes)}) is served without compression.`,
        observed: encoding ? `Content-Encoding: ${encoding}` : "No Content-Encoding header",
        expected: "Content-Encoding: br or gzip",
        evidence: evidence(["HTML size", formatBytes(ctx.htmlBytes)], ["Content-Encoding", encoding ?? "absent"], ["Server", ctx.headers["server"] ?? "unknown"]),
        dedupeKey: "compression",
      });
    },
  },
  {
    id: "BP-004",
    name: "Static asset caching",
    category: "best-practices",
    severity: "medium",
    effort: "medium",
    description:
      "Static files that never change should be cached by the browser for a long time, so repeat visits download almost nothing.",
    detection: "Reads Cache-Control on measured images, scripts, stylesheets and fonts, flagging max-age under one day.",
    recommendation: "Serve hashed filenames with Cache-Control: public, max-age=31536000, immutable.",
    check(ctx) {
      const assets = [...ctx.images, ...ctx.scripts, ...ctx.stylesheets, ...ctx.fonts].filter((a) => a.status !== null);
      if (!assets.length) return skip("No static assets could be measured.");
      const poorly = assets.filter((asset) => {
        const cache = asset.cacheControl?.toLowerCase() ?? "";
        if (!cache) return true;
        if (/no-store|no-cache/.test(cache)) return true;
        const maxAge = Number(cache.match(/max-age\s*=\s*(\d+)/)?.[1] ?? 0);
        return maxAge < 86_400;
      });
      if (!poorly.length) return pass(`All ${assets.length} measured assets are cached for at least a day.`);
      return fail({
        problem: `${plural(poorly.length, "static file")} are not cached long enough for repeat visits.`,
        observed: `${poorly.length} of ${assets.length} assets with short or missing Cache-Control`,
        expected: "Cache-Control: public, max-age=31536000, immutable for versioned assets",
        occurrences: poorly.length,
        evidence: evidence(
          ...poorly.slice(0, 5).map((asset, i) => [`Asset ${i + 1}`, `${shortUrl(asset.url, 45)} — ${asset.cacheControl ?? "no Cache-Control"}`] as [string, string]),
        ),
        dedupeKey: "asset-caching",
      });
    },
  },
  {
    id: "BP-005",
    name: "Deprecated HTML elements",
    category: "best-practices",
    severity: "low",
    effort: "easy",
    description:
      "Elements like <center>, <font> and <marquee> were removed from the standard. Browsers still tolerate them, but their behaviour is not guaranteed.",
    detection: `Searches the DOM for ${DEPRECATED_ELEMENTS.join(", ")}.`,
    recommendation: "Replace deprecated presentational elements with CSS.",
    check(ctx) {
      const found = DEPRECATED_ELEMENTS.map((tag) => ({ tag, count: ctx.$(tag).length })).filter((item) => item.count > 0);
      if (!found.length) return pass("No deprecated HTML elements were found.");
      const total = found.reduce((sum, item) => sum + item.count, 0);
      return fail({
        problem: `The page uses ${plural(total, "deprecated element")} (${found.map((f) => `<${f.tag}>`).join(", ")}).`,
        observed: found.map((f) => `${f.count}× <${f.tag}>`).join(", "),
        expected: "Modern HTML with CSS for presentation",
        occurrences: total,
        evidence: evidence(...found.map((f) => [`<${f.tag}>`, `${f.count} occurrences`] as [string, string])),
        dedupeKey: "deprecated-html",
      });
    },
  },
  {
    id: "BP-006",
    name: "document.write()",
    category: "best-practices",
    severity: "medium",
    effort: "medium",
    description:
      "document.write() blocks parsing and can be ignored entirely by browsers on slow connections, which silently breaks whatever it injected.",
    detection: "Searches inline scripts for document.write( calls.",
    recommendation: "Insert nodes with DOM APIs, or load third-party scripts asynchronously.",
    check(ctx) {
      const inline = ctx
        .$("script:not([src])")
        .toArray()
        .map((el) => ctx.$(el).text())
        .filter((code) => /document\s*\.\s*write\s*\(/.test(code));
      if (!inline.length) return pass("No document.write() calls were found in inline scripts.");
      return fail({
        problem: `${plural(inline.length, "inline script")} use document.write().`,
        observed: `${inline.length} document.write() call sites`,
        expected: "DOM insertion APIs instead of document.write()",
        occurrences: inline.length,
        evidence: evidence(
          ...inline.slice(0, 3).map((code, i) => {
            const snippet = code.match(/document\s*\.\s*write\s*\([^)]{0,60}/)?.[0] ?? "";
            return [`Script ${i + 1}`, `${snippet}…`] as [string, string];
          }),
        ),
        dedupeKey: "document-write",
      });
    },
  },
  {
    id: "BP-007",
    name: "Broken internal links",
    category: "best-practices",
    severity: "high",
    effort: "easy",
    description:
      "Links that return 4xx or 5xx waste the visit and, for internal links, waste crawl budget too. They are also the easiest problem on this list to fix.",
    detection:
      "Requests each discovered link (HEAD, falling back to GET) and reports 4xx/5xx responses. External hosts that block bots are reported as unverified, never as broken.",
    recommendation: "Update or remove the broken links, or add redirects for URLs that moved.",
    check(ctx) {
      const checked = ctx.links.filter((link) => link.status !== null || !link.unverified);
      if (!checked.length) return skip("No links were checked in this run.");
      const broken = ctx.links.filter((link) => !link.unverified && link.status !== null && link.status >= 400);
      if (!broken.length) return pass(`All ${checked.length} checked links responded successfully.`);
      return fail({
        problem: `${plural(broken.length, "link")} on this page are broken.`,
        observed: broken.slice(0, 3).map((l) => `${l.status} ${shortUrl(l.url, 40)}`).join(", "),
        expected: "Every link returns 2xx or 3xx",
        occurrences: broken.length,
        severity: broken.some((l) => l.internal) ? "high" : "medium",
        evidence: evidence(
          ...broken.slice(0, 8).map((link) => [`HTTP ${link.status}`, `${link.internal ? "internal" : "external"} — ${link.url}`] as [string, string]),
        ),
        technicalDetails: broken.slice(0, 15).map((link) => ({ label: `HTTP ${link.status}`, value: `${link.url}${link.text ? ` ("${link.text}")` : ""}` })),
        dedupeKey: "broken-links",
      });
    },
  },
  {
    id: "BP-008",
    name: "Link redirects",
    category: "best-practices",
    severity: "low",
    effort: "easy",
    description: "Internal links that point at a redirect add an extra round trip for every visitor who clicks them.",
    detection: "Reports internal links whose first response is a 3xx redirect.",
    recommendation: "Update the href to the final destination URL.",
    check(ctx) {
      const checked = ctx.links.filter((link) => link.status !== null);
      if (!checked.length) return skip("No links were checked in this run.");
      const redirecting = checked.filter((link) => link.internal && link.status! >= 300 && link.status! < 400);
      if (!redirecting.length) return pass("No internal links point at a redirect.");
      return fail({
        problem: `${plural(redirecting.length, "internal link")} point at a URL that redirects.`,
        observed: `${redirecting.length} redirecting internal links`,
        expected: "Links point directly at the final URL",
        occurrences: redirecting.length,
        evidence: evidence(
          ...redirecting.slice(0, 6).map((link) => [`HTTP ${link.status}`, `${shortUrl(link.url, 40)} → ${shortUrl(link.redirectTo ?? "", 40)}`] as [string, string]),
        ),
        dedupeKey: "link-redirects",
      });
    },
  },
];
