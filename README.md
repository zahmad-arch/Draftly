# Draftly — proposals that win the work

An AI proposal generator for freelancers, agencies, and consultants. Paste rough
discovery-call notes; get a scoped, priced, client-ready proposal in ninety seconds.

## Run it

```bash
npm install
npm run dev        # → http://localhost:3000
```

Works out of the box with **zero keys**: AI drafting falls back to a templated
demo, the studio is open, and accounts/checkout are disabled. Add env vars to
turn features on incrementally.

| Env var | Enables | Where to get it |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Live AI drafting (Claude Sonnet) | console.anthropic.com/settings/keys |
| `STRIPE_SECRET_KEY` | Stripe subscription checkout (7-day trial) | dashboard.stripe.com/apikeys |
| `STRIPE_WEBHOOK_SECRET` | Recording who paid | dashboard.stripe.com/webhooks (see below) |
| `NEXT_PUBLIC_SUPABASE_URL` | Accounts + subscription gating | supabase.com/dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | (publishable key; anon key also works) | same |
| `SUPABASE_SECRET_KEY` | Server-only; webhook writes subscription state | same (or service_role key) |

Copy `.env.example` to `.env.local` and fill in.

## Going live: accounts + subscriptions

Once Supabase and Stripe env vars are set, Draftly gates the studio behind a paid
(or trialing) subscription. Three one-time setup steps:

1. **Create the subscriptions table.** In the Supabase dashboard → SQL Editor,
   run `supabase/migrations/20260610000000_subscriptions.sql`. It creates a
   `subscriptions` table with RLS so users can read only their own row, and only
   the server (service-role key) can write.

2. **Add the Stripe webhook.** dashboard.stripe.com/webhooks → Add endpoint →
   `https://YOUR_DOMAIN/api/webhooks/stripe`. Subscribe to
   `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated`, `customer.subscription.deleted`. Copy the
   signing secret (`whsec_…`) into `STRIPE_WEBHOOK_SECRET`.

3. **Configure Supabase Auth.** Authentication → URL Configuration → set Site URL
   to your domain and add `https://YOUR_DOMAIN/auth/confirm` to redirect URLs.
   For fastest signup during launch testing, you can disable "Confirm email"
   under Authentication → Providers → Email (re-enable it later).

### How a paying user gets in

`/#pricing` → **Start free trial** → `/api/checkout` (redirects to `/login` if
signed out, then resumes) → Stripe Checkout (7-day trial) → back to `/studio`.
The webhook records the subscription; the studio page also self-heals from the
Stripe session so a paid user is never bounced while the webhook is in flight.
Manage/cancel via **Manage billing** (Stripe Billing Portal) in the studio header.

## The product

- `/` — landing page (hero, how-it-works, pricing → Stripe Checkout links)
- `/login` — Supabase email/password sign-in & sign-up
- `/studio` — gated generator: brief in, streamed proposal out, copy-as-markdown
- `POST /api/generate` — streams the proposal (Claude Sonnet); enforces an active subscription
- `GET /api/checkout?plan=` — starts a Stripe subscription Checkout (7-day trial), requires auth
- `GET /api/portal` — opens the Stripe Billing Portal for the signed-in customer
- `POST /api/webhooks/stripe` — records subscription state into Supabase
- prices are defined inline in `lib/plans.ts`, no Stripe dashboard product setup

## The math to $1M/month

Nobody can promise revenue — that part is distribution, not code. But the unit
economics are deliberately simple:

| Plan | Price | Customers needed for $1M/mo |
| --- | --- | --- |
| Solo | $29/mo | 34,500 |
| Studio | $79/mo | 12,700 |
| Agency | $199/mo | 5,050 |

A realistic blended target: **~8,000 paying customers** at an average of
~$125/mo (mostly Studio + Agency). For context, the freelance/agency market is
~80M people globally; you need 0.01% of it.

### Milestones that actually matter

1. **$1k/mo (≈15 customers)** — proves someone will pay. Get here by hand:
   DM 100 freelancers in design/dev communities, offer founding-member pricing.
2. **$10k/mo (≈100 customers)** — proves a channel. Double down on whichever
   worked: SEO ("proposal template for X" keywords are high-intent and
   uncrowded), partnership with invoicing/CRM tools, or community content.
3. **$100k/mo** — proves retention. Add the moat features: client profiles,
   win-rate analytics, e-signatures (kills the PandaDoc upsell), team seats.
4. **$1M/mo** — requires moving upmarket: agency teams, white-label, API.

### Pre-launch checklist

- [x] Accounts (Supabase Auth) + subscription gating on the studio and generate API
- [x] Stripe webhook recording subscription state, with success-page self-heal
- [x] Rate limit `/api/generate` at the edge (Vercel WAF) to stop free-tier abuse
- [ ] Set up the `draftly.ca` domain and deploy: `npx vercel --prod`
- [ ] Wire per-plan usage limits (30/mo on Solo; track generations per customer)
- [ ] Differentiate Studio/Agency features (client profiles, team seats, analytics)
