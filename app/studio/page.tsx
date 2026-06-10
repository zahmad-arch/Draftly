import { redirect } from "next/navigation";
import Stripe from "stripe";
import { resolveAccess } from "@/lib/access";
import { getStudioContext } from "@/lib/studio/context";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_STATUSES, reconcileCheckoutSession } from "@/lib/subscription";
import { StudioClient, type ClientProfile } from "./studio-client";

export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; welcome?: string }>;
}) {
  const ctx = await getStudioContext();

  // Demo mode (no Supabase configured): open studio, no gate.
  if (ctx.kind === "demo") {
    return <StudioClient demo />;
  }

  if (ctx.kind === "unauthenticated") redirect("/login?next=/studio");

  if (ctx.kind === "unsubscribed") {
    // Self-heal: if the user just paid but the webhook hasn't landed yet,
    // reconcile directly from the Stripe Checkout Session.
    const { session_id: sessionId } = await searchParams;
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (sessionId && secretKey) {
      try {
        const stripe = new Stripe(secretKey);
        const status = await reconcileCheckoutSession(stripe, sessionId, ctx.userId);
        if (status && ACTIVE_STATUSES.has(status)) {
          const fresh = await resolveAccess();
          if (fresh.kind === "ok") {
            // Re-render the whole shell (nav included) with clean params.
            redirect("/studio?welcome=1");
          }
        }
      } catch (err) {
        // redirect() throws by design — let it through, swallow Stripe errors.
        if (err && typeof err === "object" && "digest" in err) throw err;
      }
    }
    redirect("/#pricing");
  }

  const { access } = ctx;
  const ent = access.entitlements;
  const supabase = await createClient();

  const [profilesRes, voiceRes] = await Promise.all([
    ent.clientProfiles
      ? supabase
          .from("client_profiles")
          .select("id, name, business_context, default_budget, default_tone, notes")
          .eq("account_id", access.accountId)
          .order("name")
      : Promise.resolve({ data: null }),
    ent.brandVoice
      ? supabase
          .from("brand_voices")
          .select("voice_name")
          .eq("account_id", access.accountId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <StudioClient
      plan={access.plan}
      usage={
        ent.monthlyLimit !== null
          ? { used: access.usedThisMonth, limit: ent.monthlyLimit }
          : null
      }
      profiles={(profilesRes.data as ClientProfile[] | null) ?? []}
      voiceName={
        ent.brandVoice ? ((voiceRes.data as { voice_name: string } | null)?.voice_name ?? null) : null
      }
      hasVoice={ent.brandVoice ? Boolean(voiceRes.data) : false}
      canPricingTables={ent.pricingTables}
      canClientProfiles={ent.clientProfiles}
      canBrandVoice={ent.brandVoice}
    />
  );
}
