"use client";

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
    if (!url.trim()) {
      setError("Please enter a website URL.");
      setState("error");
      return;
    }
    setState("loading");
    setError("");
    try {
      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "We couldn't analyse this website.");
      }
      setReport(data.report as AuditReport);
      setState("done");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something unexpected went wrong.");
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
      <form className="audit-form" onSubmit={submit}>
        <div>
          <label className="sr-only" htmlFor="url">
            Website URL
          </label>
          <input
            id="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com"
            inputMode="url"
            autoComplete="url"
          />
          <button disabled={state === "loading"} type="submit">
            {state === "loading" ? "Auditing…" : "Start audit →"}
          </button>
        </div>
        {state === "error" && (
          <p className="form-error" role="alert">
            ⚠️ {error}
          </p>
        )}
        <p className="free">Performance · SEO · Accessibility · Best practices · Security — no sign-up, nothing stored.</p>
      </form>
      {state === "loading" && <LoadingState />}
      {state === "done" && report && <AuditReportView report={report} onReset={reset} />}
    </>
  );
}
