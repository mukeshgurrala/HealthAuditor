import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { validSignature, paidPeriod, type Subscription } from "../src/lib/billing/server";
import { POST as audit } from "../src/app/api/audit/route";
import { POST as subscribe } from "../src/app/api/billing/subscribe/route";
import { POST as verify } from "../src/app/api/billing/verify/route";
import { GET as status } from "../src/app/api/billing/status/route";

test("subscription signatures use payment ID | stored subscription ID and reject tampering", () => {
  const signature = createHmac("sha256", "test-secret").update("pay_test|sub_test").digest("hex");
  assert.equal(validSignature("pay_test", "sub_test", signature, "test-secret"), true);
  assert.equal(validSignature("pay_other", "sub_test", signature, "test-secret"), false);
  assert.equal(validSignature("pay_test", "sub_other", signature, "test-secret"), false);
  assert.equal(validSignature("pay_test", "sub_test", signature, "wrong-secret"), false);
  for (const malformed of ["", "xyz", "a".repeat(63), "g".repeat(64), "a".repeat(65)]) {
    assert.equal(validSignature("pay_test", "sub_test", malformed, "test-secret"), false);
  }
});
test("only active subscriptions in the expected plan and paid period grant access", () => {
  const now = 1_000_000;
  const sub: Subscription = { id: "sub_test", status: "active", plan_id: "plan_test", current_start: 900, current_end: 1100 };
  assert.equal(paidPeriod(sub, "plan_test", now), true);
  assert.equal(paidPeriod(sub, "other-plan", now), false);
  for (const state of ["created", "authenticated", "pending", "halted", "cancelled", "completed", "expired"]) {
    assert.equal(paidPeriod({ ...sub, status: state }, "plan_test", now), false);
  }
  assert.equal(paidPeriod({ ...sub, current_start: null }, "plan_test", now), false);
  assert.equal(paidPeriod({ ...sub, current_end: null }, "plan_test", now), false);
  assert.equal(paidPeriod(sub, "plan_test", 1_100_000), false);
  assert.equal(paidPeriod(sub, "plan_test", 899_999), false);
});
test("all billing endpoints require verified sign-in, with no anonymous checkout", async () => {
  for (const handler of [subscribe, verify, status]) {
    const response = await handler(new Request("https://healthauditor.test/api/billing"));
    assert.equal(response.status, 401);
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
});
test("valid anonymous audit requests cannot bypass the trial paywall", async () => {
  const response = await audit(new Request("https://healthauditor.test/api/audit", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: "https://example.com" }),
  }));
  assert.equal(response.status, 401);
  assert.equal((await response.json()).success, false);
});
