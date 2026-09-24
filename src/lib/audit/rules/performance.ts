import type { AuditRule, FindingDraft, ImageInfo } from "../types";
import { evidence, fail, formatBytes, formatMs, pass, plural, shortUrl, skip, sumBytes } from "./helpers";

const MODERN_FORMATS = ["WEBP", "AVIF", "SVG"];
const OVERSIZED_IMAGE_BYTES = 500 * 1024;
const LARGE_JS_BYTES = 500 * 1024;
const LARGE_CSS_BYTES = 150 * 1024;
const HEAVY_PAGE_BYTES = 2.5 * 1024 * 1024;

function imageDetails(image: ImageInfo) {
  return evidence(
    ["Resource", image.url],
    ["Element", image.element],
    ["Size", formatBytes(image.bytes)],
    ["Format", image.format ?? "unknown"],
    ["Intrinsic dimensions", image.intrinsicWidth ? `${image.intrinsicWidth}×${image.intrinsicHeight}` : null],
    ["Layout attributes", image.widthAttr ? `${image.widthAttr}×${image.heightAttr ?? "?"}` : null],
    ["Loading", image.loading ?? "eager (default)"],
  );
}

export const performanceRules: AuditRule[] = [
  {
    id: "PERF-IMG-001",
    name: "Oversized images",
    category: "performance",
    severity: "high",
    effort: "easy",
    description:
      "Images are usually the heaviest thing on a page. Anything above ~500 KB delays the largest contentful paint, especially on mobile data.",
    detection: "Measures every discovered image with a HEAD (or ranged GET) request and flags files larger than 500 KB.",
    recommendation: "Compress the image, serve it at the size it is actually displayed, and use WebP or AVIF.",
    impact: "Directly delays how quickly the main content appears.",
    check(ctx) {
      const measured = ctx.images.filter((image) => typeof image.bytes === "number");
      if (!measured.length) return skip("No image sizes could be measured for this page.");
      const oversized = measured
        .filter((image) => (image.bytes as number) > OVERSIZED_IMAGE_BYTES)
        .sort((a, b) => (b.bytes as number) - (a.bytes as number));
      if (!oversized.length) return pass(`All ${measured.length} measured images are under 500 KB.`);

      return fail(
        ...oversized.slice(0, 6).map((image): FindingDraft => {
          const bytes = image.bytes as number;
          const isModern = MODERN_FORMATS.includes((image.format ?? "").toUpperCase());
          const savingShare = isModern ? 0.35 : 0.7;
          return {
            problem: `The image ${shortUrl(image.url, 40)} is ${formatBytes(bytes)}.`,
            observed: `${formatBytes(bytes)} ${image.format ?? "image"}`,
            expected: "Under 500 KB in a modern format (WebP/AVIF)",
            url: image.url,
            element: image.element,
            severity: bytes > 1.5 * 1024 * 1024 ? "critical" : "high",
            evidence: imageDetails(image),
            technicalDetails: evidence(
              ["Potential saving", `~${formatBytes(Math.round(bytes * savingShare))} (${Math.round(savingShare * 100)}% at typical ${isModern ? "recompression" : "WebP"} ratios)`],
              ["Suggested", "WebP / AVIF, sized to the largest rendered dimension"],
              ["Cache-Control", image.cacheControl ?? "not set"],
            ),
            howToFix: `Export ${shortUrl(image.url, 30)} as WebP or AVIF at the dimensions it is actually displayed, then re-upload it.`,
            technicalFix: `<picture>\n  <source srcset="/images/hero.avif" type="image/avif">\n  <source srcset="/images/hero.webp" type="image/webp">\n  <img src="/images/hero.jpg" width="1200" height="630" alt="…">\n</picture>`,
            dedupeKey: `oversized-image:${image.url}`,
          };
        }),
      );
    },
  },
  {
    id: "PERF-IMG-002",
    name: "Modern image formats",
    category: "performance",
    severity: "medium",
    effort: "easy",
    description:
      "WebP and AVIF typically produce 25–50% smaller files than JPEG and PNG at the same visual quality.",
    detection: "Flags measured PNG/JPEG/GIF images larger than 100 KB.",
    recommendation: "Serve WebP or AVIF with a <picture> element that falls back to the original format.",
    check(ctx) {
      const candidates = ctx.images.filter(
        (image) =>
          typeof image.bytes === "number" &&
          image.bytes > 100 * 1024 &&
          ["PNG", "JPG", "JPEG", "GIF"].includes((image.format ?? "").toUpperCase()),
      );
      if (!ctx.images.some((image) => typeof image.bytes === "number")) return skip("No image sizes could be measured.");
      if (!candidates.length) return pass("No large legacy-format images were found.");
      const total = sumBytes(candidates) ?? 0;
      return fail({
        problem: `${plural(candidates.length, "image")} still use legacy formats (${[...new Set(candidates.map((i) => i.format))].join(", ")}).`,
        observed: `${candidates.length} legacy-format images totalling ${formatBytes(total)}`,
        expected: "WebP or AVIF for photographic content",
        occurrences: candidates.length,
        evidence: evidence(
          ...candidates.slice(0, 5).map((image, i) => [`Image ${i + 1}`, `${shortUrl(image.url, 45)} — ${formatBytes(image.bytes)} ${image.format}`] as [string, string]),
        ),
        technicalDetails: evidence(["Combined size", formatBytes(total)], ["Estimated saving at 30% ratio", formatBytes(Math.round(total * 0.3))]),
        dedupeKey: "legacy-image-formats",
      });
    },
  },
  {
    id: "PERF-IMG-003",
    name: "Images declare dimensions",
    category: "performance",
    severity: "medium",
    effort: "easy",
    description:
      "Without width and height (or a CSS aspect-ratio) the browser does not know how much space to reserve, so content jumps as images load. That is measured as Cumulative Layout Shift.",
    detection: "Checks each <img> for width and height attributes.",
    recommendation: "Add width and height attributes matching the image's aspect ratio.",
    check(ctx) {
      if (!ctx.images.length) return skip("This page contains no images.");
      const missing = ctx.images.filter((image) => !image.widthAttr || !image.heightAttr);
      if (!missing.length) return pass(`All ${ctx.images.length} images declare width and height.`);
      return fail({
        problem: `${plural(missing.length, "image")} do not declare width and height, which can make the layout jump while loading.`,
        observed: `${missing.length} of ${ctx.images.length} images without dimensions`,
        expected: "width and height attributes on every <img>",
        occurrences: missing.length,
        element: missing[0].element,
        evidence: evidence(
          ...missing.slice(0, 5).map((image, i) => [
            `Image ${i + 1}`,
            `${image.element} ${shortUrl(image.url, 40)}${image.intrinsicWidth ? ` (intrinsic ${image.intrinsicWidth}×${image.intrinsicHeight})` : ""}`,
          ] as [string, string]),
        ),
        technicalFix: `<img src="/images/hero.webp" width="1200" height="630" alt="…">`,
        dedupeKey: "image-dimensions",
      });
    },
  },
  {
    id: "PERF-IMG-004",
    name: "Offscreen images are lazy-loaded",
    category: "performance",
    severity: "low",
    effort: "easy",
    description:
      "Images far below the fold do not need to be downloaded during the initial load. loading=\"lazy\" defers them until the user scrolls near them.",
    detection: "When a page has more than six images, checks whether any of the later ones use loading=\"lazy\".",
    recommendation: 'Add loading="lazy" to images below the fold (never to the hero/LCP image).',
    check(ctx) {
      if (ctx.images.length <= 6) return skip("Too few images for lazy loading to matter.");
      const below = ctx.images.slice(3);
      const eager = below.filter((image) => image.loading !== "lazy");
      if (eager.length <= 2) return pass("Images below the fold are lazy-loaded.");
      return fail({
        problem: `${plural(eager.length, "image")} further down the page load immediately instead of on scroll.`,
        observed: `${eager.length} images without loading="lazy"`,
        expected: 'loading="lazy" on offscreen images',
        occurrences: eager.length,
        evidence: evidence(...eager.slice(0, 5).map((image, i) => [`Image ${i + 1}`, shortUrl(image.url, 50)] as [string, string])),
        technicalFix: `<img src="…" loading="lazy" decoding="async" width="…" height="…" alt="…">`,
        dedupeKey: "lazy-loading",
      });
    },
  },
  {
    id: "PERF-001",
    name: "Render-blocking scripts",
    category: "performance",
    severity: "high",
    effort: "medium",
    description:
      "A <script src> in the <head> without async or defer stops HTML parsing until the file is downloaded and executed, delaying first paint.",
    detection: "Counts script elements inside <head> that have a src but neither async, defer nor type=\"module\".",
    recommendation: "Add defer (or move the script to the end of <body>) unless it must run before the page renders.",
    check(ctx) {
      const blocking = ctx
        .$("head script[src]")
        .toArray()
        .filter((el) => {
          const node = ctx.$(el);
          return node.attr("async") === undefined && node.attr("defer") === undefined && node.attr("type") !== "module";
        })
        .map((el) => ctx.$(el).attr("src") ?? "");
      if (!ctx.$("head script[src]").length) return pass("No render-blocking scripts in the document head.");
      if (!blocking.length) return pass("All head scripts use async, defer or module loading.");
      return fail({
        problem: `${plural(blocking.length, "script")} in the page head block rendering until they finish loading.`,
        observed: `${blocking.length} blocking <script src> in <head>`,
        expected: "async, defer, or scripts loaded at the end of <body>",
        occurrences: blocking.length,
        evidence: evidence(...blocking.slice(0, 5).map((src, i) => [`Script ${i + 1}`, shortUrl(src, 60)] as [string, string])),
        technicalFix: `<script src="/js/app.js" defer></script>`,
        dedupeKey: "render-blocking-js",
      });
    },
  },
  {
    id: "PERF-002",
    name: "JavaScript payload size",
    category: "performance",
    severity: "high",
    effort: "hard",
    description:
      "JavaScript is the most expensive resource type: it has to be downloaded, parsed and executed on the main thread before the page becomes interactive.",
    detection: "Sums the transfer size of every external script referenced by the HTML.",
    recommendation: "Code-split, drop unused dependencies, and load non-critical scripts after interaction.",
    check(ctx) {
      const measured = ctx.scripts.filter((script) => typeof script.bytes === "number");
      if (!measured.length) return skip("No script sizes could be measured.");
      const total = sumBytes(measured) ?? 0;
      if (total <= LARGE_JS_BYTES) return pass(`JavaScript payload is ${formatBytes(total)} across ${plural(measured.length, "file")}.`);
      const biggest = [...measured].sort((a, b) => (b.bytes as number) - (a.bytes as number));
      return fail({
        problem: `This page downloads ${formatBytes(total)} of JavaScript across ${plural(measured.length, "file")}.`,
        observed: formatBytes(total),
        expected: "Under 500 KB of JavaScript for a typical page",
        occurrences: measured.length,
        severity: total > 1024 * 1024 ? "critical" : "high",
        evidence: evidence(
          ...biggest.slice(0, 5).map((s, i) => [`Script ${i + 1}`, `${shortUrl(s.url, 50)} — ${formatBytes(s.bytes)}`] as [string, string]),
        ),
        technicalDetails: evidence(["Total", formatBytes(total)], ["Files", measured.length], ["Largest", `${biggest[0].url} (${formatBytes(biggest[0].bytes)})`]),
        dedupeKey: "js-size",
      });
    },
  },
  {
    id: "PERF-003",
    name: "CSS payload size",
    category: "performance",
    severity: "medium",
    effort: "medium",
    description: "Stylesheets block rendering: the browser will not paint until every stylesheet in the head has loaded.",
    detection: "Sums the transfer size of every external stylesheet referenced by the HTML.",
    recommendation: "Remove unused CSS, split per-route styles, and inline only what is needed above the fold.",
    check(ctx) {
      const measured = ctx.stylesheets.filter((sheet) => typeof sheet.bytes === "number");
      if (!measured.length) return skip("No stylesheet sizes could be measured.");
      const total = sumBytes(measured) ?? 0;
      if (total <= LARGE_CSS_BYTES) return pass(`CSS payload is ${formatBytes(total)} across ${plural(measured.length, "file")}.`);
      return fail({
        problem: `This page loads ${formatBytes(total)} of CSS before it can render.`,
        observed: formatBytes(total),
        expected: "Under 150 KB of render-blocking CSS",
        occurrences: measured.length,
        evidence: evidence(
          ...[...measured]
            .sort((a, b) => (b.bytes as number) - (a.bytes as number))
            .slice(0, 5)
            .map((s, i) => [`Stylesheet ${i + 1}`, `${shortUrl(s.url, 50)} — ${formatBytes(s.bytes)}`] as [string, string]),
        ),
        dedupeKey: "css-size",
      });
    },
  },
  {
    id: "PERF-004",
    name: "Total page weight",
    category: "performance",
    severity: "medium",
    effort: "medium",
    description:
      "Page weight is the sum of everything the browser must download. Heavy pages are slow and expensive on mobile data plans.",
    detection: "Adds the HTML document size to every measured image, script, stylesheet and font.",
    recommendation: "Reduce the biggest contributors first — usually images, then JavaScript.",
    check(ctx) {
      const resources = [...ctx.images, ...ctx.scripts, ...ctx.stylesheets, ...ctx.fonts];
      const measuredBytes = sumBytes(resources);
      if (measuredBytes === null) return skip("No resource sizes could be measured.");
      const total = measuredBytes + ctx.htmlBytes;
      if (total <= HEAVY_PAGE_BYTES) return pass(`Measured page weight is ${formatBytes(total)}.`);
      return fail({
        problem: `The measured page weight is ${formatBytes(total)}.`,
        observed: formatBytes(total),
        expected: "Under 2.5 MB for the initial page load",
        evidence: evidence(
          ["HTML", formatBytes(ctx.htmlBytes)],
          ["Images", formatBytes(sumBytes(ctx.images) ?? 0)],
          ["JavaScript", formatBytes(sumBytes(ctx.scripts) ?? 0)],
          ["CSS", formatBytes(sumBytes(ctx.stylesheets) ?? 0)],
          ["Fonts", formatBytes(sumBytes(ctx.fonts) ?? 0)],
          ["Measured resources", resources.filter((r) => r.bytes !== null).length],
        ),
        dedupeKey: "page-weight",
      });
    },
  },
  {
    id: "PERF-005",
    name: "Server response time",
    category: "performance",
    severity: "high",
    effort: "hard",
    description:
      "Time to first byte is how long the server takes to start replying. Everything else — rendering, images, scripts — waits behind it.",
    detection: "Measures the time between opening the connection and receiving the first byte of the HTML document from this audit server.",
    recommendation: "Cache HTML at the edge, speed up server-side rendering, or put a CDN in front of the origin.",
    check(ctx) {
      if (!ctx.ttfbMs) return skip("Response time was not measured in this run.");
      if (ctx.ttfbMs <= 800) return pass(`The server responded in ${formatMs(ctx.ttfbMs)}.`);
      return fail({
        problem: `The server took ${formatMs(ctx.ttfbMs)} to send the first byte of HTML.`,
        observed: formatMs(ctx.ttfbMs),
        expected: "Under 800 ms",
        severity: ctx.ttfbMs > 1800 ? "critical" : "high",
        evidence: evidence(
          ["Measured TTFB", formatMs(ctx.ttfbMs)],
          ["Full HTML download", formatMs(ctx.htmlLoadMs)],
          ["Server", ctx.headers["server"] ?? "not disclosed"],
          ["Cache status", ctx.headers["cf-cache-status"] ?? ctx.headers["x-vercel-cache"] ?? ctx.headers["age"] ?? "unknown"],
        ),
        technicalDetails: evidence(["Note", "Measured from the audit server, so network distance to your users may differ."]),
        dedupeKey: "ttfb",
      });
    },
  },
  {
    id: "PERF-006",
    name: "Request count",
    category: "performance",
    severity: "low",
    effort: "medium",
    description: "Every request costs a round trip. Bundling and sprite-free icon systems keep the count sane.",
    detection: "Counts images, scripts, stylesheets, fonts and embedded media referenced by the initial HTML.",
    recommendation: "Bundle scripts and styles, inline small icons, and lazy-load what is not needed immediately.",
    check(ctx) {
      const count = ctx.images.length + ctx.scripts.length + ctx.stylesheets.length + ctx.fonts.length + ctx.otherResources.length;
      if (count <= 80) return pass(`The initial HTML references ${count} resources.`);
      return fail({
        problem: `The initial HTML references ${count} separate resources.`,
        observed: `${count} requests`,
        expected: "Roughly 80 or fewer for the initial load",
        occurrences: count,
        evidence: evidence(
          ["Images", ctx.images.length],
          ["Scripts", ctx.scripts.length],
          ["Stylesheets", ctx.stylesheets.length],
          ["Fonts", ctx.fonts.length],
          ["Media/iframes", ctx.otherResources.length],
        ),
        dedupeKey: "request-count",
      });
    },
  },
  {
    id: "PERF-007",
    name: "Web font loading",
    category: "performance",
    severity: "low",
    effort: "easy",
    description:
      "Web fonts fetched from a third-party domain need a fresh DNS lookup and TLS handshake; without font-display the text stays invisible while they load.",
    detection: "Detects third-party font stylesheets and checks for a matching preconnect hint and font-display usage.",
    recommendation: "Add <link rel=\"preconnect\"> for the font host and use font-display: swap (or self-host the font).",
    check(ctx) {
      const fontHosts = ["fonts.googleapis.com", "fonts.gstatic.com", "use.typekit.net", "fonts.bunny.net"];
      const fontLinks = ctx
        .$("link[href]")
        .toArray()
        .map((el) => ctx.$(el).attr("href") ?? "")
        .filter((href) => fontHosts.some((host) => href.includes(host)));
      if (!fontLinks.length && !ctx.fonts.length) return skip("This page does not load external web fonts.");
      const preconnects = ctx
        .$('link[rel="preconnect"], link[rel="dns-prefetch"]')
        .toArray()
        .map((el) => ctx.$(el).attr("href") ?? "");
      // Google serves CSS from fonts.googleapis.com and the font files from fonts.gstatic.com;
      // a preconnect to either host counts as covering that provider.
      const providerOf = (host: string) => (host.endsWith("googleapis.com") || host.endsWith("gstatic.com") ? "google" : host);
      const preconnectedProviders = new Set(
        preconnects
          .map((href) => {
            try {
              return providerOf(new URL(href, ctx.finalUrl).hostname);
            } catch {
              return null;
            }
          })
          .filter(Boolean) as string[],
      );
      const missingPreconnect = fontLinks.filter((href) => {
        try {
          return !preconnectedProviders.has(providerOf(new URL(href, ctx.finalUrl).hostname));
        } catch {
          return false;
        }
      });
      const hasDisplay = fontLinks.some((href) => href.includes("display=")) || /font-display\s*:/i.test(ctx.html);
      const problems = [
        missingPreconnect.length ? `${plural(missingPreconnect.length, "font stylesheet")} without a preconnect hint` : null,
        !hasDisplay && fontLinks.length ? "no font-display strategy detected" : null,
      ].filter(Boolean) as string[];
      if (!problems.length) return pass("Web fonts are preconnected and use a font-display strategy.");
      return fail({
        problem: `Web font loading can be improved: ${problems.join(" and ")}.`,
        observed: problems.join("; "),
        expected: "preconnect to the font host and font-display: swap",
        occurrences: Math.max(1, missingPreconnect.length),
        evidence: evidence(...fontLinks.slice(0, 4).map((href, i) => [`Font resource ${i + 1}`, href] as [string, string])),
        technicalFix: `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter&display=swap">`,
        dedupeKey: "font-loading",
      });
    },
  },
  {
    id: "PERF-CWV-001",
    name: "Largest Contentful Paint (LCP)",
    category: "performance",
    severity: "critical",
    effort: "hard",
    description:
      "LCP is how long it takes for the biggest piece of content — usually the hero image or headline — to appear. Google considers 2.5 s or less 'good'.",
    detection: "Read from a Lighthouse run via the PageSpeed Insights API (mobile emulation) when an API key is configured.",
    recommendation: "Optimise the hero image, remove render-blocking resources and speed up server response.",
    references: ["https://web.dev/articles/lcp"],
    check(ctx) {
      const metric = ctx.performance?.metrics.lcp;
      if (!metric || metric.value === null) return skip("Core Web Vitals need a PageSpeed Insights API key (PAGESPEED_API_KEY).");
      if (metric.value <= 2500) return pass(`LCP is ${metric.display} (good).`);
      return fail({
        problem: `The main content takes ${metric.display} to appear.`,
        observed: metric.display,
        expected: "2.5 s or less",
        severity: metric.value > 4000 ? "critical" : "high",
        evidence: evidence(["Metric", "Largest Contentful Paint"], ["Measured", metric.display], ["Rating", metric.rating], ["Source", "Lighthouse mobile via PageSpeed Insights"]),
        dedupeKey: "lcp",
      });
    },
  },
  {
    id: "PERF-CWV-002",
    name: "Cumulative Layout Shift (CLS)",
    category: "performance",
    severity: "high",
    effort: "medium",
    description:
      "CLS measures how much the layout jumps while loading. Anything above 0.1 means users are likely to mis-tap or lose their place.",
    detection: "Read from a Lighthouse run via the PageSpeed Insights API when an API key is configured.",
    recommendation: "Reserve space for images, ads and embeds, and avoid injecting content above existing content.",
    references: ["https://web.dev/articles/cls"],
    check(ctx) {
      const metric = ctx.performance?.metrics.cls;
      if (!metric || metric.value === null) return skip("Core Web Vitals need a PageSpeed Insights API key (PAGESPEED_API_KEY).");
      if (metric.value <= 0.1) return pass(`CLS is ${metric.display} (good).`);
      return fail({
        problem: `The layout shifts while loading (CLS ${metric.display}).`,
        observed: metric.display,
        expected: "0.1 or less",
        severity: metric.value > 0.25 ? "high" : "medium",
        evidence: evidence(["Metric", "Cumulative Layout Shift"], ["Measured", metric.display], ["Rating", metric.rating]),
        dedupeKey: "cls",
      });
    },
  },
  {
    id: "PERF-CWV-003",
    name: "Interaction responsiveness (INP/TBT)",
    category: "performance",
    severity: "high",
    effort: "hard",
    description:
      "INP measures how quickly the page responds to taps and clicks. In a lab run it is approximated by Total Blocking Time — the time the main thread was too busy to respond.",
    detection: "Uses field INP when available from PageSpeed Insights, otherwise lab Total Blocking Time.",
    recommendation: "Break up long tasks, defer non-critical JavaScript and reduce third-party scripts.",
    references: ["https://web.dev/articles/inp"],
    check(ctx) {
      const inp = ctx.performance?.metrics.inp;
      const tbt = ctx.performance?.metrics.tbt;
      const metric = inp?.value !== null && inp?.value !== undefined ? inp : tbt;
      if (!metric || metric.value === null) return skip("Interaction data needs a PageSpeed Insights API key (PAGESPEED_API_KEY).");
      const isInp = metric === inp;
      const threshold = isInp ? 200 : 200;
      if (metric.value <= threshold) return pass(`${isInp ? "INP" : "Total Blocking Time"} is ${metric.display} (good).`);
      return fail({
        problem: isInp
          ? `The page takes ${metric.display} to respond to interactions.`
          : `The main thread is blocked for ${metric.display} during load, which delays taps and clicks.`,
        observed: metric.display,
        expected: isInp ? "200 ms or less" : "200 ms or less of blocking time",
        severity: metric.value > 600 ? "high" : "medium",
        evidence: evidence(["Metric", isInp ? "Interaction to Next Paint (field)" : "Total Blocking Time (lab)"], ["Measured", metric.display], ["Rating", metric.rating]),
        dedupeKey: "inp",
      });
    },
  },
];
