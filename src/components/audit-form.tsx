"use client";

import { BillingPanel } from "./billing-panel";
import { authHeaders } from "@/lib/billing/client";
import { normalizeUrlInput } from "@/lib/url-input";
import { FormEvent, useState } from "react";
import type { AuditReport } from "@/lib/audit/types";
import { AuditReportView } from "./audit-report";
import { LoadingState } from "./loading-state";

type State = "idle" | "loading" | "error" | "done";

export function AuditForm() {
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
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Enter a valid website URL.",
      );
      setState("error");
      return;
    }
    setState("loading");
    setError("");
    try {
      const response = await fetch("/api/audit", {
        signal: AbortSignal.timeout(65_000),
        method: "POST",
        headers: { "content-type": "application/json", ...await authHeaders() },
        body: JSON.stringify({ url: normalized }),
      });
      const data = await response.json();
      window.dispatchEvent(new Event("billing-refresh"));
      if (!response.ok || !data.success) {
        throw new Error(data.error || "We couldn't analyse this website.");
      }
      setReport(data.report as AuditReport);
      setState("done");
    } catch (caught) {
      setError(
        caught instanceof Error && caught.name === "TimeoutError"
          ? "The audit took too long. Please try again or choose another website."
          : caught instanceof TypeError
            ? "Could not connect to the audit service. Check your connection and try again."
            : caught instanceof Error
              ? caught.message
              : "Something unexpected went wrong.",
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

  return (
    <>
      <BillingPanel />
      <form
        id="audit-input"
        className="audit-form"
        onSubmit={submit}
        aria-busy={state === "loading"}
        noValidate
      >
        <div className="url-input-container">
          <label className="sr-only" htmlFor="url">
            Website URL
          </label>
          <input
            id="url"
            data-audit-input="true"
            maxLength={2048}
            disabled={state === "loading"}
            aria-invalid={state === "error"}
            aria-describedby={state === "error" ? "audit-error" : "audit-help"}
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com"
            inputMode="url"
            autoComplete="url"
          />
          <button disabled={state === "loading"} type="submit">
            {state === "loading" && (
              <span className="button-spinner" aria-hidden="true" />
            )}
            {state === "loading" ? "Analyzing…" : "Analyze Site"}
          </button>
        </div>
        {state === "error" && (
          <p id="audit-error" className="form-error" role="alert">
            {error}
          </p>
        )}
        <p id="audit-help" className="free">
          Enter a public website URL. Sign in above for 10 free audits.
        </p>
      </form>
      {state === "loading" && <LoadingState />}
      {state === "done" && report && (
        <AuditReportView report={report} onReset={reset} />
      )}
    </>
  );
}
