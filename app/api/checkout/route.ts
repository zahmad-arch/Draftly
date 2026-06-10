import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getPlan } from "@/lib/plans";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

/**
 * Starts Stripe Checkout for a plan. GET so it can be linked to directly and
 * used as a post-login `next` target. If the visitor isn't signed in, they're
 * sent to /login first and bounced back here to resume checkout.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;
  const plan = getPlan(url.searchParams.get("plan") ?? "");

  if (!plan) {
    return NextResponse.redirect(`${origin}/#pricing`);
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.redirect(`${origin}/#pricing?error=payments-not-live`);
  }

  // Tie the subscription to a Draftly account so the webhook can grant access.
  let userId: string | undefined;
  let userEmail: string | undefined;
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      const login = new URL(`${origin}/login`);
      login.searchParams.set("next", `/api/checkout?plan=${plan.id}`);
      login.searchParams.set("plan", plan.id);
      return NextResponse.redirect(login);
    }
    userId = user.id;
    userEmail = user.email ?? undefined;
  }

  const meta = { ...(userId ? { user_id: userId } : {}), plan: plan.id };
  const stripe = new Stripe(secretKey);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: plan.priceMonthly * 100,
          recurring: { interval: "month" },
          product_data: {
            name: `Draftly ${plan.name}`,
            description: plan.tagline,
          },
        },
      },
    ],
    subscription_data: { trial_period_days: 7, metadata: meta },
    metadata: meta,
    ...(userId ? { client_reference_id: userId } : {}),
    ...(userEmail ? { customer_email: userEmail } : {}),
    allow_promotion_codes: true,
    success_url: `${origin}/studio?welcome=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/#pricing`,
  });

  if (!session.url) {
    return NextResponse.redirect(`${origin}/#pricing`);
  }
  return NextResponse.redirect(session.url, { status: 303 });
}
