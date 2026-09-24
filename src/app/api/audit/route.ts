import { NextResponse } from "next/server";
import { AuditError, runAudit } from "@/lib/audit/engine";
import { normalizePublicUrl } from "@/lib/validation";

export const runtime = "nodejs";
// Vercel Hobby caps serverless functions at 60s; the engine budgets itself below this.
export const maxDuration = 60;

/**
 * POST /api/audit
 * Body:  { "url": "https://example.com", "options"?: { checkLinks?, usePageSpeed?, strategy? } }
 * Reply: the full AuditReport (see src/lib/audit/types.ts).
 */
export async function POST(request: Request) {
  let url: string;
  try {
    const body = (await request.json().catch(() => ({}))) as { url?: unknown; options?: Record<string, unknown> };
    url = normalizePublicUrl(body.url);
    const report = await runAudit(url, {
      checkLinks: body.options?.checkLinks !== false,
      usePageSpeed: body.options?.usePageSpeed !== false,
      strategy: body.options?.strategy === "desktop" ? "desktop" : "mobile",
    });
    return NextResponse.json({ success: true, report });
  } catch (error) {
    // Validation and audit errors are already written for humans; anything else is hidden.
    if (error instanceof AuditError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 422 });
    }
    if (error instanceof Error && isUserInputError(error.message)) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    console.error("[audit] unexpected failure", error);
    return NextResponse.json(
      { success: false, error: "The audit could not be completed. Please try again in a moment." },
      { status: 500 },
    );
  }
}

function isUserInputError(message: string): boolean {
  return /enter a|not allowed|valid website|public website/i.test(message);
}
