import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * POST /api/false-positive
 * Collects "this finding is wrong" feedback (spec §24).
 *
 * There is no database in this MVP: reports are logged server-side so maintainers can spot
 * inaccurate rules. Nothing about the audited page is stored beyond what the user submits.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    ruleId?: string;
    url?: string;
    finding?: string;
    explanation?: string;
  };

  if (!body.ruleId) {
    return NextResponse.json({ success: false, error: "A rule ID is required." }, { status: 400 });
  }

  console.info("[false-positive]", {
    ruleId: body.ruleId,
    url: String(body.url ?? "").slice(0, 300),
    finding: String(body.finding ?? "").slice(0, 300),
    explanation: String(body.explanation ?? "").slice(0, 500),
    at: new Date().toISOString(),
  });

  return NextResponse.json({ success: true });
}
