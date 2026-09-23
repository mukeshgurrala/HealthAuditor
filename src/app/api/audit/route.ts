import { NextResponse } from "next/server";
import { analyzeWithGemini } from "@/lib/gemini";
import { runPageSpeed } from "@/lib/pagespeed";
import { normalizePublicUrl } from "@/lib/validation";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const url = normalizePublicUrl((body as { url?: unknown }).url);
    const audit = await runPageSpeed(url);
    const analysis = await analyzeWithGemini(audit);
    return NextResponse.json({ success:true, url, scores:audit.scores, metrics:audit.metrics, analysis });
  } catch (error) {
    const message = error instanceof Error ? error.message : "An unexpected server error occurred.";
    const safe = message.includes("API is not configured") ? message : message;
    return NextResponse.json({ success:false, error:safe }, { status: message.includes("valid") || message.includes("enter") || message.includes("allowed") ? 400 : 502 });
  }
}
