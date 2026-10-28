/** Shared browser/server syntax validation; DNS checks live in safe-fetch. */
export function normalizeUrlInput(input: unknown): string {
  if (typeof input !== "string" || !input.trim())
    throw new Error("Please enter a website URL.");
  const raw = input.trim();
  if (raw.length > 2048 || /[\u0000-\u0020\u007f]/.test(raw))
    throw new Error(
      "Enter a valid website URL without spaces (maximum 2,048 characters).",
    );
  if (/^[a-z][a-z\d+.-]*:/i.test(raw) && !/^https?:\/\//i.test(raw))
    throw new Error("Only http and https URLs are allowed.");
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    throw new Error("Enter a valid website URL, such as https://example.com.");
  }
  if (url.username || url.password)
    throw new Error("URLs containing credentials are not allowed.");
  if (
    !url.hostname.includes(".") ||
    /(?:^|\.)(localhost|local|internal|test|invalid)$/.test(url.hostname)
  )
    throw new Error("Enter a public website URL.");
  if (url.port && !["80", "443"].includes(url.port))
    throw new Error("Non-standard website ports are not allowed.");
  url.hash = "";
  return url.href;
}
