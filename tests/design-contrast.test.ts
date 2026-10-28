import { test } from "node:test";
import assert from "node:assert/strict";

function luminance(hex: string) {
  const channels = hex
    .replace("#", "")
    .match(/../g)!
    .map((part) => {
      const value = parseInt(part, 16) / 255;
      return value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

test("core light-theme and pastel text pairs meet AAA 7:1 contrast", () => {
  const pairs = [
    ["#242424", "#faf6ee"],
    ["#242424", "#ffb38a"],
    ["#242424", "#e3d5ca"],
    ["#242424", "#b5e2fa"],
    ["#47443e", "#faf6ee"],
    ["#36332f", "#ffb38a"],
    ["#17212f", "#f8fafc"], // Headings on canvas
    ["#475569", "#f8fafc"], // Body on canvas
    ["#475569", "#ffffff"], // Card descriptions
    ["#ffffff", "#174ea6"], // Primary action
    ["#174ea6", "#edf4ff"], // Links and icon badges
    ["#0d5726", "#ffffff"], // Good scores
    ["#754300", "#ffffff"], // Needs improvement
    ["#8c1d18", "#ffffff"], // Poor scores
    ["#155c2d", "#edf7ee"], // Recommendations
    ["#8c1d18", "#fff1f0"], // Errors
  ];
  for (const [foreground, background] of pairs) {
    const a = luminance(foreground),
      b = luminance(background);
    const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    assert.ok(
      ratio >= 7,
      `${foreground} on ${background}: ${ratio.toFixed(2)}:1`,
    );
  }
});
