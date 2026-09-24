"use client";

import { useMemo, useState } from "react";
import type { AuditReport, Category, Finding, LinkInfo } from "@/lib/audit/types";
import { FindingCard } from "./finding-card";
import { ScoreRing, scoreColor } from "./score-ring";

function formatBytes(bytes: number | null): string {
  if (bytes === null) return "not measured";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const LINK_FILTERS = ["all", "internal", "external", "broken", "redirects"] as const;
type LinkFilter = (typeof LINK_FILTERS)[number];

function filterLinks(links: LinkInfo[], filter: LinkFilter): LinkInfo[] {
  switch (filter) {
    case "internal":
      return links.filter((link) => link.internal);
    case "external":
      return links.filter((link) => !link.internal);
    case "broken":
      return links.filter((link) => !link.unverified && link.status !== null && link.status >= 400);
    case "redirects":
      return links.filter((link) => link.status !== null && link.status >= 300 && link.status < 400);
    default:
      return links;
  }
}

export function AuditReportView({ report, onReset }: { report: AuditReport; onReset: () => void }) {
  const [activeCategory, setActiveCategory] = useState<Category | "all">("all");
  const [linkFilter, setLinkFilter] = useState<LinkFilter>("all");

  const visibleFindings = useMemo<Finding[]>(
    () => (activeCategory === "all" ? report.findings : report.findings.filter((f) => f.category === activeCategory)),
    [report.findings, activeCategory],
  );

  const brokenLinks = report.links.filter((link) => !link.unverified && link.status !== null && link.status >= 400);
  const measuredImages = report.images.filter((image) => image.bytes !== null);
  const securityCategory = report.categories.find((category) => category.category === "security");

  return (
    <section className="report">
      <div className="panel">
        <div className="report-head">
          <div>
            <small>HEALTH REPORT · RULESET v{report.version}</small>
            <h2>{report.finalUrl}</h2>
            <p className="muted">
              {new Date(report.finishedAt).toLocaleString()} · {report.summary.rulesRun} rules ·{" "}
              {(report.durationMs / 1000).toFixed(1)}s · {report.performanceSource}
            </p>
          </div>
          <button className="secondary" onClick={onReset} type="button">
            ↺ New audit
          </button>
        </div>

        <div className="scores">
          <ScoreRing featured label="Website Health" score={report.score} caption={report.scoreLabel.replace("-", " ")} />
          {report.categories.map((category) => (
            <ScoreRing key={category.category} label={category.label} score={category.score} />
          ))}
        </div>

        <div className="severity-row">
          {(["critical", "high", "medium", "low"] as const).map((severity) => (
            <div key={severity}>
              <strong className={`sev-${severity}`}>{report.summary.counts[severity]}</strong>
              <span>{severity}</span>
            </div>
          ))}
          <div>
            <strong className="sev-pass">{report.summary.passedChecks}</strong>
            <span>passed</span>
          </div>
        </div>

        {report.notes.length ? (
          <ul className="notes">
            {report.notes.map((note) => (
              <li key={note}>ℹ️ {note}</li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* Priority engine ------------------------------------------------- */}
      <div className="panel">
        <h2>🔴 Fix first</h2>
        <p className="muted">
          Ranked by impact × how many elements are affected × how easy the fix is. The formula is documented on the{" "}
          <a href="/how-it-works">methodology page</a>.
        </p>
        {report.priorities.length ? (
          <ol className="priority-list">
            {report.priorities.map((finding, index) => (
              <li key={`${finding.ruleId}-${finding.url}-${index}`}>
                <span className="rank">{index + 1}</span>
                <div>
                  <b>{finding.problem}</b>
                  <small>
                    Impact: {finding.severity === "critical" || finding.severity === "high" ? "High" : finding.severity === "medium" ? "Medium" : "Low"} ·
                    Effort: {finding.effort === "easy" ? "Easy" : finding.effort === "medium" ? "Medium" : "Hard"} · {finding.ruleId}
                  </small>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p>No problems were detected by the checks that ran.</p>
        )}
      </div>

      {/* Quick wins ------------------------------------------------------ */}
      {report.quickWins.length ? (
        <div className="panel">
          <h2>⚡ {report.quickWins.length} quick wins</h2>
          <p className="muted">Meaningful impact, little effort.</p>
          <ul className="quick-wins">
            {report.quickWins.map((finding) => (
              <li key={`${finding.ruleId}-${finding.url}`}>
                <span>✓</span>
                <div>
                  <b>{finding.howToFix}</b>
                  <small>{finding.problem}</small>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Core Web Vitals & page stats ------------------------------------ */}
      <div className="panel">
        <h2>📊 Performance measurements</h2>
        <div className="metrics">
          {report.metrics
            ? (
                [
                  ["Largest Contentful Paint", report.metrics.lcp],
                  ["Interaction to Next Paint", report.metrics.inp],
                  ["Cumulative Layout Shift", report.metrics.cls],
                  ["First Contentful Paint", report.metrics.fcp],
                  ["Total Blocking Time", report.metrics.tbt],
                  ["Speed Index", report.metrics.speedIndex],
                ] as const
              ).map(([label, metric]) => (
                <div key={label} className={`metric rating-${metric.rating}`}>
                  <strong>{metric.display}</strong>
                  <span>{label}</span>
                  <small>{metric.explanation}</small>
                </div>
              ))
            : null}
        </div>
        <div className="stats">
          <div>
            <strong>{formatBytes(report.pageStats.totalBytes)}</strong>
            <span>measured page weight</span>
          </div>
          <div>
            <strong>{report.pageStats.requestCount}</strong>
            <span>resources referenced</span>
          </div>
          <div>
            <strong>{formatBytes(report.pageStats.htmlBytes)}</strong>
            <span>HTML document</span>
          </div>
          <div>
            <strong>{formatBytes(report.pageStats.imageBytes)}</strong>
            <span>images</span>
          </div>
          <div>
            <strong>{formatBytes(report.pageStats.scriptBytes)}</strong>
            <span>JavaScript</span>
          </div>
          <div>
            <strong>{Math.round(report.pageStats.ttfbMs)} ms</strong>
            <span>server response (TTFB)</span>
          </div>
        </div>
      </div>

      {/* Findings by category -------------------------------------------- */}
      <div className="panel">
        <h2>🧾 All findings</h2>
        <div className="tabs">
          <button type="button" className={activeCategory === "all" ? "active" : ""} onClick={() => setActiveCategory("all")}>
            All ({report.findings.length})
          </button>
          {report.categories.map((category) => (
            <button
              key={category.category}
              type="button"
              className={activeCategory === category.category ? "active" : ""}
              onClick={() => setActiveCategory(category.category)}
            >
              {category.label} ({category.findings.length})
            </button>
          ))}
        </div>

        {activeCategory !== "all" ? (
          <CategorySummary report={report} category={activeCategory} />
        ) : null}

        <div className="findings">
          {visibleFindings.length ? (
            visibleFindings.map((finding, index) => (
              <FindingCard key={`${finding.ruleId}-${finding.url}-${index}`} finding={finding} rank={index + 1} />
            ))
          ) : (
            <p>
              {activeCategory === "security"
                ? "No issues detected in the security checks performed."
                : "No issues were detected by the checks that ran here."}
            </p>
          )}
        </div>
      </div>

      {/* Security wording ------------------------------------------------ */}
      {securityCategory && securityCategory.findings.length === 0 ? (
        <div className="panel note-panel">
          <b>Security:</b> No issues detected in the security checks performed. This is not a statement that the site is
          secure — HealthAuditor only inspects observable response headers, transport and resource URLs.
        </div>
      ) : null}

      {/* Broken links ----------------------------------------------------- */}
      <div className="panel">
        <h2>🔗 Links ({brokenLinks.length} broken)</h2>
        <div className="tabs">
          {LINK_FILTERS.map((filter) => (
            <button key={filter} type="button" className={linkFilter === filter ? "active" : ""} onClick={() => setLinkFilter(filter)}>
              {filter[0].toUpperCase() + filter.slice(1)} ({filterLinks(report.links, filter).length})
            </button>
          ))}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Status</th>
                <th>URL</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              {filterLinks(report.links, linkFilter)
                .slice(0, 60)
                .map((link) => (
                  <tr key={link.url}>
                    <td>
                      <span className={`status s${Math.floor((link.status ?? 0) / 100)}`}>
                        {link.status ?? (link.unverified ? "unverified" : "—")}
                      </span>
                    </td>
                    <td className="wrap">
                      <a href={link.url} target="_blank" rel="noopener noreferrer">
                        {link.url}
                      </a>
                    </td>
                    <td>{link.internal ? "internal" : "external"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <p className="fine">
          External hosts often block automated requests. Those links are shown as “unverified” rather than broken.
        </p>
      </div>

      {/* Image intelligence ----------------------------------------------- */}
      {report.images.length ? (
        <div className="panel">
          <h2>🖼️ Image intelligence</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Size</th>
                  <th>Format</th>
                  <th>Dimensions</th>
                  <th>Alt text</th>
                </tr>
              </thead>
              <tbody>
                {report.images.slice(0, 40).map((image) => (
                  <tr key={image.url}>
                    <td className="wrap">
                      <a href={image.url} target="_blank" rel="noopener noreferrer">
                        {image.url.split("/").pop()?.slice(0, 40) || image.url}
                      </a>
                    </td>
                    <td className={image.bytes && image.bytes > 500 * 1024 ? "warn" : ""}>{formatBytes(image.bytes)}</td>
                    <td>{image.format ?? "?"}</td>
                    <td>
                      {image.intrinsicWidth
                        ? `${image.intrinsicWidth}×${image.intrinsicHeight}`
                        : image.widthAttr
                          ? `${image.widthAttr}×${image.heightAttr ?? "?"} (declared)`
                          : "unknown"}
                    </td>
                    <td>{image.hasAltAttribute ? (image.alt?.trim() ? image.alt.slice(0, 40) : "(decorative)") : <span className="warn">missing</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="fine">
            {measuredImages.length} of {report.images.length} images were measured with a real request. Savings estimates
            are derived from those measured bytes only.
          </p>
        </div>
      ) : null}

      {/* Passed checks & technology --------------------------------------- */}
      <div className="panel two-col">
        <div>
          <h2>✅ Passed checks</h2>
          <ul className="positives">
            {report.categories.flatMap((category) => category.passed).map((check) => (
              <li key={check.ruleId}>
                <b>{check.ruleId}</b> {check.summary}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2>🧩 Detected technology</h2>
          {report.technologies.length ? (
            <ul className="tech-list">
              {report.technologies.map((tech) => (
                <li key={tech.name}>
                  <b>{tech.name}</b> <span>{tech.category}</span>
                  <small>{tech.evidence}</small>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No technologies were detected with enough confidence to report.</p>
          )}
          <h2>🚫 Not applicable</h2>
          <ul className="skipped">
            {report.categories.flatMap((category) => category.skipped).map((check) => (
              <li key={check.ruleId}>
                <b>{check.ruleId}</b> {check.reason}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function CategorySummary({ report, category }: { report: AuditReport; category: Category }) {
  const data = report.categories.find((entry) => entry.category === category);
  if (!data) return null;
  return (
    <div className="category-summary" style={{ borderColor: scoreColor(data.score) }}>
      <div>
        <strong style={{ color: scoreColor(data.score) }}>{data.score}/100</strong>
        <span>{data.label}</span>
      </div>
      <p>
        {data.description} <em>{data.scoreExplanation}</em>
      </p>
      <p className="counts">
        {data.findings.length} problems · {data.passed.length} passed · {data.skipped.length} not applicable
      </p>
    </div>
  );
}
