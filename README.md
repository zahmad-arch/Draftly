# Draftly — proposals that win the work

An AI proposal generator for freelancers, agencies, and consultants. Paste rough
discovery-call notes; get a scoped, priced, client-ready proposal in ninety seconds.

## Run it

```bash
npm install
npm run dev        # → http://localhost:3000
```

Works out of the box with **zero keys**: AI drafting falls back to a templated
demo and checkout buttons explain payments aren't live yet. To go fully live:

| Env var | Enables | Where to get it |
| --- | --- | --- |
| `AI_GATEWAY_API_KEY` | Live AI drafting (Claude via Vercel AI Gateway) | vercel.com → AI Gateway |
| `STRIPE_SECRET_KEY` | Real subscription checkout (7-day trial built in) | dashboard.stripe.com/apikeys |

Copy `.env.example` to `.env.local` and fill in. Deployed on Vercel, the AI
Gateway authenticates automatically via OIDC — only the Stripe key is needed.

## The product

- `/` — landing page (hero, how-it-works, pricing wired to Stripe Checkout)
- `/studio` — the generator: brief in, streamed proposal out, copy-as-markdown
- `POST /api/generate` — streams the proposal (Claude Sonnet via AI Gateway)
- `POST /api/checkout` — creates a Stripe subscription Checkout session with a
  7-day trial; prices are defined inline in `lib/plans.ts`, no dashboard setup

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

- [ ] Add Stripe webhook (`checkout.session.completed`) + auth to gate the studio by subscription
- [ ] Set up a custom domain and deploy: `npx vercel --prod`
- [ ] Wire usage limits (30/mo on Solo) — track generations per customer
- [ ] Add Vercel BotID on `/api/generate` to stop free-tier abuse
