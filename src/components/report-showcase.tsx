"use client";
import { useRef, useState } from "react";
import Link from "next/link";

// Replace imageSrc with a local screenshot path in /public. Text and media stay separate.
const SHOWCASES = [
  {
    id: "priorities",
    title: "A fix list. Not a guessing game.",
    tag: "01 / ACTIONABLE FINDINGS",
    description:
      "See the problem, inspect the evidence, and get a practical fix. Recommendations are ranked by impact and effort.",
    imageSrc: "",
    variant: "apricot",
    labels: ["Fix first", "Image delivery", "Accessible names"],
    detail:
      "Each finding includes observed and expected values, affected elements, and implementation guidance. The sample report is generated from a bundled fixture, not a live customer website.",
  },
  {
    id: "scores",
    title: "The big picture, made simple.",
    tag: "02 / CLEAR CATEGORY SCORES",
    description:
      "Five categories bring the important details together. Explore the evidence behind every score.",
    imageSrc: "",
    variant: "mint",
    labels: ["Performance", "Accessibility", "Security"],
    detail:
      "Category scores come from documented rules. Unavailable performance metrics are marked as unmeasured, never estimated. Open the sample report to explore filters, details, and fixes.",
  },
];
export function ReportShowcase() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<(typeof SHOWCASES)[number] | null>(
    null,
  );
  function open(item: (typeof SHOWCASES)[number]) {
    setSelected(item);
    dialog.current?.showModal();
  }
  return (
    <section className="showcase" aria-labelledby="showcase-title">
      <div className="section-heading">
        <div>
          <span className="section-kicker">
            THE OUTPUT, WITHOUT THE OVERWHELM
          </span>
          <h2 id="showcase-title">
            Good insights.
            <br />
            Even better next steps.
          </h2>
        </div>
        <Link href="/demo" className="text-link">
          Explore a sample report ↗
        </Link>
      </div>
      <div className="showcase-grid">
        {SHOWCASES.map((item) => (
          <article className="showcase-card" key={item.id}>
            <button
              type="button"
              className={`showcase-preview ${item.variant}`}
              onClick={() => open(item)}
              aria-label={`Preview: ${item.title}`}
              aria-haspopup="dialog"
            >
              {item.imageSrc ? (
                <span
                  className="uploaded-preview"
                  style={{ backgroundImage: `url(${item.imageSrc})` }}
                  role="img"
                  aria-label={item.title}
                />
              ) : (
                <span className="mini-report">
                  <span className="mini-window">
                    ● ● ● <b>Sample report</b>
                  </span>
                  {item.labels.map((label, i) => (
                    <span className="mini-row" key={label}>
                      <span className="mini-number">0{i + 1}</span>
                      <span>
                        {label}
                        <i />
                      </span>
                      <span className="mini-check">
                        {item.id === "priorities" ? "→" : "✓"}
                      </span>
                    </span>
                  ))}
                </span>
              )}
              <span className="preview-expand" aria-hidden="true">
                ↗
              </span>
            </button>
            <span className="section-kicker">{item.tag}</span>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </article>
        ))}
      </div>
      <dialog
        ref={dialog}
        className="preview-dialog"
        aria-labelledby="preview-title"
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current.close();
        }}
      >
        {selected && (
          <>
            <button
              type="button"
              className="dialog-close tactile"
              onClick={() => dialog.current?.close()}
              aria-label="Close preview"
              autoFocus
            >
              ✕
            </button>
            <span className="section-kicker">SAMPLE REPORT PREVIEW</span>
            <h2 id="preview-title">{selected.title}</h2>
            <p>{selected.detail}</p>
            <Link className="tactile" href="/demo">
              Open interactive report ↗
            </Link>
          </>
        )}
      </dialog>
    </section>
  );
}
