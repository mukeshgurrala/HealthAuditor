"use client";

import { useState } from "react";
import type { Finding } from "@/lib/audit/types";

const SEVERITY_LABEL: Record<Finding["severity"], string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

const EFFORT_LABEL: Record<Finding["effort"], string> = {
  easy: "Easy fix",
  medium: "Medium effort",
  hard: "Larger project",
};

/**
 * Every finding renders the same blocks (spec §6): Problem, Why it matters, Evidence,
 * Impact, How to fix, and a collapsed Technical details section (spec §8).
 */
export function FindingCard({ finding, rank }: { finding: Finding; rank?: number }) {
  const [reported, setReported] = useState<null | "yes" | "no">(null);
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <article className={`finding severity-${finding.severity}`}>
      <header>
        <div className="finding-title">
          {rank ? <span className="rank">{rank}</span> : null}
          <h4>{finding.problem}</h4>
        </div>
        <div className="finding-tags">
          <span className={`badge ${finding.severity}`}>{SEVERITY_LABEL[finding.severity]}</span>
          <span className="badge effort">{EFFORT_LABEL[finding.effort]}</span>
          {finding.occurrences > 1 ? <span className="badge count">{finding.occurrences} affected</span> : null}
          <code className="rule-id" title={`${finding.name} — rule ${finding.ruleId}`}>{finding.ruleId}</code>
        </div>
      </header>

      <div className="finding-block">
        <b>Why it matters</b>
        <p>{finding.whyItMatters}</p>
      </div>

      <div className="finding-block">
        <b>Evidence</b>
        <div className="observed">
          <div>
            <small>Observed</small>
            <span>{finding.observed}</span>
          </div>
          <div>
            <small>Expected</small>
            <span>{finding.expected}</span>
          </div>
        </div>
        {finding.evidence.length ? (
          <dl className="evidence">
            {finding.evidence.map((item, index) => (
              <div key={`${item.label}-${index}`}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>

      <div className="finding-block">
        <b>Impact</b>
        <p>{finding.impact}</p>
      </div>

      <div className="fix">
        <b>How to fix</b>
        <p>{finding.howToFix}</p>
      </div>

      {(finding.technicalFix || finding.technicalDetails.length || finding.references.length) && (
        <details className="tech">
          <summary>Technical details</summary>
          <div className="tech-body">
            <dl className="evidence">
              <div>
                <dt>Rule</dt>
                <dd>
                  {finding.ruleId} — {finding.name}
                </dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd>{finding.category}</dd>
              </div>
              <div>
                <dt>URL</dt>
                <dd className="wrap">{finding.url}</dd>
              </div>
              {finding.element ? (
                <div>
                  <dt>Element</dt>
                  <dd>
                    <code>{finding.element}</code>
                  </dd>
                </div>
              ) : null}
              {finding.technicalDetails.map((item, index) => (
                <div key={`${item.label}-${index}`}>
                  <dt>{item.label}</dt>
                  <dd className="wrap">{item.value}</dd>
                </div>
              ))}
              <div>
                <dt>Priority score</dt>
                <dd>{finding.priority}</dd>
              </div>
            </dl>
            {finding.technicalFix ? <pre>{finding.technicalFix}</pre> : null}
            {finding.references.length ? (
              <p className="refs">
                {finding.references.map((reference) => (
                  <a key={reference} href={reference} target="_blank" rel="noopener noreferrer">
                    {new URL(reference).hostname}
                  </a>
                ))}
              </p>
            ) : null}
          </div>
        </details>
      )}

      <div className="false-positive">
        {reported === null && (
          <>
            <span>Was this finding incorrect?</span>
            <button type="button" onClick={() => setReported("yes")}>Yes, report issue</button>
            <button type="button" className="ghost" onClick={() => setReported("no")}>No</button>
          </>
        )}
        {reported === "no" && <span>Thanks — noted.</span>}
        {reported === "yes" && !sent && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void fetch("/api/false-positive", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ ruleId: finding.ruleId, url: finding.url, finding: finding.problem, explanation: note }),
              }).catch(() => undefined);
              setSent(true);
            }}
          >
            <label htmlFor={`fp-${finding.ruleId}-${finding.url}`} className="sr-only">
              Why is this finding wrong?
            </label>
            <input
              id={`fp-${finding.ruleId}-${finding.url}`}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="What did we get wrong?"
            />
            <button type="submit">Send report</button>
          </form>
        )}
        {sent && <span>Thanks — {finding.ruleId} has been flagged for review.</span>}
      </div>
    </article>
  );
}
