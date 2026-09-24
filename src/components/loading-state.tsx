"use client";

import { useEffect, useState } from "react";

const STEPS = [
  "Fetching the page…",
  "Parsing HTML and collecting resources…",
  "Measuring images, scripts and stylesheets…",
  "Checking links, robots.txt and sitemap…",
  "Running audit rules and scoring…",
];

export function LoadingState() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setStep((current) => Math.min(current + 1, STEPS.length - 1)), 3500);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="panel loading" aria-live="polite">
      <span className="spinner" />
      <h2>Scanning website…</h2>
      <p>{STEPS[step]}</p>
      <div className="skeletons">
        {[1, 2, 3, 4].map((key) => (
          <i key={key} />
        ))}
      </div>
    </section>
  );
}
