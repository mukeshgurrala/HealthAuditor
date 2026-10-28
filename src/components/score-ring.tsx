const COLORS = {
  good: "#0d5726",
  "needs-improvement": "#754300",
  poor: "#8c1d18",
} as const;

export function scoreColor(score: number | null): string {
  if (score === null) return "#475569";
  if (score >= 90) return COLORS.good;
  if (score >= 50) return COLORS["needs-improvement"];
  return COLORS.poor;
}

export function ScoreRing({
  label,
  score,
  featured = false,
  caption,
}: {
  label: string;
  score: number | null;
  featured?: boolean;
  caption?: string;
}) {
  const value = Math.max(0, Math.min(100, score ?? 0));
  const color = scoreColor(score);
  return (
    <article className={`score-card${featured ? " featured" : ""}`}>
      <div
        className="ring"
        role="img"
        aria-label={`${label}: ${score === null ? "not measured" : `${value} out of 100`}`}
        style={{
          background: `conic-gradient(${color} ${value * 3.6}deg, #e2e8f0 0)`,
        }}
      >
        <div>
          <strong style={{ color }}>{score ?? "—"}</strong>
          <small>/100</small>
        </div>
      </div>
      <h3>{label}</h3>
      {caption ? <small className="score-caption">{caption}</small> : null}
    </article>
  );
}
