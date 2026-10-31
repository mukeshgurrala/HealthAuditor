import { account, billingFailure, BillingError, razorpay, required, type Subscription } from "@/lib/billing/server";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const { db, user } = await account(request);
    const planId = required("RAZORPAY_PLAN_ID");
    const limit = Number(required("AUDITS_PER_MONTH"));
    if (!Number.isSafeInteger(limit) || limit <= 0) throw new BillingError(503, "The monthly audit allowance is not configured.");
    const plan = await razorpay<{ period: string; interval: number }>(`plans/${encodeURIComponent(planId)}`);
    if (plan.period !== "monthly" || plan.interval !== 1) throw new BillingError(503, "Please configure a monthly Razorpay plan.");
    const { data, error } = await db.from("billing_accounts").select("subscription_id").eq("user_id", user.id).single();
    if (error) throw error;
    let subscription: Subscription | null = data.subscription_id ? await razorpay(`subscriptions/${encodeURIComponent(data.subscription_id)}`) : null;
    if (subscription && subscription.plan_id !== planId) throw new BillingError(409, "Your existing subscription uses a different plan. Please contact support before paying again.");
    if (subscription && ["active", "authenticated", "pending", "halted"].includes(subscription.status))
      throw new BillingError(409, "You already have a subscription. Manage it using Razorpay's subscription emails or contact support.");
    if (!subscription || subscription.status !== "created") {
      subscription = await razorpay<Subscription>("subscriptions", { plan_id: planId, total_count: 120, quantity: 1, customer_notify: 1, notes: { user_id: user.id } });
      // A conditional update prevents two simultaneous checkouts from replacing each other.
      let update = db.from("billing_accounts").update({ subscription_id: subscription.id }).eq("user_id", user.id);
      update = data.subscription_id ? update.eq("subscription_id", data.subscription_id) : update.is("subscription_id", null);
      const saved = await update.select("subscription_id").single();
      if (saved.error) {
        await razorpay(`subscriptions/${subscription.id}/cancel`, { cancel_at_cycle_end: 0 });
        throw new BillingError(409, "Another checkout was started. Please refresh and try again.");
      }
    }
    return Response.json({ key: required("RAZORPAY_KEY_ID"), subscriptionId: subscription.id, email: user.email }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return billingFailure(error); }
}
