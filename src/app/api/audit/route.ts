import { NextResponse } from "next/server";
import { AuditError, runAudit } from "@/lib/audit/engine";
import { normalizePublicUrl } from "@/lib/validation";
import { BusyError, RequestCache } from "@/lib/audit/request-cache";
import type { AuditReport } from "@/lib/audit/types";

export const runtime = "nodejs";
export const maxDuration = 60;
const cache = new RequestCache<AuditReport>();
function failure(status: number, code: string, error: string) {
  return NextResponse.json(
    { success: false, code, error },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        ...(status === 429 ? { "Retry-After": "15" } : {}),
      },
    },
  );
}

export async function POST(request: Request) {
  let url: string;
  let options;
  try {
    // Read a bounded stream instead of trusting content-length.
    const reader = request.body?.getReader();
    if (!reader)
      return failure(400, "INVALID_REQUEST", "Please enter a website URL.");
    let text = "";
    let size = 0;
    const decoder = new TextDecoder();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 8192)
          return failure(
            413,
            "REQUEST_TOO_LARGE",
            "The audit request is too large.",
          );
        text += decoder.decode(value, { stream: true });
      }
      text += decoder.decode();
    } finally {
      await reader.cancel();
    }
    const body = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new Error("Enter a valid audit request.");
    url = normalizePublicUrl(body.url);
    if (
      body.options != null &&
      (typeof body.options !== "object" || Array.isArray(body.options))
    )
      throw new Error("Enter valid audit options.");
    options = {
      checkLinks: body.options?.checkLinks !== false,
      usePageSpeed: body.options?.usePageSpeed !== false,
      strategy:
        body.options?.strategy === "desktop"
          ? ("desktop" as const)
          : ("mobile" as const),
    };
  } catch (error) {
    return failure(
      400,
      "INVALID_REQUEST",
      error instanceof SyntaxError
        ? "Send a valid JSON audit request."
        : error instanceof Error
          ? error.message
          : "Enter a valid website URL.",
    );
  }
  try {
    const result = await cache.get(JSON.stringify([url, options]), () =>
      runAudit(url, options),
    );
    return NextResponse.json(
      { success: true, report: result.value, cached: result.cached },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof BusyError)
      return failure(
        429,
        "AUDIT_BUSY",
        "All audit slots are busy. Please try again in 15 seconds.",
      );
    if (error instanceof AuditError) {
      const timeout = /too long|timeout/i.test(error.message);
      return failure(
        timeout ? 504 : 422,
        timeout ? "TARGET_TIMEOUT" : error.code,
        error.message,
      );
    }
    return failure(
      500,
      "AUDIT_FAILED",
      "The audit could not be completed. Please try again in a moment.",
    );
  }
}
