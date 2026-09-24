import { isIP } from "node:net";

const PRIVATE_V4 = /^(10\.|127\.|169\.254\.|192\.168\.|0\.|172\.(1[6-9]|2\d|3[01])\.)/;

/**
 * Normalise user input into a public http(s) URL, or throw a user-friendly error.
 * Bare hostnames (`example.com`) are upgraded to `https://example.com`.
 */
export function normalizePublicUrl(input: unknown): string {
  if (typeof input !== "string" || !input.trim()) {
    throw new Error("Please enter a website URL.");
  }
  let raw = input.trim();
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Enter a valid website URL, such as https://example.com.");
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only http and https URLs are allowed.");
  }
  if (url.username || url.password) {
    throw new Error("URLs containing credentials are not allowed.");
  }

  const host = url.hostname.toLowerCase();
  if (!host.includes(".") || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("Enter a public website URL.");
  }
  const kind = isIP(host);
  if ((kind === 4 && PRIVATE_V4.test(host)) || kind === 6) {
    throw new Error("Private network addresses are not allowed.");
  }
  url.hash = "";
  return url.href;
}

/** Throws when a URL discovered on the page must not be requested (SSRF guard). */
export function assertPublicUrl(input: string): string {
  return normalizePublicUrl(input);
}

export function isPublicUrl(input: string): boolean {
  try {
    assertPublicUrl(input);
    return true;
  } catch {
    return false;
  }
}
