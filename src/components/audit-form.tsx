"use client";

import { authHeaders } from "@/lib/billing/client";
import { normalizeUrlInput } from "@/lib/url-input";
import { FormEvent, useState } from "react";
import Link from "next/link";
import type { AuditReport } from "@/lib/audit/types";
import { AuditReportView } from "./audit-report";
import { LoadingState } from "./loading-state";
import { useAuth } from "./auth-provider";

type State = "idle" | "loading" | "error" | "done" | "paywall";

export function AuditForm() {
  const { user, status, configured } = useAuth();
  const [url, setUrl] = useState("");
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");
  const [report, setReport] = useState<AuditReport | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (state === "loading") return;
    let normalized: string;
    try {
      normalized = normalizeUrlInput(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enter a valid website URL.");
      setState("error");
      return;
    }
    if (!configured) {
      setError("Accounts are not configured yet. Please try the sample report.");
      setState("error");
      return;
    }
    if (!user) {
      setError("Please sign in to use your 10 free audits.");
      setState("paywall");
      return;
    }
    setState("loading");
    setError("");
    try {
      const response = await fetch("/api/audit", {
        signal: AbortSignal.timeout(65_000),
        method: "POST",
        headers: { "content-type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ url: normalized }),
      });
      const data = await response.json();
      window.dispatchEvent(new Event("billing-refresh"));
      if (!response.ok || !data.success) {
        if (response.status === 402) {
          setError(data.error || "Your free audits are used. Subscribe to continue.");
          setState("paywall");
          return;
        }
        if (response.status === 401) {
          setError("Please sign in again to continue.");
          setState("paywall");
          return;
        }
        throw new Error(data.error || "We couldn't analyse this website.");
      }
      setReport(data.report as AuditReport);
      setState("done");
    } catch (caught) {
      if (state === "paywall") return;
      setError(
        caught instanceof Error && caught.name === "TimeoutError"
          ? "The audit took too long. Please try again or choose another website."
          : caught instanceof TypeError
            ? "Could not connect to the audit service. Check your connection and try again."
            : caught instanceof Error
              ? caught.message
              : "Something unexpected went wrong."
      );
      setState("error");
    }
  }

  function reset() {
    setState("idle");
    setReport(null);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const freeRemaining = status?.freeRemaining ?? null;
  const isSubscribed = status?.active ?? false;

  return (
    <>
      {configured && user && freeRemaining !== null && (
        <div className="audit-allowance" role="status">
          {isSubscribed ? (
            <span>
              <strong>Pro</strong> · {status?.paidRemaining ?? 0} of {status?.monthlyLimit ?? 0} paid audits left this cycle ·{" "}
              <Link href="/account">Manage</Link>
            </span>
          ) : (
            <span>
              <strong>{freeRemaining} of 10 free audits remaining</strong>
              {freeRemaining === 0 && (
                <>
                  {" "}
                  — <Link href="/pricing">Subscribe for $5/month</Link>
                </>
              )}
              {freeRemaining > 0 && freeRemaining <= 3 && (
                <span> · You&apos;re almost out — $5/month keeps you auditing.</span>
              )}
            </span>
          )}
        </div>
      )}
      {!configured && <div className="audit-allowance">Account setup is in progress — try the sample report.</div>}
      {!user && configured && (
        <div className="audit-allowance guest">
          <span>Sign in to claim your 10 free audits — no card needed. Then $5/month via Razorpay.</span>
          <Link href="/login" className="tactile small">
            Sign in
          </Link>
        </div>
      )}

      <form id="audit-input" className="audit-form" onSubmit={submit} aria-busy={state === "loading"} noValidate>
        <div className="url-input-container">
          <label className="sr-only" htmlFor="url">
            Website URL
          </label>
          <input
            id="url"
            data-audit-input="true"
            maxLength={2048}
            disabled={state === "loading"}
            aria-invalid={state === "error" || state === "paywall"}
            aria-describedby={state === "error" || state === "paywall" ? "audit-error" : "audit-help"}
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com"
            inputMode="url"
            autoComplete="url"
          />
          <button disabled={state === "loading"} type="submit">
            {state === "loading" && <span className="button-spinner" aria-hidden="true" />}
            {state === "loading" ? "Analyzing…" : "Analyze Site"}
          </button>
        </div>
        {(state === "error" || state === "paywall") && (
          <div id="audit-error" className="form-error" role="alert">
            <p>{error}</p>
            {state === "paywall" && (
              <div className="paywall-actions">
                {!user ? (
                  <Link href="/login" className="tactile">
                    Sign in to start free
                  </Link>
                ) : (
                  <Link href="/pricing" className="tactile">
                    Subscribe for $5/month
                  </Link>
                )}
                <Link href="/pricing" className="text-link">
                  See pricing →
                </Link>
              </div>
            )}
          </div>
        )}
        <p id="audit-help" className="free">
          {user ? (
            <>
              Enter a public website URL.{" "}
              {freeRemaining !== null && !isSubscribed && freeRemaining > 0 && `${freeRemaining} free audits left.`}
              {isSubscribed && "Pro — auditing with your subscription."}
              {freeRemaining === 0 && !isSubscribed && "Free audits used — $5/month to continue."}
            </>
          ) : (
            <>
              Enter a public website URL. <Link href="/login">Sign in</Link> for 10 free audits — then $5/month.
            </>
          )}
        </p>
      </form>
      {state === "loading" && <LoadingState />}
      {state === "done" && report && <AuditReportView report={report} onReset={reset} />}
    </>
  );
}
