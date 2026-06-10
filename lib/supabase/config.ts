// Centralised Supabase env access. References are literal so Next.js inlines the
// NEXT_PUBLIC_* values into the browser bundle. Prefer the new publishable/secret
// key names, fall back to the legacy anon/service_role names.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True when the browser/server clients have what they need to talk to Supabase. */
export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
}
