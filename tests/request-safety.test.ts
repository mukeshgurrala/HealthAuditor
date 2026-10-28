import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeUrlInput } from "../src/lib/url-input";
import { isPublicAddress, normalizePublicUrl } from "../src/lib/validation";
import { BusyError, RequestCache } from "../src/lib/audit/request-cache";
import { readBoundedBody, safeFetch } from "../src/lib/audit/safe-fetch";
import { POST } from "../src/app/api/audit/route";

test("normalizes bare hosts and strips fragments", () => {
  assert.equal(
    normalizeUrlInput(" example.com/path#section "),
    "https://example.com/path",
  );
});
test("rejects unsafe URL syntax and alternate IP encodings", () => {
  for (const value of [
    null,
    "",
    "ftp://example.com",
    "javascript:alert(1)",
    "https://u:p@example.com",
    "https://example.com:8080",
    "http://127.1",
    "http://0x7f000001",
    "http://169.254.169.254",
    "http://[::1]",
    "https://foo.local",
    "https://exa mple.com",
    "https://example.com/" + "x".repeat(2048),
  ]) {
    assert.throws(() => normalizePublicUrl(value), String(value));
  }
});
test("rejects non-public DNS addresses including IPv4-mapped IPv6", () => {
  for (const address of [
    "10.0.0.1",
    "127.0.0.1",
    "100.64.0.1",
    "192.0.2.1",
    "224.0.0.1",
    "::1",
    "fe80::1",
    "fc00::1",
    "::ffff:127.0.0.1",
  ])
    assert.equal(isPublicAddress(address), false, address);
  assert.equal(isPublicAddress("8.8.8.8"), true);
});
test("safe transport rejects a private literal before connecting", async () => {
  await assert.rejects(safeFetch("http://127.0.0.1/"));
});
test("body reader enforces actual streamed byte count", async () => {
  await assert.rejects(readBoundedBody(new Response("12345"), 4), /size limit/);
  assert.equal((await readBoundedBody(new Response("123"), 4)).byteLength, 3);
});
test("cache coalesces, bounds concurrency, and reuses successes", async () => {
  const cache = new RequestCache<number>(1000, 2, 1);
  let resolve!: (n: number) => void;
  let calls = 0;
  const load = () => {
    calls++;
    return new Promise<number>((done) => {
      resolve = done;
    });
  };
  const first = cache.get("a", load);
  const second = cache.get("a", load);
  await assert.rejects(
    cache.get("b", async () => 2),
    BusyError,
  );
  resolve(7);
  assert.equal((await first).value, 7);
  assert.equal((await second).cached, true);
  assert.equal((await cache.get("a", load)).cached, true);
  assert.equal(calls, 1);
});
test("cache never retains failures and expires entries", async () => {
  const cache = new RequestCache<number>(0);
  await assert.rejects(
    cache.get("a", async () => {
      throw new Error("failed");
    }),
  );
  assert.equal((await cache.get("a", async () => 3)).value, 3);
  assert.equal((await cache.get("a", async () => 4)).value, 4);
});
test("API returns structured errors for malformed, unsafe, and oversized requests", async () => {
  for (const [body, status] of [
    ["{", 400],
    ["null", 400],
    [JSON.stringify({ url: "http://127.0.0.1" }), 400],
    ["x".repeat(9000), 413],
  ] as const) {
    const response = await POST(
      new Request("http://localhost/api/audit", { method: "POST", body }),
    );
    assert.equal(response.status, status);
    const data = await response.json();
    assert.equal(data.success, false);
    assert.equal(typeof data.code, "string");
    assert.equal(typeof data.error, "string");
  }
});
