import type * as cheerio from "cheerio";
import type { TechnologyInfo } from "./types";

/**
 * Conservative technology detection (spec §33). Only signatures that are hard to confuse
 * are reported, and each detection carries the evidence that produced it. Detected
 * technologies are used to make recommendations more specific, not as decoration.
 */
export function detectTechnologies(
  $: cheerio.CheerioAPI,
  headers: Record<string, string>,
  html: string,
): TechnologyInfo[] {
  const found: TechnologyInfo[] = [];
  const add = (name: string, category: TechnologyInfo["category"], evidence: string) => {
    if (!found.some((t) => t.name === name)) found.push({ name, category, evidence });
  };

  const generator = $('meta[name="generator"]').attr("content") ?? "";

  if ($("#__next").length || html.includes("/_next/static")) add("Next.js", "framework", "/_next/static assets");
  if ($("#__nuxt").length || html.includes("/_nuxt/")) add("Nuxt", "framework", "/_nuxt/ assets");
  if (html.includes("data-reactroot") || html.includes("react-dom")) add("React", "library", "React runtime markers");
  if (html.includes("/wp-content/") || /wordpress/i.test(generator)) add("WordPress", "cms", "/wp-content/ paths");
  if (/drupal/i.test(generator) || html.includes("/sites/default/files")) add("Drupal", "cms", "Drupal paths");
  if (/joomla/i.test(generator)) add("Joomla", "cms", "generator meta tag");
  if (html.includes("cdn.shopify.com") || headers["x-shopid"]) add("Shopify", "ecommerce", "Shopify CDN / headers");
  if (html.includes("woocommerce")) add("WooCommerce", "ecommerce", "WooCommerce assets");
  if (/webflow/i.test(generator) || html.includes("assets.website-files.com")) add("Webflow", "cms", "Webflow assets");
  if (/wix/i.test(generator) || html.includes("static.parastorage.com")) add("Wix", "cms", "Wix static assets");
  if (html.includes("googletagmanager.com/gtag") || html.includes("google-analytics.com")) {
    add("Google Analytics", "analytics", "gtag / analytics script");
  }
  if (html.includes("googletagmanager.com/gtm.js")) add("Google Tag Manager", "analytics", "GTM script");
  if (html.includes("plausible.io/js")) add("Plausible", "analytics", "Plausible script");
  if (html.includes("static.hotjar.com")) add("Hotjar", "analytics", "Hotjar script");

  const server = headers["server"] ?? "";
  if (/cloudflare/i.test(server) || headers["cf-ray"]) add("Cloudflare", "cdn", "cf-ray / server header");
  if (headers["x-vercel-id"] || /vercel/i.test(server)) add("Vercel", "cdn", "x-vercel-id header");
  if (headers["x-nf-request-id"] || /netlify/i.test(server)) add("Netlify", "cdn", "Netlify headers");
  if (/nginx/i.test(server)) add("nginx", "server", `server: ${server}`);
  if (/apache/i.test(server)) add("Apache", "server", `server: ${server}`);
  if (headers["x-amz-cf-id"]) add("Amazon CloudFront", "cdn", "x-amz-cf-id header");

  return found;
}
