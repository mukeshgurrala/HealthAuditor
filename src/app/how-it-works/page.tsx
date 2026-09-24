import type { Metadata } from "next";
import Link from "next/link";
import { RULES, RULESET_VERSION } from "@/lib/audit/registry";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/audit/types";
import { CATEGORY_WEIGHT, EFFORT_MULTIPLIER, IMPACT_SCORE, SEVERITY_WEIGHT } from "@/lib/audit/scoring";

export const metadata: Metadata = {
  title: "How HealthAuditor works",
  description: "What HealthAuditor checks, how the health score is calculated, and what it cannot detect.",
};

export default function HowItWorks() {
  return (
    <main className="doc">
      <p className="back">
        <Link href="/">← Back to the auditor</Link>
      </p>
      <h1>How HealthAuditor works</h1>
      <p className="lead">
        Every number in a HealthAuditor report can be recalculated by hand. This page documents the data we collect, the
        scoring maths, the prioritisation formula and — just as importantly — the things this tool cannot see.
        Ruleset version <b>{RULESET_VERSION}</b> contains <b>{RULES.length}</b> rules.
      </p>

      <h2>1. What happens when you run an audit</h2>
      <ol>
        <li>Your URL is validated and normalised (private and internal addresses are rejected).</li>
        <li>We request the page from our server, following redirects and recording every hop.</li>
        <li>The HTML is parsed; images, scripts, stylesheets, fonts, iframes and links are extracted.</li>
        <li>Each resource is measured with a real HEAD or ranged GET request — sizes are never estimated.</li>
        <li>robots.txt and the sitemap are fetched, and discovered links are probed for their status code.</li>
        <li>
          If a PageSpeed Insights API key is configured, a Lighthouse mobile run adds Core Web Vitals (LCP, CLS, TBT,
          Speed Index) and field INP when Chrome UX data exists.
        </li>
        <li>Every rule runs against that collected context and returns pass, fail or not-applicable.</li>
      </ol>

      <h2>2. How the scores are calculated</h2>
      <h3>Category score</h3>
      <p>
        Each rule carries a weight derived from its severity:{" "}
        {Object.entries(SEVERITY_WEIGHT)
          .map(([severity, weight]) => `${severity} = ${weight}`)
          .join(", ")}
        . A category score is the share of that weight which passed:
      </p>
      <pre>{`categoryScore = 100 × (weight of passing rules ÷ weight of applicable rules)`}</pre>
      <p>
        Rules that do not apply to your page (for example form-label checks on a page with no forms) are excluded from
        both sides of the division, so they can neither help nor hurt your score.
      </p>
      <h3>Performance blending</h3>
      <p>
        When Lighthouse data is available the performance score is{" "}
        <code>60% measured Lighthouse score + 40% HealthAuditor resource rules</code>. Without an API key it is the rule
        score alone, and the Core Web Vitals rules are marked not applicable rather than guessed.
      </p>
      <h3>Overall health score</h3>
      <pre>{CATEGORIES.map((category) => `${CATEGORY_LABELS[category].padEnd(15)} × ${CATEGORY_WEIGHT[category]}`).join("\n")}</pre>
      <p>
        The overall score is the weighted mean of the category scores, renormalised over the categories that produced a
        score. 90+ is good, 50–89 needs improvement, below 50 is poor. It is a HealthAuditor score, not a Google ranking.
      </p>

      <h2>3. How findings are prioritised</h2>
      <pre>{`priority = impact(severity) × reach(occurrences) × effort × categoryWeight

impact:  ${Object.entries(IMPACT_SCORE).map(([k, v]) => `${k}=${v}`).join("  ")}
reach:   1 + log10(affected elements) ÷ 2, capped at 2
effort:  ${Object.entries(EFFORT_MULTIPLIER).map(([k, v]) => `${k}=${v}`).join("  ")}`}</pre>
      <p>
        <b>Quick wins</b> are findings with an easy fix, a severity above &ldquo;low&rdquo;, and a priority score of at
        least 5. When one underlying problem is detected by more than one rule it is counted once (deduplicated by a
        stable key), so the same issue never damages your score twice.
      </p>

      <h2>4. What we check</h2>
      <ul className="rule-grid">
        {CATEGORIES.map((category) => (
          <li key={category}>
            <b>{CATEGORY_LABELS[category]}</b>
            <span>{RULES.filter((rule) => rule.category === category).map((rule) => rule.id).join(", ")}</span>
          </li>
        ))}
      </ul>
      <p>
        Every rule is documented — ID, severity, why it matters, how it is detected and how to fix it — in{" "}
        <code>docs/RULES.md</code> in the repository.
      </p>

      <h2>5. Limitations — what HealthAuditor cannot detect</h2>
      <ul>
        <li>We audit a single URL. Site-wide problems such as duplicate titles across pages are out of scope for now.</li>
        <li>
          The page is not rendered in a browser by HealthAuditor itself, so content added by JavaScript is invisible to
          the static rules (that is exactly why we report thin server HTML as a finding).
        </li>
        <li>Colour contrast can only be computed for inline styles; contrast defined in CSS files needs a renderer.</li>
        <li>Keyboard traps, screen-reader semantics in practice, and visual design problems need human testing.</li>
        <li>
          Security checks look only at observable configuration. Passing them means &ldquo;no issues detected in the
          checks performed&rdquo; — never that a site is secure.
        </li>
        <li>External links that block bots are reported as unverified, not broken.</li>
        <li>Resource measurement is capped per audit to keep runs fast; skipped resources are listed in the report notes.</li>
      </ul>

      <h2>6. Privacy</h2>
      <ul>
        <li>No account is required.</li>
        <li>Audits run on demand; the URL and the report are returned to your browser and not stored by default.</li>
        <li>Page content is held in memory for the duration of the audit only.</li>
        <li>
          If a PageSpeed Insights key is configured, the audited URL is sent to Google&apos;s PageSpeed Insights API.
          That is the only third party involved.
        </li>
        <li>No analytics and no cookies are used by this app.</li>
        <li>False-positive reports you submit contain the rule ID, the URL and your explanation, and are logged server-side.</li>
      </ul>
    </main>
  );
}
