/** Detect hosting authentication walls without trying to bypass access controls. */
export function isVercelAuthenticationRedirect(
  requestedUrl: string,
  destination: string,
): boolean {
  const requested = new URL(requestedUrl);
  const target = new URL(destination);
  const isVercel = (host: string) =>
    host === "vercel.com" || host === "www.vercel.com";
  return (
    !isVercel(requested.hostname) &&
    isVercel(target.hostname) &&
    /^\/(?:sso-api|login)(?:\/|$)/.test(target.pathname)
  );
}

export function isVercelProtectionPage(html: string, status: number): boolean {
  return (
    /<meta\b[^>]*\bcontent=["']Protected Deployment\s*[–—-]\s*Vercel["']/i.test(
      html,
    ) ||
    (status === 401 &&
      /<title>\s*Authentication Required\s*<\/title>/i.test(html) &&
      /vercel/i.test(html))
  );
}

export const DEPLOYMENT_PROTECTED_MESSAGE =
  "This URL is protected by Vercel authentication. The auditor cannot access your website and will not score the Vercel login page. Use a publicly accessible production URL, or review Deployment Protection in your Vercel project settings if this preview is intended to be public.";
