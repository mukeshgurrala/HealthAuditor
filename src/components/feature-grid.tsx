import {
  CATEGORIES,
  CATEGORY_DESCRIPTIONS,
  CATEGORY_LABELS,
} from "@/lib/audit/types";
import { CategoryIcon } from "./category-icon";

export function FeatureGrid() {
  return (
    <section className="feature-section" aria-labelledby="feature-heading">
      <span className="section-kicker">FIVE WAYS TO MAKE IT BETTER</span>
      <h2 id="feature-heading">Technical rigor meets a clearer picture.</h2>
      <p className="section-description">
        Five essential areas. Clear scores and practical recommendations.
      </p>
      <div className="categories">
        {CATEGORIES.map((category) => (
          <article className="panel category-card" key={category}>
            <span className="feature-icon">
              <CategoryIcon category={category} />
            </span>
            <h3>{CATEGORY_LABELS[category]}</h3>
            <p>{CATEGORY_DESCRIPTIONS[category]}</p>
            <div className="score-placeholder">
              <span className="placeholder-ring" aria-hidden="true">
                —
              </span>
              <span>
                Not measured<small>Score out of 100 after analysis</small>
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
