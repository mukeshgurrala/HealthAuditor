import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isVercelAuthenticationRedirect,
  isVercelProtectionPage,
} from "../src/lib/audit/deployment-protection";

test("detects Vercel SSO and login redirects from preview and custom domains", () => {
  for (const source of [
    "https://health-auditor-git-preview.vercel.app/",
    "https://preview.example.com/",
  ]) {
    assert.equal(
      isVercelAuthenticationRedirect(
        source,
        "https://vercel.com/sso-api?url=example",
      ),
      true,
    );
    assert.equal(
      isVercelAuthenticationRedirect(
        source,
        "https://vercel.com/login?next=sso-api",
      ),
      true,
    );
  }
});
test("does not reject ordinary redirects or sites mentioning Vercel", () => {
  for (const target of [
    "https://example.com/login",
    "https://vercel.com/docs",
    "https://vercel.com.evil.example/login",
    "https://vercel.com/login-help",
  ]) {
    assert.equal(
      isVercelAuthenticationRedirect("https://example.com", target),
      false,
    );
  }
  assert.equal(
    isVercelAuthenticationRedirect(
      "https://vercel.com",
      "https://vercel.com/login",
    ),
    false,
  );
  assert.equal(
    isVercelProtectionPage("<title>My Vercel website</title>", 200),
    false,
  );
  assert.equal(
    isVercelProtectionPage("<title>Authentication Required</title>", 401),
    false,
  );
});
test("recognizes protected-deployment HTML without scoring it", () => {
  assert.equal(
    isVercelProtectionPage(
      '<meta property="og:title" content="Protected Deployment – Vercel">',
      200,
    ),
    true,
  );
  assert.equal(
    isVercelProtectionPage(
      '<title>Authentication Required</title><a href="https://vercel.com">Vercel</a>',
      401,
    ),
    true,
  );
});
