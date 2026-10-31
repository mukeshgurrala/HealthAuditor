# Billing setup

## What is implemented

- Email OTP sign-in through Supabase (no card required for trial).
- Exactly **10 successful audit requests per account**, not 10 days. Cached results also
  count as requests. Failed audits release their credit; concurrent requests reserve
  credits atomically in PostgreSQL, including across multiple app servers.
- Razorpay recurring monthly subscriptions using a server-configured plan. The real
  plan price/currency is fetched from Razorpay and shown before checkout. No price or
  paid audit limit has been invented; configure both before enabling subscriptions.
- Checkout HMAC signature verification tied to the signed-in account's stored
  subscription ID. Checkout success alone never grants access.
- Paid access is checked against Razorpay's **live active subscription and current
  billing period on every audit**, not client state or webhook payloads. Expired,
  cancelled, pending, halted or unauthenticated subscriptions do not grant access.
  Usage resets by Razorpay billing-cycle ID, not the local calendar month.
- If setup is missing, auditing fails closed; the public sample report still works.

## Required setup

1. In Supabase, run `supabase/billing.sql` in the SQL editor. Enable email auth and
   configure a production SMTP provider. In the **Magic Link email template**, include
   `{{ .Token }}` as the sign-in code. This UI verifies email OTP codes, not link redirects.
   Configure appropriate Supabase email rate limits and abuse protection before launch.
2. Copy the Supabase project URL and anon/publishable key into the two `NEXT_PUBLIC_`
   variables in `.env.local`. Set `SUPABASE_SERVICE_ROLE_KEY` server-side only. Tables
   have RLS enabled and no browser policies; only the server can reserve/refund credits
   or alter subscription IDs. Never give clients the service-role key.
3. Create a **monthly, interval 1** plan in Razorpay with your chosen INR price. Set
   `RAZORPAY_PLAN_ID` and a positive integer `AUDITS_PER_MONTH`. Checkout remains disabled
   until this allowance and a plan are configured. The subscription authorisation is
   for up to 120 monthly billing cycles, subject to customer cancellation.
4. Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in server environment variables. The
   supplied CSV was imported into ignored `.env.local`, not source control. Do not upload
   the CSV or put the secret in a public variable. Configure all variables separately
   on your production host and redeploy (public variables are embedded at build time).
5. Activate Razorpay Subscriptions on your account, and complete any Razorpay onboarding
   requirements. Test and live keys, plans and subscriptions must belong to the same mode.
6. Provide a working support channel and your business's pricing, refund, cancellation,
   privacy and terms pages before taking live payments. Customers can manage subscriptions
   using Razorpay subscription emails; support can manage them in the Razorpay dashboard.

No webhook is needed for entitlement correctness because access uses live provider
checks. This intentionally depends on Razorpay availability and adds a provider request
to paid users' audits. Network policy must permit `api.razorpay.com` from the deployed
server and `checkout.razorpay.com` from the browser.

## Test before going live

- Use Razorpay **test mode** credentials and a test monthly plan first.
- Sign in with a new email; confirm 10 free audits, persistence across browsers and the
  paywall after the tenth successful request. Concurrent requests must not exceed 10.
- Trigger an invalid target/busy audit; confirm the credit is returned. Invalid URL
  requests are rejected before reserving a credit.
- Finish, dismiss and fail test checkouts. A dismissed or failed checkout must not unlock
  auditing. Refresh allowance after payment if activation is not yet visible.
- Confirm a forged signature, another account's subscription ID, and unsigned requests
  cannot grant access. Test cancellation, expiry, pending payments and cycle rollover.
- Check the monthly limit. Once both free and paid allowance are used, the API returns 402.
- A server crash after reservation can leave a credit reserved: reconcile the logged
  ticket with `refund_audit` from a trusted service-role context if necessary. This is
  preferable to allowing concurrent requests to exceed the quota.

Email accounts are not proof of a unique person. Multiple email sign-ups can obtain
multiple trials; add stronger identity/abuse controls if that is unacceptable.

## Validation in this workspace

Unit tests exercise signature validation, period checks and unauthenticated API paths.
TypeScript, lint and production build should also pass. A live payment was **not** made:
this workspace cannot reach Razorpay's API, and Supabase/plan configuration is still
required. Do not interpret local checks as a completed end-to-end payment test.
