const COLORS = { good: "#10b981", "needs-improvement": "#f59e0b", poor: "#f43f5e" } as const;

export function scoreColor(score: number | null): string {
  if (score === null) return "#98a2b3";
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
  const value = score ?? 0;
  const color = scoreColor(score);
  return (
    <article className={`score-card${featured ? " featured" : ""}`}>
      <div className="ring" style={{ background: `conic-gradient(${color} ${value * 3.6}deg, #ede9fe 0)` }}>
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
