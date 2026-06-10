import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";

/**
 * Atomically consume one generation against a monthly limit. Returns
 * { allowed, used }. Fails open (allowed) with a warning when the admin
 * client isn't configured — graceful degradation over hard failure.
 */
export async function consumeGeneration(
  userId: string,
  limit: number,
): Promise<{ allowed: boolean; used: number | null }> {
  if (!isAdminConfigured()) {
    console.warn("Usage limit skipped: Supabase admin client not configured.");
    return { allowed: true, used: null };
  }
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("consume_generation", {
    p_user_id: userId,
    p_limit: limit,
  });
  if (error) {
    console.warn("consume_generation failed, allowing request:", error.message);
    return { allowed: true, used: null };
  }
  // NULL data means the conditional upsert matched nothing: cap reached.
  if (data === null || data === undefined) return { allowed: false, used: limit };
  return { allowed: true, used: data as number };
}

/** Refund one generation after a failed model call. */
export async function releaseGeneration(userId: string): Promise<void> {
  if (!isAdminConfigured()) return;
  const admin = createAdminClient();
  const { error } = await admin.rpc("release_generation", { p_user_id: userId });
  if (error) console.warn("release_generation failed:", error.message);
}
