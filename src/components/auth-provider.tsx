"use client";
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { authClient, authHeaders } from "@/lib/billing/client";
import type { Session, User } from "@supabase/supabase-js";

type BillingStatus = {
  freeRemaining: number;
  active: boolean;
  paidRemaining: number;
  monthlyLimit: number;
  plan: { item: { amount: number; currency: string }; period: string; interval: number } | null;
};

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  status: BillingStatus | null;
  loading: boolean;
  configured: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  status: null,
  loading: true,
  configured: false,
  signOut: async () => {},
  refresh: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const configured = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!configured) {
      setLoading(false);
      return;
    }
    const client = authClient();
    if (!client) {
      setLoading(false);
      return;
    }
    const { data: sess } = await client.auth.getSession();
    setSession(sess.session);
    setUser(sess.session?.user ?? null);
    if (!sess.session) {
      setStatus(null);
      setLoading(false);
      return;
    }
    try {
      const headers = await authHeaders();
      const res = await fetch("/api/billing/status", { headers, cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      } else {
        setStatus(null);
      }
    } catch {
      // keep existing status on failure
    }
    setLoading(false);
  }, [configured]);

  useEffect(() => {
    const client = authClient();
    if (!client || !configured) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }
    // initial load
    void refresh();
    const { data: sub } = client.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (!newSession) setStatus(null);
      if (newSession) setTimeout(() => void refresh(), 0);
      else setLoading(false);
    });
    const onBillingRefresh = () => void refresh();
    window.addEventListener("billing-refresh", onBillingRefresh);
    return () => {
      sub.subscription.unsubscribe();
      window.removeEventListener("billing-refresh", onBillingRefresh);
    };
  }, [refresh, configured]);

  const signOut = useCallback(async () => {
    const client = authClient();
    await client?.auth.signOut();
    setSession(null);
    setUser(null);
    setStatus(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, session, status, loading, configured, signOut, refresh }),
    [user, session, status, loading, configured, signOut, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
