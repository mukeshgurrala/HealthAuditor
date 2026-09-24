# Roadmap & implementation status

Build order comes from [`SPECIFICATION.md`](./SPECIFICATION.md). Status as of ruleset
version 0.2.0.

## Phase 1 — the loop ✅ shipped

| # | Feature | Status | Where |
| --- | --- | --- | --- |
| 1 | Audit engine | ✅ | `src/lib/audit/engine.ts`, `context.ts`, `fetcher.ts` |
| 2 | Reliable rules | ✅ 60 rules | `src/lib/audit/rules/*` |
| 3 | Health score | ✅ | `scoring.ts` + `docs/METHODOLOGY.md` |
| 4 | Category scores | ✅ | `engine.ts` |
| 5 | Priority engine | ✅ | `scoring.ts` (`priorityScore`) |
| 6 | Issue explanations | ✅ | `components/finding-card.tsx` |
| 7 | Evidence system | ✅ | every rule returns observed/expected/evidence |
| 8 | Quick wins | ✅ | `isQuickWin` + report section |

## Phase 2 — coverage ✅ shipped

| # | Feature | Status | Notes |
| --- | --- | --- | --- |
| 9 | Performance | ✅ | Static resource rules + Core Web Vitals via PageSpeed Insights when a key is set |
| 10 | SEO | ✅ | Metadata, crawlability, structure, social, structured data, hreflang |
| 11 | Accessibility | ✅ | Alt text, labels, names, ARIA, headings, zoom, focus order, inline contrast |
| 12 | Security | ✅ | Transport, headers, mixed content, cookies, forms — observable configuration only |
| 13 | Technical SEO | ✅ | Status, redirect chains, canonical, robots, sitemap, favicon, charset, viewport, lang |
| 14 | Broken links | ✅ | Bounded concurrency, filters, bot-blocked hosts reported as "unverified" |
| 15 | Image intelligence | ✅ | Real measured bytes, intrinsic dimensions, format, alt, savings from measured data |

Partly done from later phases because they were cheap and improve trust:

- §22 Rule documentation — `npm run docs:rules` → [`RULES.md`](./RULES.md)
- §24 False-positive reporting — UI + `POST /api/false-positive` (logs only, no storage yet)
- §25 Rule testing framework — `npm test` against good/bad fixtures
- §26 Methodology page — `/how-it-works`
- §27 Privacy statement — `/how-it-works`
- §28 API — `POST /api/audit` already returns the full report
- §33 Technology detection — conservative signatures with evidence

## Phase 3 — memory 🔜 next

| # | Feature | Design notes |
| --- | --- | --- |
| 16 | Before vs after | Diff two reports by `dedupeKey`: fixed = present before, absent now. |
| 17 | Audit history | Opt-in storage keyed by origin; score trend sparkline. |
| 18 | Shareable report | Persist a report under `/report/<id>`; include ruleset version. |
| 19 | PDF report | Render the report route to PDF (score, categories, critical issues, quick wins, findings). |

## Phase 4 — contributor platform

| # | Feature | Design notes |
| --- | --- | --- |
| 20 | Rule engine polish | Rule profiles (§34), per-rule config. |
| 23 | Contribution system | `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `LICENSE`, `CHANGELOG.md`, issue templates. |
| 24 | False positives | Persist reports and surface per-rule accuracy. |

## Phase 5 — workflow tool

| # | Feature | Design notes |
| --- | --- | --- |
| 29 | CLI | `healthauditor <url>` reusing `runAudit()` unchanged. |
| 30 | CI/CD | GitHub Action wrapping the CLI, failing below a score threshold. |
| 31 | Monitoring | Scheduled re-audits per saved site. |
| 32 | Change detection | Compare metrics between runs and flag regressions. |

## Accuracy backlog (do this before adding features)

- Render pages in a headless browser so JS-rendered content, real CLS and CSS-based
  contrast become observable.
- Multi-page crawling for duplicate titles/descriptions (§10).
- Verify savings estimates against actual re-encodes instead of typical ratios.
- Track false-positive reports per rule and tighten the noisiest rules first.
