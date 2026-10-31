import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in — HealthAuditor",
  description: "Sign in to HealthAuditor to claim your 10 free website audits and manage your $5/month subscription.",
};

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="login-page">
      <div className="login-container">
        <div className="login-hero">
          <span className="hero-tag">WELCOME BACK</span>
          <h1>
            Sign in to
            <br />
            <span>HealthAuditor</span>
          </h1>
          <p>
            One account. <strong>10 free audits</strong> to start. Then keep auditing with a <strong>$5 / month</strong>{" "}
            Razorpay subscription — cancel anytime.
          </p>
          <ul className="login-perks">
            <li>
              <span>✓</span> 10 free audits per account — no card needed
            </li>
            <li>
              <span>✓</span> $5 / month for continued access
            </li>
            <li>
              <span>✓</span> 60 transparent rules, evidence for every finding
            </li>
          </ul>
          <div className="login-trust">
            <small>
              Secure email OTP sign-in via Supabase. Your plan is powered by Razorpay Subscriptions.
              <br />
              <Link href="/how-it-works#privacy">Privacy</Link> · <Link href="/pricing">Pricing details</Link> ·{" "}
              <Link href="/demo">Try sample report</Link>
            </small>
          </div>
        </div>
        <div className="login-card-wrap">
          <Suspense fallback={<div className="login-card"><p>Loading sign-in…</p></div>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
      <section className="login-pricing-teaser">
        <div className="pricing-teaser-grid">
          <div className="pricing-teaser-card free">
            <span className="pricing-kicker">STARTER — FREE</span>
            <h3>10 free audits</h3>
            <p>Perfect to evaluate the report quality and fix your first site.</p>
            <strong className="pricing-price">
              $0 <span>/ 10 audits total</span>
            </strong>
            <ul>
              <li>Full health report — all 5 categories</li>
              <li>Priority engine &amp; quick wins</li>
              <li>Evidence for every finding</li>
            </ul>
          </div>
          <div className="pricing-teaser-card pro">
            <span className="pricing-kicker">PRO — $5 / MONTH</span>
            <h3>Keep auditing</h3>
            <p>After your 10 free audits, continue with a simple monthly plan.</p>
            <strong className="pricing-price">
              $5 <span>/ month</span>
            </strong>
            <ul>
              <li>Unlimited audits while subscribed</li>
              <li>Razorpay recurring billing — cancel anytime</li>
              <li>Same transparent methodology</li>
            </ul>
            <Link href="/pricing" className="tactile">
              See what&apos;s included
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
