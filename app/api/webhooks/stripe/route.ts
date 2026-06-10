import { NextResponse } from "next/server";
import Stripe from "stripe";
import { isAdminConfigured } from "@/lib/supabase/admin";
import {
  periodEndISO,
  stripeCustomerId,
  upsertSubscription,
} from "@/lib/subscription";

// Stripe needs the raw request body to verify the signature.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey || !webhookSecret || !isAdminConfigured()) {
    return NextResponse.json(
      { error: "Webhook not configured." },
      { status: 503 },
    );
  }

  const stripe = new Stripe(secretKey);
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json(
      { error: `Invalid signature: ${message}` },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId =
          session.client_reference_id ?? session.metadata?.user_id ?? null;
        if (!userId) break;

        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : (session.subscription?.id ?? null);
        const sub = subscriptionId
          ? await stripe.subscriptions.retrieve(subscriptionId)
          : null;

        await upsertSubscription({
          user_id: userId,
          stripe_customer_id: stripeCustomerId(session.customer),
          stripe_subscription_id: subscriptionId,
          plan: session.metadata?.plan ?? sub?.metadata?.plan ?? null,
          status: sub?.status ?? "active",
          current_period_end: sub ? periodEndISO(sub) : null,
          updated_at: new Date().toISOString(),
        });
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id ?? null;
        if (!userId) break;

        await upsertSubscription({
          user_id: userId,
          stripe_customer_id: stripeCustomerId(sub.customer),
          stripe_subscription_id: sub.id,
          plan: sub.metadata?.plan ?? null,
          status:
            event.type === "customer.subscription.deleted"
              ? "canceled"
              : sub.status,
          current_period_end: periodEndISO(sub),
          updated_at: new Date().toISOString(),
        });
        break;
      }

      default:
        break;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    // 500 tells Stripe to retry delivery.
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
