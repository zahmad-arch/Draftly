import type { PlanId } from "@/lib/plans";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { entitlementsFor, type Entitlements } from "@/lib/entitlements";

export type AccessVia = "subscription" | "team";

export interface Access {
  /** The authenticated user. */
  userId: string;
  email: string | null;
  /** Data namespace: own id, or the team owner's id when via === "team". */
  accountId: string;
  plan: PlanId;
  status: string;
  via: AccessVia;
  /** Proposals consumed this calendar month (meaningful when monthlyLimit !== null). */
  usedThisMonth: number;
  entitlements: Entitlements;
}

export type AccessResult =
  | { kind: "demo" }
  | { kind: "unauthenticated" }
  | { kind: "unsubscribed"; userId: string; email: string | null }
  | { kind: "ok"; access: Access };

/**
 * Resolves the caller's effective plan: their own active subscription, or
 * membership in a team whose owner holds an active Agency subscription.
 * Also auto-claims pending team invites matching the user's verified email
 * (inside the resolve_access RPC).
 */
export async function resolveAccess(): Promise<AccessResult> {
  if (!isSupabaseConfigured()) return { kind: "demo" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { kind: "unauthenticated" };

  const { data, error } = await supabase.rpc("resolve_access");
  if (error) {
    console.error("resolve_access failed:", error.message);
    return { kind: "unsubscribed", userId: user.id, email: user.email ?? null };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return { kind: "unsubscribed", userId: user.id, email: user.email ?? null };
  }

  const plan = row.plan as PlanId;
  return {
    kind: "ok",
    access: {
      userId: user.id,
      email: user.email ?? null,
      accountId: row.account_id,
      plan,
      status: row.status,
      via: row.via as AccessVia,
      usedThisMonth: row.used_this_month ?? 0,
      entitlements: entitlementsFor(plan),
    },
  };
}
