"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
let client: SupabaseClient | null = null;
export function authClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return client ??= createClient(url, key);
}
export async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await authClient()?.auth.getSession() ?? { data: { session: null } };
  return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}
