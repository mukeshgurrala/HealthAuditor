import { createClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "node:crypto";

export class BillingError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
function required(name: string) {
  const value = process.env[name];
  if (!value) throw new BillingError(503, "Payments and accounts are not configured yet. Please contact the site owner.");
  return value;
}
export function database() {
  return createClient(required("NEXT_PUBLIC_SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export async function account(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new BillingError(401, "Sign in to use your 10 free audits.");
  const db = database();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new BillingError(401, "Please sign in again.");
  const { error: insertError } = await db.from("billing_accounts").upsert({ user_id: data.user.id }, { onConflict: "user_id", ignoreDuplicates: true });
  if (insertError) throw new BillingError(503, "Account storage is unavailable.");
  return { db, user: data.user };
}
export interface Subscription { id: string; status: string; plan_id: string; current_start: number | null; current_end: number | null }
export async function razorpay<T>(path: string, body?: object): Promise<T> {
  const response = await fetch(`https://api.razorpay.com/v1/${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Basic ${Buffer.from(`${required("RAZORPAY_KEY_ID")}:${required("RAZORPAY_KEY_SECRET")}`).toString("base64")}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined, cache: "no-store", signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new BillingError(502, "Razorpay is unavailable or the payment configuration is invalid. Please try again later.");
  return response.json();
}
export function validSignature(payment: string, subscription: string, signature: string, secret: string) {
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(`${payment}|${subscription}`).digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}
export function paidPeriod(subscription: Subscription, planId: string, now = Date.now()) {
  return subscription.status === "active" && subscription.plan_id === planId &&
    !!subscription.current_start && !!subscription.current_end &&
    subscription.current_start * 1000 <= now && subscription.current_end * 1000 > now;
}
export async function entitlement(request: Request) {
  const { db, user } = await account(request);
  const { data, error } = await db.from("billing_accounts").select("free_used,subscription_id").eq("user_id", user.id).single();
  if (error || !data) throw new BillingError(503, "Could not load your audit allowance.");
  let subscription: Subscription | null = null;
  if (data.subscription_id) subscription = await razorpay<Subscription>(`subscriptions/${encodeURIComponent(data.subscription_id)}`);
  const active = !!subscription && paidPeriod(subscription, process.env.RAZORPAY_PLAN_ID || "");
  return { db, user, data, subscription, active };
}
export function billingFailure(error: unknown) {
  return Response.json({ success: false, error: error instanceof BillingError ? error.message : "Billing is temporarily unavailable. Please try again." }, {
    status: error instanceof BillingError ? error.status : 500, headers: { "Cache-Control": "no-store" },
  });
}
export { required };
