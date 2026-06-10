import { redirect } from "next/navigation";
import Stripe from "stripe";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_STATUSES, reconcileCheckoutSession } from "@/lib/subscription";
import { StudioClient } from "./studio-client";

export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  // Demo mode (no Supabase configured): open studio, no gate.
  if (!isSupabaseConfigured()) {
    return <StudioClient authed={false} />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already redirects unauthenticated users, but guard here too.
  if (!user) redirect("/login?next=/studio");

  let { data: sub } = await supabase
    .from("subscriptions")
    .select("status, plan")
    .eq("user_id", user.id)
    .maybeSingle();

  // Self-heal: if the user just paid but the webhook hasn't landed yet,
  // reconcile directly from the Stripe Checkout Session so they're never bounced.
  if (!sub || !ACTIVE_STATUSES.has(sub.status)) {
    const { session_id: sessionId } = await searchParams;
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (sessionId && secretKey) {
      try {
        const stripe = new Stripe(secretKey);
        const status = await reconcileCheckoutSession(stripe, sessionId, user.id);
        if (status && ACTIVE_STATUSES.has(status)) {
          const refreshed = await supabase
            .from("subscriptions")
            .select("status, plan")
            .eq("user_id", user.id)
            .maybeSingle();
          sub = refreshed.data;
        }
      } catch {
        // Fall through to the pricing redirect below.
      }
    }
  }

  if (!sub || !ACTIVE_STATUSES.has(sub.status)) {
    redirect("/#pricing");
  }

  return (
    <StudioClient authed email={user.email ?? undefined} plan={sub.plan ?? undefined} />
  );
}
