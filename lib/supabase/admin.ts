import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";

// Server-only secret key. Prefer the new "secret key" name, fall back to the
// legacy service_role key. NEVER reference this from client code.
const SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

/** True when the privileged admin client (used by the Stripe webhook) can be built. */
export function isAdminConfigured(): boolean {
  return Boolean(SUPABASE_URL && SECRET_KEY);
}

/**
 * Privileged Supabase client that bypasses RLS. Use ONLY in trusted server code
 * (e.g. the Stripe webhook) to write subscription state. It carries no user session.
 */
export function createAdminClient() {
  if (!SUPABASE_URL || !SECRET_KEY) {
    throw new Error(
      "Supabase admin client is not configured: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.",
    );
  }
  return createSupabaseClient(SUPABASE_URL, SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
