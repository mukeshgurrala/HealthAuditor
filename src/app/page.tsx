import Link from "next/link";
import { AuditForm } from "@/components/audit-form";
import { RULES } from "@/lib/audit/registry";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { ReportIllustration } from "@/components/report-illustration";
import { ReportShowcase } from "@/components/report-showcase";
import { FeatureGrid } from "@/components/feature-grid";

const STEPS = [
  [
    "1",
    "Measure",
    "Run real-time checks across page structure, accessibility markup, and network requests.",
  ],
  [
    "2",
    "Diagnose",
    "Automatically categorize issues and prioritize performance bottlenecks by impact and effort.",
  ],
  [
    "3",
    "Resolve",
    "Receive step-by-step fixes and actionable engineering guidance, with evidence for every finding.",
  ],
];

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header">
        <nav aria-label="Main navigation">
          <Link href="/" className="logo">
            Health<span>Auditor</span>
          </Link>
          <div className="nav-links">
            <Link href="/demo">Sample report</Link>
            <WhatsAppLink />
          </div>
        </nav>
      </header>
      <main id="main-content">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-grid">
            <div className="hero-copy">
              <span className="hero-tag">SMALL FIXES. BIG WEBSITE ENERGY.</span>
              <h1 id="hero-title">
                Your website.
                <br />
                But <span>way healthier.</span>
              </h1>
              <p>
                Turn performance hiccups, hidden SEO issues, and accessibility
                gaps into a clear plan. Real checks. Practical fixes. No mystery
                scores.
              </p>
              <a href="#audit-input" className="tactile hero-cta">
                Let’s check your website <span aria-hidden="true">↗</span>
              </a>
              <span className="hero-footnote">
                No account. No fuss. Just answers.
              </span>
            </div>
            <ReportIllustration />
          </div>
          <div className="fact-grid" aria-label="Audit capabilities">
            <div>
              <strong>{RULES.length}</strong>
              <span>documented audit rules</span>
            </div>
            <div>
              <strong>5</strong>
              <span>essential health categories</span>
            </div>
            <div>
              <strong>0</strong>
              <span>accounts needed to start</span>
            </div>
          </div>
          <div className="audit-heading">
            <span className="section-kicker">
              YOUR NEXT BETTER WEBSITE STARTS HERE
            </span>
            <h2>Drop a URL. Get a game plan.</h2>
          </div>
          <AuditForm />
        </section>
        <FeatureGrid />
        <ReportShowcase />
        <section className="how" aria-labelledby="how-title">
          <h2 id="how-title">From “hmm…” to “handled.”</h2>
          <p className="section-description">
            From a single URL to a practical plan for improvement.
          </p>
          <div>
            {STEPS.map(([number, title, description]) => (
              <article className="panel" key={number}>
                <span className="step-number" aria-hidden="true">
                  {number}
                </span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
      <footer>
        <div className="footer-content">
          <div className="footer-brand">
            <Link href="/" className="logo">
              Health<span>Auditor</span>
            </Link>
            <small>Better websites, one fix at a time.</small>
          </div>
          <WhatsAppLink />
          <nav aria-label="Footer navigation">
            <Link href="/how-it-works">Methodology</Link>
            <Link href="/how-it-works#privacy">Privacy</Link>
            <a
              href="https://www.linkedin.com/in/mukesh-gurrala-6026b5296/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 hover:text-slate-900 transition-colors inline-flex items-center gap-1 font-medium"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
              </svg>
              LinkedIn
            </a>
          </nav>
        </div>
        <div className="footer-bottom">
          <small>© {new Date().getFullYear()} HealthAuditor</small>
          <span>Built for a healthier web.</span>
        </div>
      </footer>
    </>
  );
}
