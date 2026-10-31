import { account, billingFailure, BillingError, required, validSignature } from "@/lib/billing/server";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const { db, user } = await account(request);
    const text = await request.text();
    if (text.length > 4096) throw new BillingError(400, "Invalid payment response.");
    const body = JSON.parse(text);
    const { data, error } = await db.from("billing_accounts").select("subscription_id").eq("user_id", user.id).single();
    if (error) throw error;
    if (!data.subscription_id || body.razorpay_subscription_id !== data.subscription_id ||
      typeof body.razorpay_payment_id !== "string" || typeof body.razorpay_signature !== "string" ||
      !validSignature(body.razorpay_payment_id, data.subscription_id, body.razorpay_signature, required("RAZORPAY_KEY_SECRET")))
      throw new BillingError(400, "Payment verification failed. Please contact support if you were charged.");
    // A valid checkout signature is not an entitlement: every audit checks Razorpay's live status.
    return Response.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return billingFailure(error); }
}
