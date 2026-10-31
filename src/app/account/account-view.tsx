"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { authHeaders } from "@/lib/billing/client";

type Status = {
  freeRemaining: number;
  active: boolean;
  paidRemaining: number;
  monthlyLimit: number;
  plan: { item: { amount: number; currency: string }; period: string; interval: number } | null;
};

type CheckoutResult = { razorpay_payment_id: string; razorpay_subscription_id: string; razorpay_signature: string };
declare global {
  interface Window {
    Razorpay?: new (options: {
      key: string;
      subscription_id: string;
      name: string;
      prefill: { email: string };
      handler: (result: CheckoutResult) => void;
      modal: { ondismiss: () => void };
    }) => { open: () => void; on: (name: string, cb: () => void) => void };
  }
}

let checkoutScript: Promise<void> | null = null;
function loadCheckout() {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.Razorpay) return Promise.resolve();
  return (checkoutScript ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => {
      script.remove();
      checkoutScript = null;
      reject(new Error("Could not load Razorpay. Please try again."));
    };
    document.head.appendChild(script);
  }));
}

export function AccountView() {
  const { user, status: authStatus, loading: authLoading, configured, refresh, signOut } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(authStatus);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (authStatus) setStatus(authStatus);
  }, [authStatus]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?next=%2Faccount");
    }
  }, [authLoading, user, router]);

  async function refreshStatus() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/billing/status", { headers: await authHeaders(), cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load status.");
      setStatus(data);
      await refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to refresh.");
    } finally {
      setLoading(false);
    }
  }

  async function subscribe() {
    setBusy(true);
    setMessage("");
    try {
      await loadCheckout();
      const res = await fetch("/api/billing/subscribe", { method: "POST", headers: await authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start checkout.");
      if (!window.Razorpay) throw new Error("Razorpay did not load.");
      const checkout = new window.Razorpay({
        key: data.key,
        subscription_id: data.subscriptionId,
        name: "HealthAuditor",
        prefill: { email: data.email },
        modal: { ondismiss: () => setBusy(false) },
        handler: async (result) => {
          try {
            const verification = await fetch("/api/billing/verify", {
              method: "POST",
              headers: { ...await authHeaders(), "Content-Type": "application/json" },
              body: JSON.stringify(result),
            });
            const verified = await verification.json();
            if (!verification.ok) throw new Error(verified.error || "Verification failed.");
            setMessage("Payment verified. Activation can take a moment — refresh your allowance if needed.");
            await refreshStatus();
          } catch (e) {
            setMessage(e instanceof Error ? e.message : "Could not verify payment. Contact support before paying again.");
          } finally {
            setBusy(false);
          }
        },
      });
      checkout.on("payment.failed", () => {
        setMessage("Payment failed. No access has been granted; please retry or contact support.");
        setBusy(false);
      });
      checkout.open();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Checkout failed.");
      setBusy(false);
    }
  }

  if (authLoading) {
    return (
      <div className="account-loading">
        <div className="spinner" aria-label="Loading" />
        <p>Loading your account…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="account-guest">
        <h1>Sign in to view your account</h1>
        <p>You need to sign in to see audits remaining and manage your subscription.</p>
        <Link href="/login?next=%2Faccount" className="tactile">
          Sign in
        </Link>
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="account-guest">
        <h1>Account setup in progress</h1>
        <p>Supabase is not configured yet. Try the sample report while we finish setup.</p>
        <Link href="/demo" className="tactile">
          View sample report
        </Link>
      </div>
    );
  }

  const freeRemaining = status?.freeRemaining ?? 0;
  const paidRemaining = status?.paidRemaining ?? 0;
  const monthlyLimit = status?.monthlyLimit ?? 0;
  const plan = status?.plan;
  const isSubscribed = status?.active ?? false;

  // Fallback display price — requirement is $5/month
  const displayPrice = plan
    ? new Intl.NumberFormat("en-IN", { style: "currency", currency: plan.item.currency }).format(plan.item.amount / 100)
    : "$5.00";
  const displayPeriod = plan
    ? `${plan.interval === 1 ? "" : `${plan.interval} `}${plan.period === "monthly" ? "month" : plan.period}`
    : "month";

  return (
    <div className="account-wrap">
      <div className="account-header">
        <div>
          <span className="hero-tag">YOUR ACCOUNT</span>
          <h1>Hi, {user.email}</h1>
          <p>Manage your audit allowance and subscription.</p>
        </div>
        <div className="account-actions">
          <button type="button" className="tactile secondary-tactile" onClick={() => void refreshStatus()} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh allowance"}
          </button>
          <Link href="/" className="tactile">
            New audit
          </Link>
          <button
            type="button"
            className="tactile"
            onClick={async () => {
              await signOut();
              router.push("/");
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="account-cards">
        <section className="account-card">
          <h2>Free audits</h2>
          <div className="account-metric">
            <strong>
              {freeRemaining} <span>/ 10 remaining</span>
            </strong>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${(freeRemaining / 10) * 100}%` }} />
            </div>
          </div>
          <p>
            {freeRemaining > 0
              ? `You have ${freeRemaining} free audits left. No card needed.`
              : "Your 10 free audits are used. Subscribe to keep auditing."}
          </p>
        </section>

        <section className="account-card featured">
          <h2>Pro subscription</h2>
          {!isSubscribed ? (
            <>
              <div className="account-price">
                <strong>$5</strong>
                <span>/ month</span>
              </div>
              <p>
                {plan
                  ? `${displayPrice} per ${displayPeriod} · ${monthlyLimit || "—"} audits per billing cycle. Recurring payment; cancel anytime.`
                  : `$5.00 per month · Razorpay recurring subscription. Manage or cancel via Razorpay subscription emails.`}
              </p>
              <button type="button" className="tactile" onClick={() => void subscribe()} disabled={busy || (!!plan && !monthlyLimit)}>
                {busy ? "Opening checkout…" : "Subscribe with Razorpay"}
              </button>
              <small>Checkout uses Razorpay Subscriptions. You&apos;ll see the real plan amount before paying.</small>
            </>
          ) : (
            <>
              <div className="account-badge">Active subscription</div>
              <p>
                You have <strong>{paidRemaining}</strong> of <strong>{monthlyLimit}</strong> paid audits remaining this billing cycle.
              </p>
              <p className="muted">
                {plan && `${displayPrice} per ${displayPeriod} · Billing cycle resets automatically.`}
              </p>
              <small>Manage or cancel via Razorpay subscription emails, or contact support.</small>
            </>
          )}
        </section>

        <section className="account-card">
          <h2>How it works</h2>
          <ul>
            <li>
              <strong>10 free audits</strong> — per email account, no card, persists across devices.
            </li>
            <li>
              <strong>$5 / month</strong> — Razorpay recurring subscription after free audits.
            </li>
            <li>
              <strong>Live checks</strong> — every audit verifies your subscription with Razorpay.
            </li>
            <li>
              <strong>Cancel anytime</strong> — via Razorpay emails or support.
            </li>
          </ul>
          <Link href="/pricing" className="text-link">
            Full pricing details ↗
          </Link>
        </section>
      </div>

      {message && (
        <p role="status" className={message.includes("failed") || message.includes("Could not") ? "login-error" : "login-success"}>
          {message}
        </p>
      )}

      <section className="account-help">
        <h3>Need help?</h3>
        <p>
          Payment not activating? Click <strong>Refresh allowance</strong>. Still stuck? Contact support and include your email
          and Razorpay subscription ID.
        </p>
        <p>
          <Link href="/demo">Sample report</Link> · <Link href="/how-it-works">Methodology</Link> ·{" "}
          <Link href="/how-it-works#privacy">Privacy</Link>
        </p>
      </section>
    </div>
  );
}
