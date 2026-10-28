export function ReportIllustration() {
  return (
    <div
      className="hero-art"
      aria-label="Illustrative audit report preview, not measured results"
      role="img"
    >
      <span className="art-sticker sticker-top">
        Less guesswork. More good web.
      </span>
      <div className="illustration-window">
        <div className="window-bar">
          <span>● ● ●</span>
          <span>your-website.report</span>
          <span>↗</span>
        </div>
        <div className="illustration-body">
          <span className="illustration-label">WEBSITE HEALTH CHECK</span>
          <div className="illustration-score">
            <span>✓</span>
            <div>
              A healthier
              <br />
              web starts here.
            </div>
          </div>
          <div className="illustration-bars">
            {["Performance", "SEO & discovery", "Accessibility"].map(
              (label, i) => (
                <div key={label}>
                  <span>{label}</span>
                  <i>
                    <b style={{ width: `${85 - i * 12}%` }} />
                  </i>
                </div>
              ),
            )}
          </div>
          <div className="illustration-note">
            Find it. Understand it. Fix it. <span>↗</span>
          </div>
          <small>Illustrative preview · your results will vary</small>
        </div>
      </div>
      <span className="art-sticker sticker-bottom">
        Built for your next better version ✦
      </span>
    </div>
  );
}
