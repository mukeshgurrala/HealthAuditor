# Scoring & prioritisation methodology

Every number HealthAuditor prints can be recomputed by hand from this page. The
implementation lives in [`src/lib/audit/scoring.ts`](../src/lib/audit/scoring.ts) and is
covered by `tests/rules.test.ts`.

## 1. Rule outcomes

Each rule returns exactly one of three outcomes for the audited page:

| Outcome | Meaning | Effect on score |
| --- | --- | --- |
| `pass` | The check applies and the page satisfies it. | Adds its weight to both earned and possible. |
| `fail` | The check applies and the page violates it (one or more findings). | Adds its weight to possible only. |
| `skip` | The check does not apply (no forms on the page, no PageSpeed key, …). | Excluded entirely. |

A skipped rule can therefore neither help nor hurt a score — this is deliberate, so that a
simple page is not rewarded for the checks it dodges.

## 2. Rule weights

Weight is derived from severity unless a rule overrides it:

| Severity | Weight |
| --- | --- |
| critical | 10 |
| high | 6 |
| medium | 3 |
| low | 1 |

When a rule fails, the weight used is that of its **worst** finding (a rule may raise the
severity for a particularly bad instance — e.g. a 3 MB image is `critical`, a 700 KB image
is `high`).

## 3. Category score

```text
categoryScore = round(100 × Σ weight(passing rules) ÷ Σ weight(applicable rules))
```

If no rule in a category applies, the category scores 100.

### Performance blending

When a PageSpeed Insights API key is configured, Lighthouse gives us a measured performance
score. That measurement is authoritative for *speed*, while our rules cover *resource
hygiene*, so the two are blended:

```text
performanceScore = round(0.6 × lighthouseScore + 0.4 × ruleScore)
```

Without a key, the Core Web Vitals rules are skipped and the score is the rule score alone.
The report always states which of the two was used.

## 4. Overall health score

```text
Performance     × 0.30
SEO             × 0.20
Accessibility   × 0.20
Security        × 0.20
Best Practices  × 0.10
```

```text
overall = round(Σ (categoryScore × weight) ÷ Σ weight)
```

The divisor only includes categories that produced a score, so the weights are renormalised
if a category is ever unavailable.

| Band | Label |
| --- | --- |
| 90–100 | good |
| 50–89 | needs improvement |
| 0–49 | poor |

This is a HealthAuditor score. It is not a Google ranking, and it is not comparable with
Lighthouse's own overall score.

## 5. Priority engine

```text
priority = impact(severity) × reach(occurrences) × effort × categoryBoost
```

| Factor | Values |
| --- | --- |
| impact | critical 10, high 7, medium 4, low 2 |
| reach | `1 + log10(occurrences) / 2`, capped at 2 (1 element → 1.0, 10 → 1.5, 100 → 2.0) |
| effort | easy × 1.3, medium × 1.0, hard × 0.75 |
| categoryBoost | `0.85 + categoryWeight` → 0.95–1.15 |

The "Fix first" list is the top 8 findings by priority. The logarithmic reach factor stops
a single rule that matched 200 elements from burying everything else.

## 6. Quick wins

A finding is a quick win when **all** of these hold:

- effort is `easy`
- severity is above `low`
- priority score ≥ 5

## 7. Deduplication (no double counting)

Every finding carries a `dedupeKey` describing the underlying problem (for example
`oversized-image:https://…/hero.png`). Findings sharing a key are reported and scored once,
so a single root cause that trips several rules cannot damage the score twice.

## 8. What the numbers are *not*

- Not a prediction of search rankings or conversion rate.
- Not a security certification — see the wording rules in the spec (§12).
- Not a substitute for real-user monitoring: lab metrics come from one Lighthouse run on
  one emulated device.
