import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing — HealthAuditor",
  description: "10 free audits, then $5 per month via Razorpay. Simple, transparent pricing for HealthAuditor.",
};

export default function PricingPage() {
  return (
    <main className="pricing-page">
      <section className="pricing-hero">
        <span className="hero-tag">SIMPLE PRICING</span>
        <h1>
          Start free. <br />
          <span>Stay for $5.</span>
        </h1>
        <p>10 audits on us. Then one predictable monthly payment keeps you auditing — no tiers, no surprises.</p>
      </section>

      <section className="pricing-grid" aria-label="Pricing plans">
        <article className="pricing-card">
          <span className="pricing-kicker">FREE — NO CARD NEEDED</span>
          <h2>Starter</h2>
          <p className="pricing-desc">Try the full report before you pay anything.</p>
          <div className="pricing-price">
            <strong>$0</strong>
            <span>for your first 10 audits</span>
          </div>
          <ul>
            <li>10 successful audits per account</li>
            <li>All 5 categories — Performance, SEO, A11y, Best Practices, Security</li>
            <li>Priority engine, quick wins &amp; evidence</li>
            <li>In-memory report cache — re-audits are fresh in seconds</li>
          </ul>
          <Link href="/login" className="tactile pricing-cta">
            Claim 10 free audits
          </Link>
          <small>Sign in with email OTP — no password. Free audits persist across devices.</small>
        </article>

        <article className="pricing-card featured">
          <span className="pricing-kicker">MOST POPULAR</span>
          <h2>Pro</h2>
          <p className="pricing-desc">After your free audits, keep improving with continuous access.</p>
          <div className="pricing-price">
            <strong>$5</strong>
            <span>per month · Razorpay subscription</span>
          </div>
          <ul>
            <li>Unlimited audits while subscription is active*</li>
            <li>Recurring monthly billing via Razorpay</li>
            <li>Live entitlement check — no webhook delay</li>
            <li>Manage or cancel via Razorpay subscription emails</li>
          </ul>
          <Link href="/login?next=%2Faccount" className="tactile pricing-cta">
            Subscribe for $5 / month
          </Link>
          <small>
            * Monthly allowance is configured by the site owner via AUDITS_PER_MONTH. Checkout is disabled until a Razorpay
            monthly plan is set. See billing setup for details.
          </small>
        </article>
      </section>

      <section className="pricing-details">
        <div>
          <h3>How the 10 free audits work</h3>
          <p>
            Each email account gets exactly <strong>10 successful audits</strong>. Failed audits and busy-slot retries do
            not count — your credit is refunded automatically. Concurrent requests reserve atomically, so you can&apos;t
            exceed the limit even with parallel tabs.
          </p>
        </div>
        <div>
          <h3>What $5 / month unlocks</h3>
          <p>
            When your free audits are used, we check Razorpay&apos;s live subscription status on every audit request. An
            <strong> active subscription</strong> in the current billing period unlocks your plan. Cancelled, expired,
            pending or halted subscriptions don&apos;t grant access. Billing renews monthly for up to 120 cycles.
          </p>
        </div>
        <div>
          <h3>No surprises</h3>
          <p>
            The price and billing period come straight from your Razorpay plan — we never invent a price in code. You see
            the real plan amount and currency before checkout. Support can manage subscriptions in the Razorpay dashboard.
          </p>
        </div>
      </section>

      <section className="pricing-faq">
        <h2>Questions</h2>
        <dl>
          <div>
            <dt>Can I use multiple emails for more free audits?</dt>
            <dd>
              Technically yes — email accounts are not proof of unique identity. If that&apos;s unacceptable for your use
              case, add stronger identity controls on top (phone verification, SSO, etc.).
            </dd>
          </div>
          <div>
            <dt>What happens if my payment fails?</dt>
            <dd>
              Razorpay will retry per your account settings. While the subscription is not &quot;active&quot; and in its
              current billing period, audits remain locked at the paywall. Refresh your allowance after payment.
            </dd>
          </div>
          <div>
            <dt>How do I cancel?</dt>
            <dd>
              Use the &quot;Manage subscription&quot; link in Razorpay&apos;s subscription emails, or contact support.
              Cancellation stops future billing; you keep access until the current period ends.
            </dd>
          </div>
          <div>
            <dt>Do you store my site&apos;s data?</dt>
            <dd>
              Reports are cached in memory for up to 2 minutes and coalesced for identical requests. No audit content is
              persisted unless you explicitly save it. See <Link href="/how-it-works#privacy">Privacy</Link>.
            </dd>
          </div>
        </dl>
      </section>

      <section className="pricing-cta-bottom">
        <h2>Ready to make your site healthier?</h2>
        <p>10 free audits — no card. Clear answers before you pay.</p>
        <div className="cta-row">
          <Link href="/login" className="tactile">
            Sign in &amp; start free
          </Link>
          <Link href="/demo" className="tactile secondary-tactile">
            View sample report
          </Link>
        </div>
      </section>
    </main>
  );
}
