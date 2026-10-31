"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/billing/client";
import { useAuth } from "@/components/auth-provider";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const { user, configured } = useAuth();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      router.push(next);
    }
  }, [user, router, next]);

  async function handleSend() {
    setError("");
    setMessage("");
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    try {
      const client = authClient();
      if (!client) throw new Error("Accounts are not configured yet. Please try again later.");
      const { error } = await client.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setSent(true);
      setMessage("Check your email for your 6-digit sign-in code. It may take a minute.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send code. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify() {
    setError("");
    setMessage("");
    if (!code.trim()) {
      setError("Enter the code from your email.");
      return;
    }
    setBusy(true);
    try {
      const client = authClient();
      if (!client) throw new Error("Accounts are not configured yet.");
      const { error } = await client.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: "email",
      });
      if (error) throw error;
      setMessage("Signed in — redirecting…");
      // onAuthStateChange will update context; push after short delay
      setTimeout(() => router.push(next), 300);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid code. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!configured) {
    return (
      <div className="login-card">
        <h2>Account setup in progress</h2>
        <p>
          Sign-in is not configured yet. In the meantime, explore the <Link href="/demo">sample report</Link> or return
          to the <Link href="/">homepage</Link>.
        </p>
      </div>
    );
  }

  return (
    <div className="login-card">
      <h2>{sent ? "Enter your code" : "Sign in with email"}</h2>
      <p className="login-card-desc">
        {sent ? (
          <>
            We sent a code to <strong>{email}</strong>. Enter it below to continue.
          </>
        ) : (
          <>No password needed — we&apos;ll email you a one-time code.</>
        )}
      </p>

      {!sent ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSend();
          }}
          className="login-form"
        >
          <label>
            Email address
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              disabled={busy}
            />
          </label>
          <button type="submit" className="tactile login-submit" disabled={busy}>
            {busy ? "Sending…" : "Email me a sign-in code"}
          </button>
          <small className="login-hint">
            By signing in you agree to our <Link href="/how-it-works#privacy">Privacy</Link> and{" "}
            <Link href="/pricing">Billing terms</Link>. 10 free audits per account, then $5/month.
          </small>
        </form>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleVerify();
          }}
          className="login-form"
        >
          <label>
            Sign-in code
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              autoComplete="one-time-code"
              inputMode="numeric"
              autoFocus
              disabled={busy}
            />
          </label>
          <button type="submit" className="tactile login-submit" disabled={busy}>
            {busy ? "Verifying…" : "Verify & sign in"}
          </button>
          <div className="login-actions">
            <button
              type="button"
              className="login-ghost"
              disabled={busy}
              onClick={() => {
                setSent(false);
                setCode("");
                setError("");
                setMessage("");
              }}
            >
              Change email
            </button>
            <button type="button" className="login-ghost" disabled={busy} onClick={() => void handleSend()}>
              Resend code
            </button>
          </div>
        </form>
      )}

      {error && (
        <p role="alert" className="login-error">
          {error}
        </p>
      )}
      {message && !error && (
        <p role="status" className="login-success">
          {message}
        </p>
      )}

      <div className="login-footer">
        <small>
          Didn&apos;t get the email? Check spam, or{" "}
          <button type="button" className="link-button" onClick={() => void handleSend()} disabled={busy}>
            resend
          </button>
          . New here? The same form creates your account.
        </small>
        <Link href="/" className="login-back">
          ← Back to homepage
        </Link>
      </div>
    </div>
  );
}
