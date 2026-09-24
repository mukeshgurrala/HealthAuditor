import type { AuditRule } from "../types";
import { evidence, fail, pass, plural, shortUrl, skip } from "./helpers";

/**
 * Security rules only report what can actually be observed in the response. Passing every
 * rule here does NOT mean a site is secure — the report wording must stay
 * "No issues detected in the security checks performed." (spec §12).
 */
export const securityRules: AuditRule[] = [
  {
    id: "SEC-001",
    name: "HTTPS",
    category: "security",
    severity: "critical",
    effort: "easy",
    description:
      "Without HTTPS, everything between the visitor and the server can be read or modified in transit, and browsers mark the site as 'Not secure'.",
    detection: "Checks the protocol of the final URL after redirects.",
    recommendation: "Install a TLS certificate (Let's Encrypt is free) and redirect all HTTP traffic to HTTPS.",
    check(ctx) {
      if (new URL(ctx.finalUrl).protocol === "https:") return pass("The page is served over HTTPS.");
      return fail({
        problem: "This page is served over plain HTTP.",
        observed: ctx.finalUrl,
        expected: "https:// with a valid certificate",
        evidence: evidence(["Final URL", ctx.finalUrl], ["Protocol", "http:"]),
        dedupeKey: "https",
      });
    },
  },
  {
    id: "SEC-002",
    name: "HTTP Strict Transport Security",
    category: "security",
    severity: "medium",
    effort: "easy",
    description:
      "HSTS tells browsers to only ever contact this domain over HTTPS, closing the window where a first HTTP request can be intercepted.",
    detection: "Looks for a Strict-Transport-Security response header with a max-age of at least six months.",
    recommendation: "Send Strict-Transport-Security: max-age=31536000; includeSubDomains.",
    references: ["https://developer.mozilla.org/docs/Web/HTTP/Headers/Strict-Transport-Security"],
    check(ctx) {
      if (new URL(ctx.finalUrl).protocol !== "https:") return skip("HSTS only applies to HTTPS pages (see SEC-001).");
      const header = ctx.headers["strict-transport-security"];
      if (!header) {
        return fail({
          problem: "The Strict-Transport-Security header is missing.",
          observed: "No Strict-Transport-Security header",
          expected: "max-age of at least 15552000 seconds (6 months)",
          evidence: evidence(["Header", "Strict-Transport-Security"], ["Value", "absent"]),
          technicalFix: "Strict-Transport-Security: max-age=31536000; includeSubDomains",
          dedupeKey: "hsts",
        });
      }
      const maxAge = Number(header.match(/max-age\s*=\s*(\d+)/i)?.[1] ?? 0);
      if (maxAge < 15_552_000) {
        return fail({
          problem: `HSTS is enabled but only for ${Math.round(maxAge / 86400)} days.`,
          observed: header,
          expected: "max-age of at least 15552000 (6 months)",
          severity: "low",
          evidence: evidence(["Header value", header], ["max-age", maxAge]),
          dedupeKey: "hsts",
        });
      }
      return pass(`HSTS enabled (max-age ${maxAge}).`);
    },
  },
  {
    id: "SEC-003",
    name: "Content-Security-Policy",
    category: "security",
    severity: "high",
    effort: "hard",
    description:
      "A Content-Security-Policy restricts where scripts, styles and frames may come from. It is the strongest available defence against cross-site scripting.",
    detection: "Looks for a Content-Security-Policy response header or meta tag, and flags obviously unsafe directives.",
    recommendation: "Start with a report-only policy, tighten it until nothing is reported, then enforce it.",
    references: ["https://developer.mozilla.org/docs/Web/HTTP/CSP"],
    check(ctx) {
      const header = ctx.headers["content-security-policy"];
      const meta = ctx.$('meta[http-equiv="Content-Security-Policy" i]').attr("content");
      const policy = header ?? meta;
      if (!policy) {
        const reportOnly = ctx.headers["content-security-policy-report-only"];
        return fail({
          problem: "No Content-Security-Policy is enforced.",
          observed: reportOnly ? "Only Content-Security-Policy-Report-Only is set" : "No CSP header or meta tag",
          expected: "An enforced Content-Security-Policy",
          severity: reportOnly ? "medium" : "high",
          evidence: evidence(["Header", "Content-Security-Policy"], ["Value", reportOnly ? "report-only" : "absent"]),
          technicalFix: "Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'; frame-ancestors 'self'",
          dedupeKey: "csp",
        });
      }
      const weaknesses = [
        /unsafe-inline/i.test(policy) ? "allows 'unsafe-inline'" : null,
        /unsafe-eval/i.test(policy) ? "allows 'unsafe-eval'" : null,
        /default-src[^;]*\*/i.test(policy) ? "uses a wildcard default-src" : null,
      ].filter(Boolean) as string[];
      if (weaknesses.length) {
        return fail({
          problem: `A Content-Security-Policy exists but ${weaknesses.join(" and ")}, which weakens its protection.`,
          observed: policy.slice(0, 200),
          expected: "No 'unsafe-inline' / 'unsafe-eval' / wildcard sources",
          severity: "medium",
          evidence: evidence(["Policy", policy.slice(0, 300)], ["Weaknesses", weaknesses.join(", ")]),
          dedupeKey: "csp-weak",
        });
      }
      return pass("A Content-Security-Policy is enforced without obviously unsafe directives.");
    },
  },
  {
    id: "SEC-004",
    name: "X-Content-Type-Options",
    category: "security",
    severity: "low",
    effort: "easy",
    description:
      "Without nosniff, browsers may guess a response's type and execute a file that was never meant to be a script.",
    detection: "Checks for X-Content-Type-Options: nosniff on the HTML response.",
    recommendation: "Send X-Content-Type-Options: nosniff on all responses.",
    check(ctx) {
      const value = ctx.headers["x-content-type-options"];
      if (value?.toLowerCase().includes("nosniff")) return pass("X-Content-Type-Options: nosniff is set.");
      return fail({
        problem: "The X-Content-Type-Options header is missing.",
        observed: value ?? "absent",
        expected: "nosniff",
        evidence: evidence(["Header", "X-Content-Type-Options"], ["Value", value ?? "absent"]),
        technicalFix: "X-Content-Type-Options: nosniff",
        dedupeKey: "nosniff",
      });
    },
  },
  {
    id: "SEC-005",
    name: "Referrer-Policy",
    category: "security",
    severity: "low",
    effort: "easy",
    description:
      "Referrer-Policy controls how much of the current URL is sent to other sites. The default can leak private paths and query strings.",
    detection: "Checks for a Referrer-Policy header or meta tag.",
    recommendation: "Send Referrer-Policy: strict-origin-when-cross-origin.",
    check(ctx) {
      const value = ctx.headers["referrer-policy"] ?? ctx.$('meta[name="referrer"]').attr("content");
      if (value) return pass(`Referrer-Policy set to "${value}".`);
      return fail({
        problem: "No Referrer-Policy is declared.",
        observed: "absent",
        expected: "strict-origin-when-cross-origin (or stricter)",
        evidence: evidence(["Header", "Referrer-Policy"], ["Meta fallback", "absent"]),
        technicalFix: "Referrer-Policy: strict-origin-when-cross-origin",
        dedupeKey: "referrer-policy",
      });
    },
  },
  {
    id: "SEC-006",
    name: "Permissions-Policy",
    category: "security",
    severity: "low",
    effort: "easy",
    description:
      "Permissions-Policy lets you switch off browser features (camera, microphone, geolocation) that your site — and any embedded third party — should never use.",
    detection: "Checks for a Permissions-Policy (or legacy Feature-Policy) response header.",
    recommendation: "Send Permissions-Policy disabling the features you do not need.",
    check(ctx) {
      const value = ctx.headers["permissions-policy"] ?? ctx.headers["feature-policy"];
      if (value) return pass(`Permissions-Policy set: ${value.slice(0, 80)}`);
      return fail({
        problem: "No Permissions-Policy is declared.",
        observed: "absent",
        expected: "An explicit policy for sensitive browser features",
        evidence: evidence(["Header", "Permissions-Policy"], ["Value", "absent"]),
        technicalFix: "Permissions-Policy: camera=(), microphone=(), geolocation=()",
        dedupeKey: "permissions-policy",
      });
    },
  },
  {
    id: "SEC-007",
    name: "Mixed content",
    category: "security",
    severity: "high",
    effort: "easy",
    description:
      "An HTTPS page that loads resources over HTTP breaks the security guarantee; browsers block or downgrade those requests.",
    detection: "Scans every discovered image, script, stylesheet, font and iframe URL for the http:// protocol on an HTTPS page.",
    recommendation: "Update the URLs to https:// (or protocol-relative paths served from your own domain).",
    check(ctx) {
      if (new URL(ctx.finalUrl).protocol !== "https:") return skip("Mixed content only applies to HTTPS pages (see SEC-001).");
      const all = [...ctx.images, ...ctx.scripts, ...ctx.stylesheets, ...ctx.fonts, ...ctx.otherResources];
      const insecure = all.filter((resource) => resource.url.startsWith("http://"));
      if (!insecure.length) return pass(`All ${all.length} discovered resources load over HTTPS.`);
      return fail({
        problem: `${plural(insecure.length, "resource")} on this HTTPS page load over insecure HTTP.`,
        observed: `${insecure.length} http:// resources`,
        expected: "Every resource loaded over https://",
        occurrences: insecure.length,
        severity: insecure.some((r) => r.type === "script") ? "critical" : "high",
        evidence: evidence(...insecure.slice(0, 6).map((r, i) => [`${r.type} ${i + 1}`, r.url] as [string, string])),
        dedupeKey: "mixed-content",
      });
    },
  },
  {
    id: "SEC-008",
    name: "Clickjacking protection",
    category: "security",
    severity: "medium",
    effort: "easy",
    description:
      "Without frame restrictions, an attacker can embed your page in an invisible iframe and trick users into clicking things they cannot see.",
    detection: "Checks for frame-ancestors in the CSP or an X-Frame-Options header.",
    recommendation: "Add frame-ancestors 'self' to your CSP (X-Frame-Options: SAMEORIGIN is the legacy equivalent).",
    check(ctx) {
      const csp = ctx.headers["content-security-policy"] ?? "";
      const xfo = ctx.headers["x-frame-options"];
      if (/frame-ancestors/i.test(csp) || xfo) return pass(`Framing restricted (${/frame-ancestors/i.test(csp) ? "CSP frame-ancestors" : `X-Frame-Options: ${xfo}`}).`);
      return fail({
        problem: "Nothing stops other sites from embedding this page in a frame.",
        observed: "No frame-ancestors directive and no X-Frame-Options header",
        expected: "frame-ancestors 'self' or X-Frame-Options: SAMEORIGIN",
        evidence: evidence(["CSP", csp || "absent"], ["X-Frame-Options", xfo ?? "absent"]),
        technicalFix: "Content-Security-Policy: frame-ancestors 'self'",
        dedupeKey: "clickjacking",
      });
    },
  },
  {
    id: "SEC-009",
    name: "Software version disclosure",
    category: "security",
    severity: "low",
    effort: "easy",
    description:
      "Version numbers in response headers tell an attacker exactly which known vulnerabilities to try. Hiding them is free.",
    detection: "Looks for version numbers in the Server and X-Powered-By response headers.",
    recommendation: "Strip version details from Server and remove X-Powered-By entirely.",
    check(ctx) {
      const disclosures: string[] = [];
      const server = ctx.headers["server"];
      const poweredBy = ctx.headers["x-powered-by"];
      if (server && /\d+\.\d+/.test(server)) disclosures.push(`Server: ${server}`);
      if (poweredBy) disclosures.push(`X-Powered-By: ${poweredBy}`);
      if (!disclosures.length) return pass("No software versions are disclosed in the response headers.");
      return fail({
        problem: "Response headers reveal the server software and version.",
        observed: disclosures.join("; "),
        expected: "No version information in headers",
        occurrences: disclosures.length,
        evidence: evidence(["Server", server ?? "absent"], ["X-Powered-By", poweredBy ?? "absent"]),
        dedupeKey: "version-disclosure",
      });
    },
  },
  {
    id: "SEC-010",
    name: "Cookie flags",
    category: "security",
    severity: "medium",
    effort: "easy",
    description:
      "Cookies without Secure can be sent over plain HTTP; without HttpOnly they can be read by any script that gets injected into the page.",
    detection: "Inspects Set-Cookie headers on the HTML response for Secure, HttpOnly and SameSite.",
    recommendation: "Set Secure, HttpOnly and SameSite=Lax (or Strict) on session cookies.",
    check(ctx) {
      const raw = ctx.headers["set-cookie"];
      if (!raw) return skip("This response sets no cookies.");
      const cookies = raw.split(/,(?=[^;]+?=)/);
      const problems = cookies
        .map((cookie) => {
          const name = cookie.split("=")[0].trim();
          const missing = [
            !/;\s*secure/i.test(cookie) ? "Secure" : null,
            !/;\s*httponly/i.test(cookie) ? "HttpOnly" : null,
            !/;\s*samesite/i.test(cookie) ? "SameSite" : null,
          ].filter(Boolean);
          return missing.length ? `${name} is missing ${missing.join(", ")}` : null;
        })
        .filter(Boolean) as string[];
      if (!problems.length) return pass(`${plural(cookies.length, "cookie")} use Secure, HttpOnly and SameSite.`);
      return fail({
        problem: `${plural(problems.length, "cookie")} are set without the recommended security flags.`,
        observed: problems.join("; "),
        expected: "Secure; HttpOnly; SameSite on every cookie",
        occurrences: problems.length,
        evidence: evidence(...problems.slice(0, 5).map((p, i) => [`Cookie ${i + 1}`, p] as [string, string])),
        technicalFix: "Set-Cookie: session=…; Secure; HttpOnly; SameSite=Lax; Path=/",
        dedupeKey: "cookie-flags",
      });
    },
  },
  {
    id: "SEC-011",
    name: "Form submission security",
    category: "security",
    severity: "high",
    effort: "easy",
    description: "A form that posts to an http:// endpoint sends whatever the user typed — including passwords — in plain text.",
    detection: "Checks every <form action> for the http:// protocol.",
    recommendation: "Point the form action at an https:// endpoint.",
    check(ctx) {
      const forms = ctx.$("form[action]").toArray();
      if (!forms.length) return skip("This page contains no forms with an action attribute.");
      const insecure = forms
        .map((el) => ctx.$(el).attr("action") ?? "")
        .filter((action) => action.startsWith("http://"));
      if (!insecure.length) return pass(`All ${forms.length} forms submit over HTTPS or relative URLs.`);
      return fail({
        problem: `${plural(insecure.length, "form")} submit data over insecure HTTP.`,
        observed: insecure.slice(0, 3).join(", "),
        expected: "https:// form actions",
        occurrences: insecure.length,
        evidence: evidence(...insecure.slice(0, 5).map((action, i) => [`Form ${i + 1}`, action] as [string, string])),
        dedupeKey: "insecure-form",
      });
    },
  },
  {
    id: "SEC-012",
    name: "Cross-origin link safety",
    category: "security",
    severity: "low",
    effort: "easy",
    description:
      "A target=\"_blank\" link gives the opened page a reference back to yours unless rel=\"noopener\" is set. Older browsers allow that page to redirect yours.",
    detection: 'Finds external links with target="_blank" and no rel="noopener" or rel="noreferrer".',
    recommendation: 'Add rel="noopener noreferrer" to external links that open in a new tab.',
    check(ctx) {
      const risky = ctx
        .$('a[target="_blank"][href^="http"]')
        .toArray()
        .filter((el) => {
          const href = ctx.$(el).attr("href") ?? "";
          const rel = (ctx.$(el).attr("rel") ?? "").toLowerCase();
          return !href.startsWith(ctx.origin) && !rel.includes("noopener") && !rel.includes("noreferrer");
        });
      if (!ctx.$('a[target="_blank"]').length) return skip("This page has no links that open in a new tab.");
      if (!risky.length) return pass("External new-tab links use rel=\"noopener\".");
      return fail({
        problem: `${plural(risky.length, "external link")} open in a new tab without rel="noopener".`,
        observed: `${risky.length} links missing rel="noopener"`,
        expected: 'rel="noopener noreferrer"',
        occurrences: risky.length,
        evidence: evidence(...risky.slice(0, 5).map((el, i) => [`Link ${i + 1}`, shortUrl(ctx.$(el).attr("href") ?? "", 60)] as [string, string])),
        technicalFix: `<a href="https://example.com" target="_blank" rel="noopener noreferrer">Example</a>`,
        dedupeKey: "noopener",
      });
    },
  },
];
