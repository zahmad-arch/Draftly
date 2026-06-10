import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

/** Subscription statuses that grant access to the studio. */
export const ACTIVE_STATUSES = new Set(["active", "trialing"]);

export interface SubscriptionRow {
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: string | null;
  status: string;
  current_period_end: string | null;
  updated_at: string;
}

/** Period end can sit at the top level or per-item depending on API version. */
export function periodEndISO(sub: Stripe.Subscription): string | null {
  const top = (sub as unknown as { current_period_end?: number })
    .current_period_end;
  const item = sub.items?.data?.[0]?.current_period_end;
  const ts = top ?? item;
  return typeof ts === "number" ? new Date(ts * 1000).toISOString() : null;
}

export function stripeCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
): string | null {
  if (!customer) return null;
  return typeof customer === "string" ? customer : customer.id;
}

/** Write subscription state with the service-role client (bypasses RLS). */
export async function upsertSubscription(row: SubscriptionRow): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("subscriptions")
    .upsert(row, { onConflict: "user_id" });
  if (error) throw new Error(`Supabase upsert failed: ${error.message}`);
}

/**
 * Self-healing fallback for the success page: reconcile a just-completed
 * Checkout Session into the subscriptions table so a paying user is never
 * bounced while the webhook is still in flight. Verifies the session belongs to
 * the given user. Returns the resulting status, or null if it can't be confirmed.
 */
export async function reconcileCheckoutSession(
  stripe: Stripe,
  sessionId: string,
  expectedUserId: string,
): Promise<string | null> {
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  });

  const sessionUserId =
    session.client_reference_id ?? session.metadata?.user_id ?? null;
  if (sessionUserId !== expectedUserId) return null;

  const sub =
    session.subscription && typeof session.subscription !== "string"
      ? (session.subscription as Stripe.Subscription)
      : null;

  const status = sub?.status ?? (session.payment_status === "paid" ? "active" : null);
  if (!status) return null;

  await upsertSubscription({
    user_id: expectedUserId,
    stripe_customer_id: stripeCustomerId(session.customer),
    stripe_subscription_id:
      typeof session.subscription === "string"
        ? session.subscription
        : (sub?.id ?? null),
    plan: session.metadata?.plan ?? sub?.metadata?.plan ?? null,
    status,
    current_period_end: sub ? periodEndISO(sub) : null,
    updated_at: new Date().toISOString(),
  });

  return status;
}
