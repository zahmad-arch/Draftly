import { NextResponse } from "next/server";
import Stripe from "stripe";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

/** Sends a subscribed user to the Stripe Billing Portal to manage/cancel their plan. */
export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey || !isSupabaseConfigured()) {
    return NextResponse.redirect(`${origin}/`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/login?next=/api/portal`);
  }

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!sub?.stripe_customer_id) {
    return NextResponse.redirect(`${origin}/#pricing`);
  }

  const stripe = new Stripe(secretKey);
  const portal = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${origin}/studio`,
  });

  return NextResponse.redirect(portal.url, { status: 303 });
}
