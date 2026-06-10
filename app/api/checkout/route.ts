import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getPlan } from "@/lib/plans";

export async function POST(req: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json(
      { error: "Payments aren't live yet — set STRIPE_SECRET_KEY to enable checkout." },
      { status: 503 },
    );
  }

  const { plan: planId } = await req.json().catch(() => ({}) as { plan?: string });
  const plan = getPlan(planId ?? "");
  if (!plan) {
    return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
  }

  const stripe = new Stripe(secretKey);
  const origin = req.headers.get("origin") ?? "http://localhost:3000";

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
    subscription_data: { trial_period_days: 7 },
    success_url: `${origin}/studio?welcome=1`,
    cancel_url: `${origin}/#pricing`,
  });

  return NextResponse.json({ url: session.url });
}
