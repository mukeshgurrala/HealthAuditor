import Link from "next/link";
import { AuditForm } from "@/components/audit-form";
import { RULES, RULESET_VERSION } from "@/lib/audit/registry";
import { CATEGORIES, CATEGORY_DESCRIPTIONS, CATEGORY_LABELS } from "@/lib/audit/types";

const ICONS: Record<string, string> = {
  performance: "⚡",
  seo: "⌕",
  accessibility: "♿",
  "best-practices": "🧭",
  security: "🛡️",
};

const STEPS = [
  ["01", "Measure", "We fetch your page, measure every resource with real requests and read robots.txt, the sitemap and your links."],
  ["02", "Prioritise", "Findings are ranked by impact, how many elements are affected and how much effort the fix takes."],
  ["03", "Explain", "Every issue shows the evidence that triggered it, what it means, and exactly how to fix it."],
];

export default function Home() {
  return (
    <>
      <header className="hero">
        <nav>
          <a href="#" className="logo">
            <span>♥</span> Health<b>Auditor</b>
          </a>
          <span className="nav-pill">
            <Link href="/how-it-works">How it works</Link>
          </span>
        </nav>
        <div className="hero-copy">
          <span className="eyebrow">{RULES.length} TRANSPARENT RULES · RULESET v{RULESET_VERSION}</span>
          <h1>
            Website Health <em>Auditor</em>
          </h1>
          <p>Find what&apos;s hurting your website, know what to fix first, and see the evidence behind every finding.</p>
          <AuditForm />
        </div>
      </header>

      <main>
        <section className="categories">
          {CATEGORIES.map((category) => (
            <article className="panel" key={category}>
              <i>{ICONS[category]}</i>
              <h3>{CATEGORY_LABELS[category]}</h3>
              <p>{CATEGORY_DESCRIPTIONS[category]}</p>
              <small>{RULES.filter((rule) => rule.category === category).length} rules</small>
            </article>
          ))}
        </section>

        <section className="how">
          <span className="eyebrow dark">MEASURED · PRIORITISED · EXPLAINED</span>
          <h2>From URL to useful answers</h2>
          <div>
            {STEPS.map(([number, title, description]) => (
              <article className="panel" key={number}>
                <b>{number}</b>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer>
        <div className="logo">
          <span>♥</span> Health<b>Auditor</b>
        </div>
        <p>
          The health score is a documented weighted blend of category scores — not a Google ranking.{" "}
          <Link href="/how-it-works">Read the methodology</Link>.
        </p>
        <small>Performance × 0.30 · SEO × 0.20 · Accessibility × 0.20 · Security × 0.20 · Best Practices × 0.10</small>
      </footer>
    </>
  );
}
