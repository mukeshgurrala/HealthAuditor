"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { authClient, authHeaders } from "@/lib/billing/client";
import { useAuth } from "./auth-provider";

type Status = { freeRemaining: number; active: boolean; paidRemaining: number; monthlyLimit: number; plan: { item: { amount: number; currency: string }; period: string; interval: number } | null };
type CheckoutResult = { razorpay_payment_id: string; razorpay_subscription_id: string; razorpay_signature: string };
declare global {
  interface Window {
    Razorpay?: new (options: {
      key: string; subscription_id: string; name: string; prefill: { email: string };
      handler: (result: CheckoutResult) => void; modal: { ondismiss: () => void };
    }) => { open: () => void; on: (name: string, callback: () => void) => void };
  }
}
let checkoutScript: Promise<void> | null = null;
function loadCheckout() {
  if (typeof window !== "undefined" && window.Razorpay) return Promise.resolve();
  return checkoutScript ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => { script.remove(); checkoutScript = null; reject(new Error("Could not load Razorpay. Please try again.")); };
    document.head.appendChild(script);
  });
}

/**
 * Compact billing panel — kept for backwards compatibility.
 * Prefer the dedicated /login and /account pages for full flows.
 * This component now delegates to the shared AuthProvider so allowance
 * stays in sync across the header, audit form and account page.
 */
export function BillingPanel() {
  const { user, status: authStatus, configured, refresh: refreshAuth } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [status, setStatus] = useState<Status | null>(authStatus);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus(authStatus);
  }, [authStatus]);

  async function refresh() {
    const response = await fetch("/api/billing/status", { headers: await authHeaders(), cache: "no-store" });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error); return; }
    setStatus(data);
    await refreshAuth();
  }

  async function signIn() {
    setBusy(true); setMessage("");
    try {
      const client = authClient();
      if (!client) throw new Error("Accounts are not configured yet.");
      const result = sent ? await client.auth.verifyOtp({ email, token: code, type: "email" }) : await client.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
      if (result.error) throw result.error;
      if (!sent) { setSent(true); setMessage("Check your email for your sign-in code."); }
      else { setMessage(""); setCode(""); }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Sign-in failed."); }
    finally { setBusy(false); }
  }
  async function subscribe() {
    setBusy(true); setMessage("");
    try {
      await loadCheckout();
      const response = await fetch("/api/billing/subscribe", { method: "POST", headers: await authHeaders() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (!window.Razorpay) throw new Error("Razorpay did not load.");
      const checkout = new window.Razorpay({ key: data.key, subscription_id: data.subscriptionId, name: "HealthAuditor", prefill: { email: data.email },
        modal: { ondismiss: () => setBusy(false) },
        handler: async (result) => {
          try {
            const verification = await fetch("/api/billing/verify", { method: "POST", headers: { ...await authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(result) });
            const verified = await verification.json();
            if (!verification.ok) throw new Error(verified.error);
            setMessage("Payment verified. Activation can take a moment; refresh your allowance if needed.");
            await refresh();
          } catch (error) { setMessage(error instanceof Error ? error.message : "Could not verify payment. Contact support before paying again."); }
          finally { setBusy(false); }
        },
      });
      checkout.on("payment.failed", () => { setMessage("Payment failed. No access has been granted; please retry or contact support."); setBusy(false); });
      checkout.open();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Checkout failed."); setBusy(false); }
  }
  return <section className="billing-panel" aria-label="Account and audit allowance">
    <h2>10 free audits · then $5/month</h2>
    <p>No card needed for your free audits. Sign in to save your allowance across devices. After 10 audits, continue with a $5 monthly Razorpay subscription.</p>
    {!configured ? <p>Account setup is in progress. Please try the <a href="/demo">sample report</a> in the meantime.</p> : !user ? <form onSubmit={(e) => { e.preventDefault(); void signIn(); }}>
      <label>Email address <input type="email" required value={email} disabled={busy || sent} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
      {sent && <label>Sign-in code <input required value={code} onChange={(e) => setCode(e.target.value)} autoComplete="one-time-code" inputMode="numeric" /></label>}
      <button disabled={busy} type="submit">{busy ? "Please wait…" : sent ? "Verify & sign in" : "Email me a sign-in code"}</button>
      {sent && <button type="button" disabled={busy} onClick={() => { setSent(false); setCode(""); }}>Change email / resend</button>}
      <Link href="/login" className="text-link">Go to login page →</Link>
    </form> : <div>
      {status && <>
        <p><strong>{status.freeRemaining} of 10 free audits remaining</strong>{status.active && ` · ${status.paidRemaining} paid audits remaining this billing cycle`}</p>
        {status.plan ? <p>{new Intl.NumberFormat("en-IN", { style: "currency", currency: status.plan.item.currency }).format(status.plan.item.amount / 100)} per {status.plan.interval === 1 ? "" : `${status.plan.interval} `}{(status.plan.period === "monthly" ? "month" : status.plan.period)} · {status.monthlyLimit} audits per billing cycle. Recurring payment; manage or cancel via Razorpay’s subscription emails, or contact support.</p>
        : <p>$5.00 per month · Razorpay recurring subscription · {status.monthlyLimit || "—"} audits per billing cycle. Cancel anytime.</p>}
        {!status.active && <button type="button" disabled={busy || (!!status.plan && !status.monthlyLimit)} onClick={() => void subscribe()}>{busy ? "Opening checkout…" : "Subscribe for $5/month with Razorpay"}</button>}
      </>}
      <button type="button" disabled={busy} onClick={() => void refresh()}>Refresh allowance</button>
      <Link href="/account" className="tactile" style={{ marginLeft: 8 }}>Manage account</Link>
      <button type="button" disabled={busy} onClick={() => { void authClient()?.auth.signOut(); setMessage(""); }}>Sign out</button>
    </div>}
    {message && <p role="status">{message}</p>}
  </section>;
}
