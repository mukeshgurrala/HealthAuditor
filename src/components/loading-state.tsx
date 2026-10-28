"use client";
import { useEffect, useState } from "react";
const STEPS = [
  "Connecting to the target website…",
  "Analyzing DOM structure and resources…",
  "Checking links and security headers…",
  "Evaluating available performance metrics…",
  "Running rules and prioritizing recommendations…",
];
export function LoadingState() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(
      () => setElapsed(Math.floor((Date.now() - started) / 1000)),
      1000,
    );
    return () => clearInterval(timer);
  }, []);
  const step = Math.min(Math.floor(elapsed / 5), STEPS.length - 1);
  return (
    <section
      className="panel loading"
      aria-label="Audit in progress"
      aria-busy="true"
    >
      <span className="spinner" aria-hidden="true" />
      <h2>Inspecting your website</h2>
      <p>
        The audit is running on the server. These are estimated stages, not live
        telemetry.
      </p>
      <ol className="audit-log" aria-live="polite" aria-relevant="additions">
        {STEPS.slice(0, step + 1).map((text, index) => (
          <li key={text}>
            <span aria-hidden="true">{index === step ? "◉" : "·"}</span>
            {text}
          </li>
        ))}
      </ol>
      <p>
        {elapsed}s elapsed ·{" "}
        {elapsed >= 25
          ? "Still working. Larger websites can take up to a minute."
          : "Results will appear here automatically."}
      </p>
    </section>
  );
}
