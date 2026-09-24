# HealthAuditor — Feature Specification

> This document is the canonical build specification for HealthAuditor. It is written so
> that a human contributor **or** an AI coding agent can pick up any section and implement
> it without further context. Implementation status per section is tracked in
> [`ROADMAP.md`](./ROADMAP.md); the scoring maths lives in [`METHODOLOGY.md`](./METHODOLOGY.md);
> the rule catalog lives in [`RULES.md`](./RULES.md) (generated from the rule registry).

## The core product loop

Everything in this document ultimately serves one loop:

**Enter URL → Audit → Find problems → Prioritize → Explain → Fix → Re-audit → Measure improvement.**

If that loop works extremely well, stop adding features temporarily and make the existing
checks more accurate. Accuracy is the product.

---

## 1. One-Click Website Audit

**Purpose:** make auditing extremely simple.

```text
User enters https://example.com → Start Audit → Scanning website… → Audit completed → Health Report
```

Requirements:

- URL validation (and normalisation: bare hostnames become `https://…`)
- HTTPS/HTTP handling
- Loading/progress state
- Error handling and timeout handling
- Clear success/failure messages
- Never expose raw technical errors to normal users

## 2. Overall Website Health Score

```text
Website Health
72 / 100
```

The score is computed from measurable categories, e.g.

```text
Performance       68
SEO               82
Accessibility     74
Best Practices    79
Security          65
```

**The scoring algorithm must be documented** (see `METHODOLOGY.md`). No arbitrary numbers.

## 3. Category Health Scores

Separate sections for **Performance**, **SEO**, **Accessibility**, **Best Practices**,
**Security**. Each category shows: score, problems, passed checks, recommendations.

## 4. Priority Engine ⭐

Never dump 50 problems in random order. Priority is derived from:

```text
Impact + Severity + Number of affected pages/elements + Estimated effort
```

Output a ranked "FIX FIRST" list where each row shows impact and effort, so the user
immediately knows *what to fix first*.

## 5. Quick Wins

A dedicated section for findings that have meaningful impact, need little effort and can
be fixed quickly (e.g. "Add missing meta description", "Compress 4 oversized images").

## 6. Issue Explanation Engine

Every issue uses the same structure:

```text
Problem · Why it matters · Evidence · Impact · How to fix · Technical solution
```

## 7. Evidence System

Never report an issue without showing why it was detected. Each finding carries:

```text
Rule ID · Category · Severity · URL · Element/resource · Observed value · Expected value · Evidence
```

## 8. Developer Mode

Normal users see plain explanations; developers can expand **Technical details**
(element, resource URL, size, format, suggested format, potential optimisation) through an
expandable UI so the default report stays clean.

## 9. Performance Audit

- Core Web Vitals: LCP, INP, CLS
- Loading: FCP, Speed Index, TBT where applicable, page size, request count, resource sizes
- Resource analysis: oversized images, render-blocking resources, unused resources where
  reliably measurable, large JS, large CSS, font loading, caching issues

Never show a metric without explaining what it means.

## 10. SEO Audit

- Metadata: title, meta description, canonical, robots meta, viewport
- Crawlability: robots.txt, sitemap.xml, HTTP status, redirects, canonical consistency
- Content structure: H1, heading hierarchy, image alt text, duplicate titles/descriptions
- Social: Open Graph, Twitter/X metadata
- Structured data: JSON-LD detection, schema validation where possible

Every failed check provides a fix.

## 11. Accessibility Audit

Observable issues only: missing alt attributes, empty links, missing form labels, heading
hierarchy, contrast problems, buttons without accessible names, ARIA misuse, keyboard
issues where testable, missing language declaration, viewport/zoom restrictions.

## 12. Security Configuration Audit

Only verifiable things: HTTPS, HSTS, CSP, X-Content-Type-Options, Referrer-Policy,
Permissions-Policy, insecure resources, mixed content, obviously exposed configuration.

Never claim a site is "secure". Use: **"No issues detected in the security checks performed."**

## 13. Technical SEO / Infrastructure Checks

