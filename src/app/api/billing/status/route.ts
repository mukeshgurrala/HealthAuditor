import { entitlement, billingFailure, razorpay } from "@/lib/billing/server";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const e = await entitlement(request);
    let plan: { item: { amount: number; currency: string }; period: string; interval: number } | null = null;
    if (process.env.RAZORPAY_PLAN_ID) plan = await razorpay(`plans/${encodeURIComponent(process.env.RAZORPAY_PLAN_ID)}`);
    const period = `${e.subscription?.id}:${e.subscription?.current_start}`;
    const { count, error } = await e.db.from("audit_credits").select("id", { count: "exact", head: true }).eq("user_id", e.user.id).eq("period", period);
    if (error) throw error;
    return Response.json({ freeRemaining: Math.max(0, 10 - e.data.free_used), active: e.active,
      paidRemaining: e.active ? Math.max(0, Number(process.env.AUDITS_PER_MONTH || 0) - (count || 0)) : 0,
      monthlyLimit: Number(process.env.AUDITS_PER_MONTH || 0), plan,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return billingFailure(error); }
}
