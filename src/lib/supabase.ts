import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function supabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/** Read-only client (anon key, RLS-protected). */
export function supabasePublic(): SupabaseClient | null {
  if (!supabaseConfigured()) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

/** Write client for ingestion (service role key, server-side only). */
export function supabaseAdmin(): SupabaseClient | null {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

let browserClient: SupabaseClient | null = null;

/** Singleton browser client (auth session persisted to localStorage) — use this for anything auth-related on the client. */
export function supabaseBrowser(): SupabaseClient | null {
  if (!supabaseConfigured()) return null;
  if (!browserClient) {
    browserClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  }
  return browserClient;
}
