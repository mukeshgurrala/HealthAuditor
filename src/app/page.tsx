import Link from "next/link";
import { LinkedInLink } from "@/components/linkedin-link";
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
            <LinkedInLink />
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
            <LinkedInLink />
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
