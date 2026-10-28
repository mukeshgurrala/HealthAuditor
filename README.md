# HealthAuditor

Enter a URL, get a website health report you can act on: what is wrong, **what to fix
first**, the evidence behind every finding, and how to fix it.

```text
Enter URL → Audit → Find problems → Prioritise → Explain → Fix → Re-audit → Measure improvement
```

- **60 transparent rules** across Performance, SEO, Accessibility, Best Practices and Security
- **Documented scoring** — every number can be recomputed by hand ([methodology](docs/METHODOLOGY.md))
- **Priority engine** — impact × affected elements × effort, so the list starts with what matters
- **Evidence for everything** — rule ID, observed value, expected value, element/resource
- **Plain language by default**, technical details one click away
- **Works without an API key** and without an account; reports are cached in memory for up to two minutes

## Quick start

```bash
npm install
cp .env.example .env.local   # optional: add PAGESPEED_API_KEY for Core Web Vitals
npm run dev
```

Open <http://localhost:3000>. A sample report lives at `/demo`, and the methodology and
privacy statement at `/how-it-works`.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm test` | Rule tests against good/bad fixtures |
| `npm run docs:rules` | Regenerate `docs/RULES.md` from the rule registry |
| `npm run lint` | ESLint |

## API

```bash
curl -X POST http://localhost:3000/api/audit \
  -H 'content-type: application/json' \
  -d '{"url":"https://example.com"}'
```

Returns `{ success, report }` where `report` contains `score`, `categories`, `priorities`,
`quickWins`, `findings`, `metrics`, `pageStats`, `images`, `links` and `technologies`.
Options: `{"options":{"checkLinks":false,"usePageSpeed":false,"strategy":"desktop"}}`.

## How it works

1. The URL is validated (private/internal addresses are rejected) and fetched server-side,
   recording the redirect chain and time to first byte.
2. The HTML is parsed; images, scripts, stylesheets, fonts, iframes and links are extracted
   and **measured with real requests** — sizes are never estimated.
3. robots.txt, the sitemap and discovered links are checked, with bounded concurrency.
4. With `PAGESPEED_API_KEY` set, a Lighthouse mobile run adds Core Web Vitals.
5. Every rule runs against that context and returns pass / fail / not-applicable.
6. Findings are scored, deduplicated and prioritised into "Fix first" and "Quick wins".

## Adding a rule

Rules are self-contained objects — no UI or engine changes needed:

```ts
// src/lib/audit/rules/seo.ts
{
  id: "SEO-016",
  name: "…",
  category: "seo",
  severity: "medium",
  effort: "easy",
  description: "Why this matters, in plain language.",
  detection: "How the rule detects it.",
  recommendation: "How to fix it.",
  check(ctx) {
    return ctx.$("…").length ? pass("…") : fail({ problem: "…", observed: "…", expected: "…" });
  },
}
```

Then add the rule ID to the fixture expectations in `tests/rules.test.ts`, run `npm test`
and `npm run docs:rules`. IDs are permanent: never renumber or reuse one.

## Documentation

- [Feature specification](docs/SPECIFICATION.md) — the full product spec (35 features, 5 phases)
- [Roadmap & status](docs/ROADMAP.md) — what is built, what is next
- [Methodology](docs/METHODOLOGY.md) — scoring and prioritisation maths
- [Rule catalog](docs/RULES.md) — generated from the registry

## Limitations

HealthAuditor does not render pages in a browser, so JavaScript-injected content, real
layout shift and CSS-based colour contrast are outside what it can verify today. Security
checks only cover observable configuration: passing them means "no issues detected in the
checks performed", never "this site is secure". See `/how-it-works` for the full list.

## Deploy

Import the repository in Vercel and (optionally) add `PAGESPEED_API_KEY` under Project
Settings → Environment Variables.

## Request safety and capacity

Audit requests are limited to 8 KB and URLs to 2,048 characters. Only standard HTTP(S)
ports are accepted. All target and resource connections validate DNS results at connection
time and reject private/reserved addresses; redirects are independently validated.
Downloaded bodies are capped at 5 MB (smaller for robots and sitemap documents).

Each process caches up to 20 successful reports for two minutes, coalesces identical
in-flight requests, and permits four distinct concurrent audits. Saturation returns
HTTP 429 with `Retry-After: 15`. This is an instance-local capacity limit, not a
distributed per-user rate limiter; production multi-instance deployments should add
a shared cache and gateway rate limits. Error responses contain `success`, `code`,
and a human-readable `error`. Client progress stages are estimates, not streamed
backend events. Lighthouse metrics remain optional and are never fabricated.

## Homepage customization

- Set `NEXT_PUBLIC_WHATSAPP_NUMBER` (international digits, no `+`) to route the
  header/footer WhatsApp buttons to enquiries. Without a number they share the
  tool, with an explicit “Share on WhatsApp” label.
- Edit the `SHOWCASES` entries in `src/components/report-showcase.tsx` to customize
  titles, descriptions, modal content, and screenshot paths. Put media in `public/`
  and set `imageSrc` to a root-relative path, such as `/screenshots/report.webp`.
  Empty paths render lightweight, built-in report illustrations instead.
- Fonts are self-hosted through Fontsource; no third-party font requests are needed.
- Decorative motion respects reduced-motion preferences; previews use native dialogs
  with keyboard dismissal and focus restoration.
