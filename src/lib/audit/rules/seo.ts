import type { AuditRule } from "../types";
import { evidence, fail, pass, plural, shortUrl, skip } from "./helpers";

export const seoRules: AuditRule[] = [
  {
    id: "SEO-001",
    name: "Page title",
    category: "seo",
    severity: "high",
    effort: "easy",
    description:
      "The title is the clickable headline in search results and the label of the browser tab. Search engines weigh it heavily when matching a page to a query.",
    detection: "Reads the first <title> element and checks that it exists and is between 10 and 65 characters.",
    recommendation:
      "Write a unique, descriptive title of roughly 50–60 characters that contains the page's main topic and your brand.",
    impact: "Affects how the page appears in search results and how well it matches searches.",
    references: ["https://developers.google.com/search/docs/appearance/title-link"],
    check(ctx) {
      const title = ctx.$("head title").first().text().trim();
      if (!title) {
        return fail({
          problem: "This page has no title tag.",
          observed: "No <title> element found in <head>",
          expected: "A unique title of about 50–60 characters",
          evidence: evidence(["Element", "<title>"], ["Found", "none"]),
          technicalFix: `<title>Your page topic | Brand name</title>`,
          dedupeKey: "title",
        });
      }
      if (title.length < 10 || title.length > 65) {
        const tooShort = title.length < 10;
        return fail({
          problem: tooShort
            ? `The page title is very short (${title.length} characters).`
            : `The page title is long (${title.length} characters) and will likely be truncated in search results.`,
          observed: `"${title}" (${title.length} characters)`,
          expected: "10–65 characters",
          severity: "medium",
          evidence: evidence(["Title", title], ["Length", `${title.length} characters`]),
          dedupeKey: "title",
        });
      }
      return pass(`Title is ${title.length} characters: "${title}"`);
    },
  },
  {
    id: "SEO-002",
    name: "Meta description",
    category: "seo",
    severity: "medium",
    effort: "easy",
    description:
      "The meta description is the snippet search engines usually show under your title. A good one improves click-through rate even though it is not a direct ranking factor.",
    detection: "Looks for <meta name=\"description\"> and checks the content is between 50 and 165 characters.",
    recommendation: "Add a 120–160 character description that summarises the page and invites the click.",
    impact: "Affects click-through rate from search results.",
    references: ["https://developers.google.com/search/docs/appearance/snippet"],
    check(ctx) {
      const content = ctx.$('head meta[name="description"]').attr("content")?.trim() ?? "";
      if (!content) {
        return fail({
          problem: "This page has no meta description.",
          observed: 'No <meta name="description"> tag',
          expected: "A 120–160 character summary of the page",
          evidence: evidence(["Element", '<meta name="description">'], ["Found", "none"]),
          technicalFix: `<meta name="description" content="A short, specific summary of this page in about 150 characters.">`,
          dedupeKey: "meta-description",
        });
      }
      if (content.length < 50 || content.length > 165) {
        return fail({
          problem:
            content.length < 50
              ? `The meta description is very short (${content.length} characters).`
              : `The meta description is ${content.length} characters and will be cut off in search results.`,
          observed: `"${content.slice(0, 120)}${content.length > 120 ? "…" : ""}" (${content.length} characters)`,
          expected: "50–165 characters",
          severity: "low",
          evidence: evidence(["Length", `${content.length} characters`]),
          dedupeKey: "meta-description",
        });
      }
      return pass(`Meta description present (${content.length} characters).`);
    },
  },
  {
    id: "SEO-003",
    name: "Canonical URL",
    category: "seo",
    severity: "medium",
    effort: "easy",
    description:
      "A canonical link tells search engines which URL is the master copy of a page, preventing duplicate-content dilution across parameter and protocol variants.",
    detection: "Checks for a single, absolute <link rel=\"canonical\"> and compares its origin with the audited page.",
    recommendation: "Add exactly one absolute canonical link pointing at the preferred version of this page.",
    references: ["https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls"],
    check(ctx) {
      const links = ctx.$('link[rel="canonical"]');
      if (links.length === 0) {
        return fail({
          problem: "No canonical URL is declared.",
          observed: 'No <link rel="canonical"> tag',
          expected: `<link rel="canonical" href="${ctx.finalUrl}">`,
          evidence: evidence(["Audited URL", ctx.finalUrl]),
          technicalFix: `<link rel="canonical" href="${ctx.finalUrl}">`,
          dedupeKey: "canonical",
        });
      }
      if (links.length > 1) {
        return fail({
          problem: `This page declares ${links.length} canonical URLs, which search engines may ignore entirely.`,
          observed: `${links.length} canonical tags`,
          expected: "Exactly one canonical tag",
          occurrences: links.length,
          evidence: evidence(...links.toArray().map((el, i) => [`Canonical ${i + 1}`, ctx.$(el).attr("href") ?? ""] as [string, string])),
          dedupeKey: "canonical",
        });
      }
      const href = links.attr("href")?.trim() ?? "";
      let resolved: string | null = null;
      try {
        resolved = new URL(href, ctx.finalUrl).href;
      } catch {
        resolved = null;
      }
      if (!resolved) {
        return fail({
          problem: "The canonical URL is not a valid address.",
          observed: href || "(empty)",
          expected: "An absolute https URL",
          evidence: evidence(["href", href]),
          dedupeKey: "canonical",
        });
      }
      if (new URL(resolved).origin !== ctx.origin) {
        return fail({
          problem: "The canonical URL points at a different domain, which tells search engines not to index this page.",
          observed: resolved,
          expected: `A URL on ${ctx.origin}`,
          severity: "high",
          evidence: evidence(["Canonical", resolved], ["Page origin", ctx.origin]),
          dedupeKey: "canonical",
        });
      }
      return pass(`Canonical URL declared: ${resolved}`);
    },
  },
  {
    id: "SEO-004",
    name: "Viewport meta tag",
    category: "seo",
    severity: "high",
    effort: "easy",
    description:
      "Without a viewport meta tag mobile browsers render the page at desktop width and zoom out, which hurts both mobile usability and mobile search performance.",
    detection: 'Checks for <meta name="viewport"> containing a width directive.',
    recommendation: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to the <head>.',
    references: ["https://developer.mozilla.org/docs/Web/HTML/Viewport_meta_tag"],
    check(ctx) {
      const content = ctx.$('meta[name="viewport"]').attr("content")?.trim() ?? "";
      if (!content || !/width\s*=/i.test(content)) {
        return fail({
          problem: "This page has no usable mobile viewport tag.",
          observed: content || "No viewport meta tag",
          expected: "width=device-width, initial-scale=1",
          evidence: evidence(["Element", '<meta name="viewport">'], ["Content", content || "none"]),
          technicalFix: `<meta name="viewport" content="width=device-width, initial-scale=1">`,
          dedupeKey: "viewport",
        });
      }
      return pass(`Viewport configured: ${content}`);
    },
  },
  {
    id: "SEO-005",
    name: "Single descriptive H1",
    category: "seo",
    severity: "medium",
    effort: "easy",
    description:
      "The H1 is the main on-page heading. Search engines and screen readers use it to understand what the page is about.",
    detection: "Counts <h1> elements with non-empty text content.",
    recommendation: "Use exactly one H1 that describes the page content.",
    check(ctx) {
      const headings = ctx
        .$("h1")
        .toArray()
        .map((el) => ctx.$(el).text().replace(/\s+/g, " ").trim())
        .filter(Boolean);
      if (headings.length === 0) {
        return fail({
          problem: "This page has no H1 heading.",
          observed: "0 non-empty <h1> elements",
          expected: "Exactly 1 descriptive H1",
          evidence: evidence(["H1 count", 0]),
          technicalFix: "<h1>The main topic of this page</h1>",
          dedupeKey: "h1",
        });
      }
      if (headings.length > 1) {
        return fail({
          problem: `This page has ${headings.length} H1 headings, which blurs the page's main topic.`,
          observed: `${headings.length} H1 elements`,
          expected: "Exactly 1 H1",
          severity: "low",
          occurrences: headings.length,
          evidence: evidence(...headings.slice(0, 5).map((text, i) => [`H1 ${i + 1}`, text] as [string, string])),
          dedupeKey: "h1",
        });
      }
      return pass(`One H1 found: "${headings[0].slice(0, 80)}"`);
    },
  },
  {
    id: "SEO-006",
    name: "Indexability (robots directives)",
    category: "seo",
    severity: "critical",
    effort: "easy",
    description:
      "A noindex directive removes the page from search results entirely. It is usually left behind by accident after a staging deploy.",
    detection: 'Reads <meta name="robots"> and the X-Robots-Tag response header for noindex/nofollow directives.',
    recommendation: "Remove the noindex directive if this page should appear in search results.",
    check(ctx) {
      const meta = ctx.$('meta[name="robots"], meta[name="googlebot"]').attr("content")?.toLowerCase() ?? "";
      const header = (ctx.headers["x-robots-tag"] ?? "").toLowerCase();
      const combined = `${meta} ${header}`;
      if (combined.includes("noindex")) {
        return fail({
          problem: "This page tells search engines not to index it.",
          observed: meta.includes("noindex") ? `<meta name="robots" content="${meta}">` : `X-Robots-Tag: ${header}`,
          expected: "No noindex directive",
          evidence: evidence(["Meta robots", meta || "none"], ["X-Robots-Tag", header || "none"]),
          dedupeKey: "noindex",
        });
      }
      if (combined.includes("nofollow")) {
        return fail({
          problem: "This page asks search engines not to follow any of its links.",
          observed: `nofollow directive: ${meta || header}`,
          expected: "No site-wide nofollow directive",
          severity: "medium",
          evidence: evidence(["Directive", meta || header]),
          dedupeKey: "nofollow",
        });
      }
      return pass("No noindex or nofollow directives block this page.");
    },
  },
  {
    id: "SEO-007",
    name: "robots.txt",
    category: "seo",
    severity: "medium",
    effort: "easy",
    description:
      "robots.txt tells crawlers which parts of the site they may request and where the sitemap lives. A missing file is not fatal, but a blocking one is.",
    detection: "Requests /robots.txt and inspects the wildcard user-agent group.",
    recommendation: "Publish a robots.txt at the domain root and reference your sitemap from it.",
    check(ctx) {
      if (!ctx.robots.found) {
        return fail({
          problem: "No robots.txt was found at the domain root.",
          observed: `${ctx.robots.url} returned ${ctx.robots.status ?? "no response"}`,
          expected: "HTTP 200 with crawl directives",
          severity: "low",
          evidence: evidence(["URL", ctx.robots.url], ["Status", ctx.robots.status ?? "no response"]),
          technicalFix: `User-agent: *\nAllow: /\n\nSitemap: ${ctx.origin}/sitemap.xml`,
          dedupeKey: "robots-txt",
        });
      }
      if (ctx.robots.disallowsEverything) {
        return fail({
          problem: "robots.txt blocks all crawlers from the entire site.",
          observed: "User-agent: * / Disallow: /",
          expected: "Crawling allowed for the pages you want indexed",
          severity: "critical",
          evidence: evidence(["URL", ctx.robots.url], ["Rule", "Disallow: /"]),
          dedupeKey: "robots-block",
        });
      }
      return pass(`robots.txt found${ctx.robots.sitemaps.length ? ` and references ${plural(ctx.robots.sitemaps.length, "sitemap")}` : ""}.`);
    },
  },
  {
    id: "SEO-008",
    name: "XML sitemap",
    category: "seo",
    severity: "medium",
    effort: "easy",
    description:
      "A sitemap helps search engines discover every page you care about, especially pages that are not well linked internally.",
    detection: "Follows sitemap entries in robots.txt, then tries /sitemap.xml and /sitemap_index.xml.",
    recommendation: "Publish an XML sitemap and reference it from robots.txt.",
    check(ctx) {
      if (!ctx.sitemap.found) {
        return fail({
          problem: "No XML sitemap could be found.",
          observed: "robots.txt, /sitemap.xml and /sitemap_index.xml returned no sitemap",
          expected: "A reachable XML sitemap",
          evidence: evidence(["Checked", `${ctx.origin}/sitemap.xml`], ["robots.txt sitemaps", ctx.robots.sitemaps.join(", ") || "none"]),
          dedupeKey: "sitemap",
        });
      }
      return pass(`Sitemap found at ${ctx.sitemap.url} (${ctx.sitemap.urlCount ?? "unknown"} URLs).`);
    },
  },
  {
    id: "SEO-009",
    name: "Open Graph metadata",
    category: "seo",
    severity: "low",
    effort: "easy",
    description:
      "Open Graph tags control the title, description and image shown when the page is shared on social platforms and messaging apps.",
    detection: "Checks for og:title, og:description and og:image.",
    recommendation: "Add og:title, og:description, og:image and og:url to the <head>.",
    references: ["https://ogp.me/"],
    check(ctx) {
      const get = (property: string) => ctx.$(`meta[property="${property}"], meta[name="${property}"]`).attr("content")?.trim();
      const missing = (["og:title", "og:description", "og:image"] as const).filter((tag) => !get(tag));
      if (missing.length) {
        return fail({
          problem: `Shared links will look plain: ${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} missing.`,
          observed: `Missing: ${missing.join(", ")}`,
          expected: "og:title, og:description and og:image present",
          occurrences: missing.length,
          evidence: evidence(
            ["og:title", get("og:title") ?? "missing"],
            ["og:description", get("og:description") ?? "missing"],
            ["og:image", get("og:image") ?? "missing"],
          ),
          technicalFix: `<meta property="og:title" content="…">\n<meta property="og:description" content="…">\n<meta property="og:image" content="https://…/share.png">`,
          dedupeKey: "open-graph",
        });
      }
      return pass("Open Graph title, description and image are present.");
    },
  },
  {
    id: "SEO-010",
    name: "Twitter/X card metadata",
    category: "seo",
    severity: "low",
    effort: "easy",
    description: "Twitter/X card tags control how links to the page render on X and in several other apps that reuse the format.",
    detection: 'Checks for <meta name="twitter:card">.',
    recommendation: 'Add <meta name="twitter:card" content="summary_large_image"> plus twitter:title and twitter:description.',
    check(ctx) {
      const card = ctx.$('meta[name="twitter:card"]').attr("content")?.trim();
      const hasOgImage = Boolean(ctx.$('meta[property="og:image"]').attr("content"));
      if (!card) {
        return fail({
          problem: "No Twitter/X card metadata was found.",
          observed: 'No <meta name="twitter:card">',
          expected: 'twitter:card, ideally "summary_large_image"',
          evidence: evidence(["Fallback og:image", hasOgImage ? "present" : "missing"]),
          technicalFix: `<meta name="twitter:card" content="summary_large_image">`,
          dedupeKey: "twitter-card",
        });
      }
      return pass(`Twitter card configured: ${card}`);
    },
  },
  {
    id: "SEO-011",
    name: "Structured data (JSON-LD)",
    category: "seo",
    severity: "low",
    effort: "medium",
    description:
      "Structured data lets search engines understand entities on the page and can unlock rich results such as breadcrumbs, FAQs and product cards.",
    detection: "Parses every <script type=\"application/ld+json\"> block, validates JSON syntax and checks for @context/@type.",
    recommendation: "Add valid schema.org JSON-LD that describes what this page represents.",
    references: ["https://schema.org/", "https://developers.google.com/search/docs/appearance/structured-data"],
    check(ctx) {
      const blocks = ctx.$('script[type="application/ld+json"]').toArray();
      if (!blocks.length) {
        return fail({
          problem: "No structured data (JSON-LD) was found on this page.",
          observed: "0 application/ld+json blocks",
          expected: "At least one valid schema.org JSON-LD block",
          evidence: evidence(["Blocks found", 0]),
          technicalFix: `<script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"…","url":"${ctx.origin}"}</script>`,
          dedupeKey: "structured-data",
        });
      }
      const broken: string[] = [];
      const types: string[] = [];
      blocks.forEach((block, index) => {
        const raw = ctx.$(block).contents().text().trim();
        try {
          const parsed = JSON.parse(raw);
          const items = Array.isArray(parsed) ? parsed : [parsed];
          items.forEach((item) => {
            if (!item || typeof item !== "object") return;
            if (!("@context" in item)) broken.push(`Block ${index + 1}: missing @context`);
            if (!("@type" in item)) broken.push(`Block ${index + 1}: missing @type`);
            else types.push(String(item["@type"]));
          });
        } catch {
          broken.push(`Block ${index + 1}: invalid JSON`);
        }
      });
      if (broken.length) {
        return fail({
          problem: "Structured data is present but invalid, so search engines will ignore it.",
          observed: broken.join("; "),
          expected: "Valid JSON with @context and @type",
          severity: "medium",
          occurrences: broken.length,
          evidence: evidence(...broken.slice(0, 5).map((b, i) => [`Problem ${i + 1}`, b] as [string, string])),
          dedupeKey: "structured-data",
        });
      }
      return pass(`Valid JSON-LD found (${types.join(", ") || "typed blocks"}).`);
    },
  },
  {
    id: "SEO-012",
    name: "Redirect chain",
    category: "seo",
    severity: "medium",
    effort: "medium",
    description:
      "Each redirect adds a round trip before anything renders and dilutes crawl budget. Chains of two or more are worth collapsing.",
    detection: "Follows redirects manually and records every hop between the requested URL and the final page.",
    recommendation: "Point the first URL directly at the final destination so only one hop (or none) remains.",
    check(ctx) {
      const chain = ctx.redirectChain;
      if (chain.length >= 2) {
        return fail({
          problem: `Reaching this page takes ${plural(chain.length, "redirect")} before the real content loads.`,
          observed: [ctx.requestedUrl, ...chain.map((hop) => hop.location)].join(" → "),
          expected: "At most one redirect",
          occurrences: chain.length,
          evidence: evidence(...chain.map((hop, i) => [`Hop ${i + 1} (${hop.status})`, `${hop.url} → ${hop.location}`] as [string, string])),
          dedupeKey: "redirect-chain",
        });
      }
      return pass(chain.length === 1 ? "A single redirect leads to the final URL." : "The URL resolves without redirects.");
    },
  },
  {
    id: "SEO-013",
    name: "hreflang annotations",
    category: "seo",
    severity: "low",
    effort: "medium",
    description:
      "When a site serves multiple languages, hreflang tells search engines which version to show. Broken annotations can send users to the wrong language.",
    detection: "Validates language codes in <link rel=\"alternate\" hreflang> and checks for a self-referencing entry.",
    recommendation: "Use valid BCP-47 codes and include a self-referencing hreflang for this page.",
    check(ctx) {
      const links = ctx.$('link[rel="alternate"][hreflang]').toArray();
      if (!links.length) return skip("This page declares no hreflang annotations (only needed for multi-language sites).");
      const problems: string[] = [];
      let selfReference = false;
      links.forEach((el) => {
        const lang = ctx.$(el).attr("hreflang")?.trim() ?? "";
        const href = ctx.$(el).attr("href")?.trim() ?? "";
        if (!/^(x-default|[a-z]{2,3}(-[A-Za-z]{2,4})?(-[A-Za-z]{2})?)$/i.test(lang)) problems.push(`Invalid hreflang "${lang}"`);
        if (!href) problems.push(`hreflang "${lang}" has no href`);
        try {
          if (href && new URL(href, ctx.finalUrl).href === ctx.finalUrl) selfReference = true;
        } catch {
          problems.push(`hreflang "${lang}" has an invalid href`);
        }
      });
      if (!selfReference) problems.push("No self-referencing hreflang for this URL");
      if (problems.length) {
        return fail({
          problem: "The hreflang annotations on this page are incomplete or invalid.",
          observed: problems.join("; "),
          expected: "Valid BCP-47 codes plus a self-referencing entry",
          occurrences: problems.length,
          evidence: evidence(...problems.slice(0, 5).map((p, i) => [`Problem ${i + 1}`, p] as [string, string])),
          dedupeKey: "hreflang",
        });
      }
      return pass(`${plural(links.length, "hreflang annotation")} look valid.`);
    },
  },
  {
    id: "SEO-014",
    name: "Crawlable text content",
    category: "seo",
    severity: "high",
    effort: "hard",
    description:
      "If the HTML response contains almost no text, search engines that do not execute JavaScript see an empty page. Client-side-only rendering is the usual cause.",
    detection: "Strips script/style/noscript nodes from the server HTML and counts the remaining words.",
    recommendation:
      "Server-render or pre-render the main content so it exists in the initial HTML response.",
    check(ctx) {
      const clone = ctx.$.root().clone();
      clone.find("script, style, noscript, template, svg").remove();
      const text = clone.find("body").text().replace(/\s+/g, " ").trim();
      const words = text ? text.split(" ").length : 0;
      if (words < 60) {
        return fail({
          problem: `The HTML delivered by the server contains only ${plural(words, "word")} of text.`,
          observed: `${words} words in the server-rendered HTML`,
          expected: "Meaningful content present in the initial HTML",
          evidence: evidence(
            ["Words in HTML", words],
            ["HTML size", `${(ctx.htmlBytes / 1024).toFixed(0)} KB`],
            ["Detected framework", ctx.technologies.find((t) => t.category === "framework")?.name ?? "unknown"],
          ),
          dedupeKey: "thin-html",
        });
      }
      return pass(`The server HTML contains ${words} words of crawlable text.`);
    },
  },
  {
    id: "SEO-015",
    name: "Favicon",
    category: "seo",
    severity: "low",
    effort: "easy",
    description: "A favicon is shown in browser tabs, bookmarks and some search result layouts. Its absence looks unfinished.",
    detection: 'Looks for <link rel="icon"> variants in the HTML, then probes /favicon.ico via the collected resources.',
    recommendation: 'Add <link rel="icon" href="/favicon.ico"> (plus an SVG or 180×180 PNG for modern devices).',
    check(ctx) {
      const icon = ctx.$('link[rel~="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]').first();
      const href = icon.attr("href");
      if (!href) {
        return fail({
          problem: "No favicon is declared in the page HTML.",
          observed: 'No <link rel="icon"> element',
          expected: "A declared favicon",
          evidence: evidence(["Checked", 'link[rel~="icon"], link[rel="apple-touch-icon"]']),
          technicalFix: `<link rel="icon" href="/favicon.ico" sizes="any">`,
          dedupeKey: "favicon",
        });
      }
      return pass(`Favicon declared: ${shortUrl(href)}`);
    },
  },
];
