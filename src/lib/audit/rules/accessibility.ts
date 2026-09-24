import type { AuditRule, FindingDraft } from "../types";
import { evidence, fail, pass, plural, shortUrl, skip } from "./helpers";

const VALID_ROLES = new Set([
  "alert", "alertdialog", "application", "article", "banner", "button", "cell", "checkbox", "columnheader",
  "combobox", "complementary", "contentinfo", "definition", "dialog", "directory", "document", "feed", "figure",
  "form", "grid", "gridcell", "group", "heading", "img", "link", "list", "listbox", "listitem", "log", "main",
  "marquee", "math", "menu", "menubar", "menuitem", "menuitemcheckbox", "menuitemradio", "navigation", "none",
  "note", "option", "presentation", "progressbar", "radio", "radiogroup", "region", "row", "rowgroup",
  "rowheader", "scrollbar", "search", "searchbox", "separator", "slider", "spinbutton", "status", "switch",
  "tab", "table", "tablist", "tabpanel", "term", "textbox", "timer", "toolbar", "tooltip", "tree", "treegrid",
  "treeitem",
]);

function parseColor(value: string): [number, number, number] | null {
  const hex = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const raw = hex[1].length === 3 ? hex[1].split("").map((c) => c + c).join("") : hex[1];
    return [parseInt(raw.slice(0, 2), 16), parseInt(raw.slice(2, 4), 16), parseInt(raw.slice(4, 6), 16)];
  }
  const rgb = value.trim().match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  return null;
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const channel = (value: number) => {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(foreground: string, background: string): number | null {
  const fg = parseColor(foreground);
  const bg = parseColor(background);
  if (!fg || !bg) return null;
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const [light, dark] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (light + 0.05) / (dark + 0.05);
}

export const accessibilityRules: AuditRule[] = [
  {
    id: "A11Y-001",
    name: "Images have alt text",
    category: "accessibility",
    severity: "high",
    effort: "easy",
    description:
      "Screen readers announce the alt attribute instead of the image. Without it, users hear a file name or nothing at all.",
    detection: "Checks every <img> for an alt attribute. Decorative images are expected to use alt=\"\" explicitly.",
    recommendation: "Describe what the image conveys in its alt attribute, or use alt=\"\" if it is purely decorative.",
    impact: "Blocks screen-reader users from understanding image content, and removes an SEO signal.",
    references: ["https://www.w3.org/WAI/tutorials/images/"],
    check(ctx) {
      if (!ctx.images.length) return skip("This page contains no <img> elements.");
      const missing = ctx.images.filter((image) => !image.hasAltAttribute);
      if (!missing.length) return pass(`All ${ctx.images.length} images declare an alt attribute.`);
      return fail({
        problem: `${plural(missing.length, "image")} on this page ${missing.length === 1 ? "has" : "have"} no alt attribute.`,
        observed: `${missing.length} of ${ctx.images.length} images missing alt`,
        expected: "Every <img> has an alt attribute",
        occurrences: missing.length,
        element: missing[0].element,
        url: missing[0].url,
        evidence: evidence(...missing.slice(0, 6).map((image, i) => [`Image ${i + 1}`, `${image.element} → ${shortUrl(image.url)}`] as [string, string])),
        technicalDetails: missing.slice(0, 10).map((image) => ({ label: image.element, value: image.url })),
        technicalFix: `<img src="…" alt="Describe the image content">  <!-- decorative: alt="" -->`,
        dedupeKey: "img-alt",
      });
    },
  },
  {
    id: "A11Y-002",
    name: "Page language declared",
    category: "accessibility",
    severity: "high",
    effort: "easy",
    description:
      "The lang attribute tells screen readers which pronunciation rules to use and helps browsers offer translation.",
    detection: "Checks <html lang> exists and looks like a valid BCP-47 language code.",
    recommendation: 'Set the document language, e.g. <html lang="en">.',
    check(ctx) {
      const lang = ctx.$("html").attr("lang")?.trim() ?? "";
      if (!lang) {
        return fail({
          problem: "The page does not declare a language.",
          observed: "<html> has no lang attribute",
          expected: '<html lang="en"> (or the correct language code)',
          evidence: evidence(["Element", "<html>"]),
          technicalFix: '<html lang="en">',
          dedupeKey: "html-lang",
        });
      }
      if (!/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/i.test(lang)) {
        return fail({
          problem: `The declared page language "${lang}" is not a valid language code.`,
          observed: `lang="${lang}"`,
          expected: 'A BCP-47 code such as "en" or "en-GB"',
          severity: "medium",
          evidence: evidence(["lang", lang]),
          dedupeKey: "html-lang",
        });
      }
      return pass(`Page language declared as "${lang}".`);
    },
  },
  {
    id: "A11Y-003",
    name: "Form inputs have labels",
    category: "accessibility",
    severity: "critical",
    effort: "medium",
    description:
      "An input without a label is announced as just \"edit text\". Users of screen readers cannot tell what to type.",
    detection:
      "For each input/select/textarea (excluding hidden, submit and button types) looks for a wrapping <label>, a label[for], aria-label, aria-labelledby or title.",
    recommendation: "Associate a visible <label for=\"…\"> with every field, or provide aria-label when a visible label is impossible.",
    check(ctx) {
      const fields = ctx
        .$("input, select, textarea")
        .toArray()
        .filter((el) => !["hidden", "submit", "button", "reset", "image"].includes((ctx.$(el).attr("type") ?? "").toLowerCase()));
      if (!fields.length) return skip("This page contains no form fields.");

      const unlabeled = fields.filter((el) => {
        const node = ctx.$(el);
        const id = node.attr("id");
        const labelled =
          (id && ctx.$(`label[for="${id.replace(/"/g, '\\"')}"]`).length > 0) ||
          node.parents("label").length > 0 ||
          Boolean(node.attr("aria-label")?.trim()) ||
          Boolean(node.attr("aria-labelledby")?.trim()) ||
          Boolean(node.attr("title")?.trim());
        return !labelled;
      });

      if (!unlabeled.length) return pass(`All ${fields.length} form fields have an accessible label.`);
      const describe = (el: (typeof unlabeled)[number]) => {
        const node = ctx.$(el);
        const tag = (el as { tagName?: string; name?: string }).tagName ?? (el as { name?: string }).name ?? "input";
        const attrs = [node.attr("type") && `type="${node.attr("type")}"`, node.attr("name") && `name="${node.attr("name")}"`, node.attr("id") && `id="${node.attr("id")}"`]
          .filter(Boolean)
          .join(" ");
        return `<${tag}${attrs ? ` ${attrs}` : ""}>`;
      };
      return fail({
        problem: `${plural(unlabeled.length, "form field")} ${unlabeled.length === 1 ? "has" : "have"} no accessible label.`,
        observed: `${unlabeled.length} of ${fields.length} fields unlabeled`,
        expected: "Every field has a label, aria-label or aria-labelledby",
        occurrences: unlabeled.length,
        element: describe(unlabeled[0]),
        evidence: evidence(...unlabeled.slice(0, 6).map((el, i) => [`Field ${i + 1}`, describe(el)] as [string, string])),
        technicalFix: `<label for="email">Email address</label>\n<input id="email" type="email" name="email">`,
        dedupeKey: "form-labels",
      });
    },
  },
  {
    id: "A11Y-004",
    name: "Links have discernible text",
    category: "accessibility",
    severity: "high",
    effort: "easy",
    description:
      "A link with no text (often an icon-only link) is announced as \"link\" with no destination, and gives search engines no anchor context.",
    detection: "Checks each <a href> for text content, an image with alt text, aria-label, aria-labelledby or title.",
    recommendation: "Add visible link text, or aria-label describing where the link goes.",
    check(ctx) {
      const anchors = ctx.$("a[href]").toArray();
      if (!anchors.length) return skip("This page contains no links.");
      const empty = anchors.filter((el) => {
        const node = ctx.$(el);
        const text = node.text().replace(/\s+/g, " ").trim();
        const imgAlt = node.find("img[alt]").toArray().some((img) => (ctx.$(img).attr("alt") ?? "").trim().length > 0);
        return !text && !imgAlt && !node.attr("aria-label")?.trim() && !node.attr("aria-labelledby")?.trim() && !node.attr("title")?.trim();
      });
      if (!empty.length) return pass(`All ${anchors.length} links have discernible text.`);
      return fail({
        problem: `${plural(empty.length, "link")} ${empty.length === 1 ? "has" : "have"} no readable text.`,
        observed: `${empty.length} empty links`,
        expected: "Every link has text or an aria-label",
        occurrences: empty.length,
        evidence: evidence(
          ...empty.slice(0, 6).map((el, i) => [`Link ${i + 1}`, `href="${shortUrl(ctx.$(el).attr("href") ?? "")}"`] as [string, string]),
        ),
        technicalFix: `<a href="/cart" aria-label="View your shopping cart"><svg …></svg></a>`,
        dedupeKey: "empty-links",
      });
    },
  },
  {
    id: "A11Y-005",
    name: "Buttons have accessible names",
    category: "accessibility",
    severity: "high",
    effort: "easy",
    description: "A button with no name is announced only as \"button\", so nobody using a screen reader knows what it does.",
    detection: "Checks <button> and role=\"button\" elements for text, aria-label, aria-labelledby, title or a labelled image.",
    recommendation: "Give every button visible text or an aria-label.",
    check(ctx) {
      const buttons = ctx.$('button, [role="button"], input[type="submit"], input[type="button"]').toArray();
      if (!buttons.length) return skip("This page contains no buttons.");
      const unnamed = buttons.filter((el) => {
        const node = ctx.$(el);
        const value = node.attr("value")?.trim();
        const text = node.text().replace(/\s+/g, " ").trim();
        const imgAlt = node.find("img[alt]").toArray().some((img) => (ctx.$(img).attr("alt") ?? "").trim().length > 0);
        return !text && !value && !imgAlt && !node.attr("aria-label")?.trim() && !node.attr("aria-labelledby")?.trim() && !node.attr("title")?.trim();
      });
      if (!unnamed.length) return pass(`All ${buttons.length} buttons have an accessible name.`);
      return fail({
        problem: `${plural(unnamed.length, "button")} ${unnamed.length === 1 ? "has" : "have"} no accessible name.`,
        observed: `${unnamed.length} of ${buttons.length} buttons unnamed`,
        expected: "Text content or aria-label on every button",
        occurrences: unnamed.length,
        evidence: evidence(
          ...unnamed.slice(0, 6).map((el, i) => {
            const cls = ctx.$(el).attr("class");
            return [`Button ${i + 1}`, `<button${cls ? ` class="${cls}"` : ""}>`] as [string, string];
          }),
        ),
        technicalFix: `<button aria-label="Close dialog">×</button>`,
        dedupeKey: "button-names",
      });
    },
  },
  {
    id: "A11Y-006",
    name: "Heading hierarchy",
    category: "accessibility",
    severity: "medium",
    effort: "easy",
    description:
      "Screen-reader users navigate by heading level. Skipping levels (h2 → h4) makes the document outline confusing.",
    detection: "Reads headings in document order and reports any jump of more than one level.",
    recommendation: "Use heading levels in order; style them with CSS rather than picking a level for its size.",
    check(ctx) {
      const headings = ctx
        .$("h1, h2, h3, h4, h5, h6")
        .toArray()
        .map((el) => ({
          level: Number(((el as { tagName?: string }).tagName ?? "h1").replace(/\D/g, "")),
          text: ctx.$(el).text().replace(/\s+/g, " ").trim().slice(0, 60),
        }));
      if (headings.length < 2) return skip("This page has fewer than two headings to compare.");
      const skips: string[] = [];
      headings.forEach((heading, index) => {
        if (index === 0) return;
        const previous = headings[index - 1].level;
        if (heading.level - previous > 1) skips.push(`h${previous} → h${heading.level} at "${heading.text}"`);
      });
      if (!skips.length) return pass(`Heading levels are used in order (${headings.length} headings).`);
      return fail({
        problem: `The heading structure skips levels ${plural(skips.length, "time")}.`,
        observed: skips.slice(0, 4).join("; "),
        expected: "Heading levels increase by at most one",
        occurrences: skips.length,
        evidence: evidence(...skips.slice(0, 5).map((s, i) => [`Skip ${i + 1}`, s] as [string, string])),
        dedupeKey: "heading-order",
      });
    },
  },
  {
    id: "A11Y-007",
    name: "Zoom is not disabled",
    category: "accessibility",
    severity: "medium",
    effort: "easy",
    description: "Blocking zoom with user-scalable=no or a small maximum-scale prevents low-vision users from reading the page.",
    detection: 'Parses the viewport meta tag for user-scalable=no and maximum-scale below 2.',
    recommendation: "Remove user-scalable=no and any maximum-scale below 2 from the viewport tag.",
    check(ctx) {
      const content = ctx.$('meta[name="viewport"]').attr("content") ?? "";
      if (!content) return skip("No viewport meta tag to evaluate (reported by SEO-004).");
      const scalable = /user-scalable\s*=\s*(no|0)/i.test(content);
      const maxScale = content.match(/maximum-scale\s*=\s*([\d.]+)/i);
      const tooSmall = maxScale ? Number(maxScale[1]) < 2 : false;
      if (scalable || tooSmall) {
        return fail({
          problem: "This page prevents users from zooming in.",
          observed: content,
          expected: "No user-scalable=no and maximum-scale of at least 2",
          evidence: evidence(["Viewport", content], ["user-scalable=no", String(scalable)], ["maximum-scale", maxScale?.[1] ?? "not set"]),
          technicalFix: `<meta name="viewport" content="width=device-width, initial-scale=1">`,
          dedupeKey: "zoom-disabled",
        });
      }
      return pass("Users can zoom the page.");
    },
  },
  {
    id: "A11Y-008",
    name: "ARIA usage",
    category: "accessibility",
    severity: "medium",
    effort: "medium",
    description:
      "Invalid ARIA roles are ignored, and aria-hidden on a focusable element creates a control that keyboard users can reach but screen readers cannot describe.",
    detection: "Validates every role attribute against the ARIA role list and looks for focusable elements inside aria-hidden=\"true\".",
    recommendation: "Use a valid role (or native HTML instead), and never put aria-hidden on interactive elements.",
    references: ["https://www.w3.org/TR/wai-aria-1.2/#role_definitions"],
    check(ctx) {
      const problems: string[] = [];
      ctx.$("[role]").each((_, el) => {
        const roles = (ctx.$(el).attr("role") ?? "").trim().toLowerCase().split(/\s+/);
        roles.filter(Boolean).forEach((role) => {
          if (!VALID_ROLES.has(role)) problems.push(`Unknown role="${role}"`);
        });
      });
      ctx.$('[aria-hidden="true"]').each((_, el) => {
        const focusable = ctx.$(el).find("a[href], button, input, select, textarea, [tabindex]").toArray();
        if (focusable.length) problems.push(`aria-hidden="true" wraps ${plural(focusable.length, "focusable element")}`);
      });
      if (!ctx.$("[role], [aria-hidden]").length) return skip("This page does not use ARIA attributes.");
      if (!problems.length) return pass("No invalid ARIA roles or hidden focusable elements were found.");
      return fail({
        problem: "ARIA attributes are used incorrectly on this page.",
        observed: problems.slice(0, 4).join("; "),
        expected: "Valid ARIA roles and no focusable content inside aria-hidden",
        occurrences: problems.length,
        evidence: evidence(...problems.slice(0, 6).map((p, i) => [`Problem ${i + 1}`, p] as [string, string])),
        dedupeKey: "aria-misuse",
      });
    },
  },
  {
    id: "A11Y-009",
    name: "Frames have titles",
    category: "accessibility",
    severity: "medium",
    effort: "easy",
    description: "Screen readers announce iframes by their title. Untitled frames are announced as just \"frame\".",
    detection: "Checks every <iframe> for a non-empty title attribute.",
    recommendation: 'Add a descriptive title, e.g. <iframe title="Location map">.',
    check(ctx) {
      const frames = ctx.$("iframe").toArray();
      if (!frames.length) return skip("This page contains no iframes.");
      const untitled = frames.filter((el) => !(ctx.$(el).attr("title") ?? "").trim() && !(ctx.$(el).attr("aria-label") ?? "").trim());
      if (!untitled.length) return pass(`All ${frames.length} iframes have titles.`);
      return fail({
        problem: `${plural(untitled.length, "iframe")} ${untitled.length === 1 ? "has" : "have"} no title.`,
        observed: `${untitled.length} of ${frames.length} iframes untitled`,
        expected: "A descriptive title attribute on each iframe",
        occurrences: untitled.length,
        evidence: evidence(...untitled.slice(0, 5).map((el, i) => [`Frame ${i + 1}`, shortUrl(ctx.$(el).attr("src") ?? "inline")] as [string, string])),
        technicalFix: `<iframe src="…" title="What this frame shows"></iframe>`,
        dedupeKey: "iframe-title",
      });
    },
  },
  {
    id: "A11Y-010",
    name: "Keyboard focus order",
    category: "accessibility",
    severity: "medium",
    effort: "medium",
    description:
      "A positive tabindex forces an element ahead of everything else in the tab order, which almost always produces a confusing keyboard experience.",
    detection: "Finds elements with tabindex greater than 0.",
    recommendation: "Use tabindex=\"0\" (or no tabindex) and rely on DOM order for focus sequence.",
    check(ctx) {
      const positive = ctx
        .$("[tabindex]")
        .toArray()
        .filter((el) => Number(ctx.$(el).attr("tabindex")) > 0);
      if (!ctx.$("[tabindex]").length) return skip("This page does not set tabindex anywhere.");
      if (!positive.length) return pass("No positive tabindex values disturb the keyboard order.");
      return fail({
        problem: `${plural(positive.length, "element")} use a positive tabindex and jump ahead in the keyboard order.`,
        observed: positive.map((el) => `tabindex="${ctx.$(el).attr("tabindex")}"`).slice(0, 5).join(", "),
        expected: 'tabindex="0" or no tabindex at all',
        occurrences: positive.length,
        evidence: evidence(
          ...positive.slice(0, 5).map((el, i) => {
            const cls = ctx.$(el).attr("class");
            return [`Element ${i + 1}`, `tabindex="${ctx.$(el).attr("tabindex")}"${cls ? ` class="${cls}"` : ""}`] as [string, string];
          }),
        ),
        dedupeKey: "tabindex",
      });
    },
  },
  {
    id: "A11Y-011",
    name: "Inline text contrast",
    category: "accessibility",
    severity: "high",
    effort: "medium",
    description:
      "Text needs a contrast ratio of at least 4.5:1 against its background (3:1 for large text) to stay readable for low-vision users and in bright sunlight.",
    detection:
      "Computes the WCAG contrast ratio for elements that declare both color and background-color in an inline style. Contrast set through CSS files cannot be measured without rendering the page.",
    recommendation: "Darken the text or lighten the background until the ratio is at least 4.5:1.",
    references: ["https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html"],
    check(ctx) {
      const findings: FindingDraft[] = [];
      let checked = 0;
      ctx.$("[style]").each((_, el) => {
        const style = ctx.$(el).attr("style") ?? "";
        const color = style.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i)?.[1];
        const background = style.match(/background(?:-color)?\s*:\s*([^;]+)/i)?.[1];
        if (!color || !background) return;
        const ratio = contrastRatio(color.trim(), background.trim().split(" ")[0]);
        if (ratio === null) return;
        checked += 1;
        if (ratio < 4.5 && findings.length < 5) {
          const text = ctx.$(el).text().replace(/\s+/g, " ").trim().slice(0, 50);
          findings.push({
            problem: `Text "${text || "(no text)"}" has a contrast ratio of ${ratio.toFixed(2)}:1.`,
            observed: `${color.trim()} on ${background.trim()} = ${ratio.toFixed(2)}:1`,
            expected: "At least 4.5:1 for body text",
            evidence: evidence(["Foreground", color.trim()], ["Background", background.trim()], ["Ratio", `${ratio.toFixed(2)}:1`]),
            dedupeKey: `contrast-${color.trim()}-${background.trim()}`,
          });
        }
      });
      if (!checked) {
        return skip("No inline colour pairs to measure. Contrast defined in CSS files needs a rendering engine to verify.");
      }
      if (!findings.length) return pass(`${plural(checked, "inline colour pair")} meet the 4.5:1 contrast minimum.`);
      return fail(...findings);
    },
  },
];
