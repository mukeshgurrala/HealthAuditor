/**
 * Generates docs/RULES.md from the rule registry (spec §22).
 * Run with: npm run docs:rules
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { RULES, RULESET_VERSION } from "../src/lib/audit/registry";
import { CATEGORIES, CATEGORY_DESCRIPTIONS, CATEGORY_LABELS } from "../src/lib/audit/types";
import { SEVERITY_WEIGHT, ruleWeight } from "../src/lib/audit/scoring";

const lines: string[] = [];

lines.push("# HealthAuditor rule catalog");
lines.push("");
lines.push(`> Generated from the rule registry by \`npm run docs:rules\`. Do not edit by hand.`);
lines.push(`> Ruleset version **${RULESET_VERSION}** — ${RULES.length} rules.`);
lines.push("");
lines.push("| Rule | Name | Category | Severity | Effort | Weight |");
lines.push("| --- | --- | --- | --- | --- | --- |");
for (const rule of RULES) {
  lines.push(
    `| \`${rule.id}\` | ${rule.name} | ${CATEGORY_LABELS[rule.category]} | ${rule.severity} | ${rule.effort} | ${ruleWeight(rule)} |`,
  );
}
lines.push("");
lines.push("Severity weights used in category scoring: " + Object.entries(SEVERITY_WEIGHT).map(([s, w]) => `${s} = ${w}`).join(", ") + ".");
lines.push("");

for (const category of CATEGORIES) {
  const categoryRules = RULES.filter((rule) => rule.category === category);
  if (!categoryRules.length) continue;
  lines.push(`## ${CATEGORY_LABELS[category]}`);
  lines.push("");
  lines.push(`_${CATEGORY_DESCRIPTIONS[category]}_`);
  lines.push("");
  for (const rule of categoryRules) {
    lines.push(`### ${rule.id} — ${rule.name}`);
    lines.push("");
    lines.push(`- **Category:** ${CATEGORY_LABELS[rule.category]}`);
    lines.push(`- **Severity:** ${rule.severity}`);
    lines.push(`- **Effort:** ${rule.effort}`);
    lines.push(`- **Scoring weight:** ${ruleWeight(rule)}`);
    lines.push("");
    lines.push(`**Why it matters**  \n${rule.description}`);
    lines.push("");
    lines.push(`**Detection**  \n${rule.detection}`);
    lines.push("");
    lines.push(`**Fix**  \n${rule.recommendation}`);
    if (rule.references?.length) {
      lines.push("");
      lines.push(`**References**  \n${rule.references.map((reference) => `- ${reference}`).join("\n")}`);
    }
    lines.push("");
  }
}

const target = join(import.meta.dirname, "..", "docs", "RULES.md");
writeFileSync(target, `${lines.join("\n")}\n`, "utf8");
console.log(`Wrote ${target} (${RULES.length} rules).`);