HTTP status, redirect chains, canonical URL, robots.txt, sitemap, hreflang where
applicable, favicon, charset, viewport, language attribute, indexability signals.

## 14. Broken Link Checker

Scan discovered links, report status codes, and allow filtering by
`All / Internal / External / Broken / Redirects`. Be careful with external sites that block
automated requests — report them as "unverified", not "broken".

## 15. Image Intelligence

For every significant image: URL, size, format, dimensions, alt text, compression
opportunity. Detect oversized images, missing alt, inappropriate format, missing
dimensions, suspiciously large resources. Show estimated savings only when calculated from
real data.

## 16. Before vs After Audit

Compare the current audit with the previous one for the same site: score delta, what was
fixed, what remains.

## 17. Audit History

Store previous audits when the user chooses to save them; list them per site with a simple
score trend graph.

## 18. Shareable Report

Generate a unique report URL (`/report/abc123`) showing website, audit date, scores,
issues, recommendations and methodology/version.

## 19. PDF Report

"Download PDF" containing health score, category scores, critical issues, quick wins,
detailed findings, recommendations and the audit date. Keep it simple.

## 20. Rule Engine ⭐

Checks are never hard-coded into the UI. Every check is a self-contained rule object:

```ts
interface AuditRule {
  id: string;
  name: string;
  category: Category;
  severity: Severity;
  description: string;
  check(ctx: AuditContext): Promise<RuleOutcome>;
  recommendation: string;
}
```

Contributors add a file and register it; nothing else changes.

## 21. Rule IDs

Stable unique IDs per rule: `PERF-001`, `SEO-001`, `A11Y-001`, `SEC-001`, `BP-001`, …

## 22. Rule Documentation

Each rule documents: ID, name, category, severity, why, detection, fix, references.

## 23. Open-Source Contribution System

`README.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `LICENSE`,
`CHANGELOG.md` plus issue templates: Bug Report, Feature Request, New Audit Rule,
False Positive, Improvement.

## 24. False Positive Reporting

Under every finding: "Was this finding incorrect?" → `Yes, report issue` / `No`.
Collect rule ID, URL, finding, user explanation.

## 25. Rule Testing Framework

Every rule has automated tests against fixture pages: a bad fixture must FAIL the rule, a
good fixture must PASS it.

## 26. Audit Methodology Page

`/how-it-works` explaining what is checked, how scores are calculated, limitations, what
cannot be detected, how findings are prioritised and which external engines are used.

## 27. Privacy-First Auditing

State clearly whether URLs/page content are stored, retention, third parties, analytics and
cookies. Auditing works without an account.

## 28. API

```text
POST /api/audit   { "url": "https://example.com" }
→ { "score": 82, "categories": {}, "findings": [] }
```

## 29. CLI

```bash
healthauditor https://example.com
```

Prints health score, severity counts and quick wins.

## 30. CI/CD Integration

GitHub Actions / GitLab CI: audit on pull request, fail or warn below a score threshold.

## 31. Continuous Monitoring

Periodically re-audit saved sites and alert on score drops.

## 32. Website Change Detection

Detect meaningful metric changes between audits (e.g. LCP 2.1s → 4.3s = regression).

## 33. Technology Detection

Detect framework/analytics/CDN/CMS where reliable, and use it to make recommendations more
relevant — not just to display names.

## 34. Industry-Specific Rules

Rule profiles per site type: General, E-commerce, Blog, SaaS, Portfolio, Agency, News.

## 35. Cross-Category Relationships

Explain relationships between categories instead of treating them as isolated, and never
double-count one underlying problem in the overall score.

---

## Build priority

```text
PHASE 1  audit engine · reliable rules · health score · category scores · priority engine ·
         issue explanations · evidence · quick wins
PHASE 2  performance · SEO · accessibility · security · broken links · image analysis
PHASE 3  before/after · history · shareable reports · PDF
PHASE 4  rule engine polish · rule documentation · false-positive reporting · rule tests ·
         open-source contribution system
PHASE 5  API · CLI · GitHub Actions · monitoring · regression detection
```
