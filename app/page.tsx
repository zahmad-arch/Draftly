import Link from "next/link";
import { PLANS } from "@/lib/plans";
import { CheckoutButton } from "./checkout-button";

const INDUSTRIES = [
  "Web studios",
  "Brand designers",
  "Copywriters",
  "Marketing consultants",
  "Photographers",
  "Dev shops",
  "Architects",
  "Bookkeepers",
  "Video producers",
  "Coaches",
];

const STEPS = [
  {
    n: "01",
    title: "Dump your notes",
    body: "Paste the messy call notes, the scope you scribbled, the budget range they hinted at. No structure required.",
  },
  {
    n: "02",
    title: "Draftly writes the pitch",
    body: "Scope, deliverables, timeline, pricing, terms: drafted in your tone, framed around the client's outcome, not your task list.",
  },
  {
    n: "03",
    title: "Send it while they're warm",
    body: "Ninety seconds from call to inbox. The proposal that arrives first, wins. Yours always arrives first.",
  },
];

export default function Home() {
  return (
    <main className="flex-1">
      {/* ── Nav ─────────────────────────────────── */}
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="font-display text-2xl font-semibold tracking-tight">
            Draftly<span className="text-vermillion">.</span>
          </Link>
          <nav className="flex items-center gap-7 text-sm">
            <a href="#how" className="hidden text-ink-soft hover:text-ink sm:block">
              How it works
            </a>
            <a href="#pricing" className="hidden text-ink-soft hover:text-ink sm:block">
              Pricing
            </a>
            <Link
              href="/studio"
              className="border border-ink bg-ink px-4 py-2 text-sm font-medium text-cream transition-colors hover:bg-vermillion hover:border-vermillion"
            >
              Open the studio
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────── */}
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
          <div>
            <p className="eyebrow rise text-vermillion" style={{ animationDelay: "0.05s" }}>
              For people who sell their craft
            </p>
            <h1
              className="rise mt-5 font-display text-5xl leading-[1.02] font-medium tracking-tight sm:text-7xl"
              style={{ animationDelay: "0.15s" }}
            >
              Win the work before the meeting ends.
            </h1>
            <p
              className="rise mt-6 max-w-md text-lg leading-relaxed text-ink-soft"
              style={{ animationDelay: "0.3s" }}
            >
              Draftly turns rough call notes into a client-ready proposal in
              ninety seconds, scoped, priced, and written in your voice.
            </p>
            <div className="rise mt-9 flex flex-wrap items-center gap-4" style={{ animationDelay: "0.45s" }}>
              <Link
                href="/studio"
                className="border border-ink bg-ink px-6 py-3 font-medium text-cream transition-colors hover:bg-vermillion hover:border-vermillion"
              >
                Draft a proposal free →
              </Link>
              <a href="#pricing" className="text-sm text-ink-soft underline underline-offset-4 hover:text-ink">
                See pricing
              </a>
            </div>
          </div>

          {/* Mock proposal document */}
          <div className="rise relative self-center" style={{ animationDelay: "0.5s" }}>
            <div className="rotate-1 border border-line bg-cream p-8 shadow-[8px_10px_0_0_rgba(27,23,18,0.08)]">
              <p className="eyebrow text-ink-soft">Proposal № 047</p>
              <h3 className="mt-3 font-display text-2xl font-medium">
                Website redesign for Hartline Coffee Co.
              </h3>
              <div className="mt-5 space-y-2.5">
                {[100, 92, 96, 60, 0, 88, 95, 72].map((w, i) =>
                  w === 0 ? (
                    <div key={i} className="h-3" />
                  ) : (
                    <div key={i} className="h-2 bg-line" style={{ width: `${w}%` }} />
                  ),
                )}
              </div>
              <div className="mt-6 flex items-baseline justify-between border-t border-line pt-4">
                <span className="text-xs tracking-wide text-ink-soft uppercase">Total investment</span>
                <span className="font-display text-xl font-semibold">$12,400</span>
              </div>
            </div>
            <div className="stamp absolute -top-4 -right-3 border-4 border-moss px-4 py-1.5 font-display text-lg font-bold tracking-[0.18em] text-moss uppercase">
              Accepted
            </div>
          </div>
        </div>
      </section>

      {/* ── Marquee ─────────────────────────────── */}
      <section aria-hidden className="overflow-hidden border-b border-line bg-ink py-3">
        <div className="marquee-track flex w-max gap-10 whitespace-nowrap">
          {[...INDUSTRIES, ...INDUSTRIES].map((label, i) => (
            <span key={i} className="flex items-center gap-10 text-sm tracking-[0.18em] text-cream/70 uppercase">
              {label} <span className="text-vermillion">✳</span>
            </span>
          ))}
        </div>
      </section>

      {/* ── How it works ────────────────────────── */}
      <section id="how" className="border-b border-line">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="eyebrow text-vermillion">How it works</p>
          <h2 className="mt-4 max-w-xl font-display text-4xl font-medium tracking-tight sm:text-5xl">
            From messy notes to signed work.
          </h2>
          <div className="mt-14 grid gap-px border border-line bg-line md:grid-cols-3">
            {STEPS.map((step) => (
              <article key={step.n} className="group bg-paper p-8 transition-colors hover:bg-cream">
                <span className="font-display text-5xl font-light text-line transition-colors group-hover:text-vermillion">
                  {step.n}
                </span>
                <h3 className="mt-6 font-display text-xl font-semibold">{step.title}</h3>
                <p className="mt-3 leading-relaxed text-ink-soft">{step.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ───────────────────────────────── */}
      <section className="border-b border-line bg-moss text-cream">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 md:grid-cols-3">
          {[
            ["3–6 hrs", "the average time a freelancer spends writing one proposal by hand"],
            ["45%", "of deals go to the first proposal that lands in the client's inbox"],
            ["90 sec", "from pasted notes to a send-ready draft in Draftly"],
          ].map(([stat, label]) => (
            <div key={stat}>
              <p className="font-display text-5xl font-medium tracking-tight">{stat}</p>
              <p className="mt-3 max-w-xs leading-relaxed text-cream/75">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────── */}
      <section id="pricing" className="border-b border-line">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="eyebrow text-vermillion">Pricing</p>
          <h2 className="mt-4 font-display text-4xl font-medium tracking-tight sm:text-5xl">
            One won project pays for a year.
          </h2>
          <div className="mt-14 grid gap-px border border-line bg-line lg:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`relative flex flex-col p-8 ${plan.highlighted ? "bg-ink text-cream" : "bg-paper"}`}
              >
                {plan.highlighted && (
                  <span className="absolute top-0 right-8 -translate-y-1/2 bg-vermillion px-3 py-1 text-[0.65rem] font-semibold tracking-[0.18em] text-cream uppercase">
                    Most popular
                  </span>
                )}
                <h3 className="font-display text-xl font-semibold">{plan.name}</h3>
                <p className={`mt-1 text-sm ${plan.highlighted ? "text-cream/70" : "text-ink-soft"}`}>
                  {plan.tagline}
                </p>
                <p className="mt-6 font-display text-5xl font-medium">
                  ${plan.priceMonthly}
                  <span className={`text-base ${plan.highlighted ? "text-cream/60" : "text-ink-soft"}`}>
                    /mo
                  </span>
                </p>
                <ul className={`mt-7 flex-1 space-y-3 text-sm ${plan.highlighted ? "text-cream/85" : "text-ink-soft"}`}>
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2.5">
                      <span className="text-vermillion">✳</span> {f}
                    </li>
                  ))}
                </ul>
                <CheckoutButton planId={plan.id} highlighted={plan.highlighted} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────── */}
      <section>
        <div className="mx-auto max-w-6xl px-6 py-24 text-center">
          <h2 className="mx-auto max-w-2xl font-display text-4xl font-medium tracking-tight sm:text-6xl">
            Your next client is comparing proposals{" "}
            <em className="text-vermillion not-italic underline decoration-2 underline-offset-8">
              right now
            </em>
            .
          </h2>
          <Link
            href="/studio"
            className="mt-10 inline-block border border-ink bg-ink px-8 py-4 text-lg font-medium text-cream transition-colors hover:bg-vermillion hover:border-vermillion"
          >
            Draft yours in 90 seconds →
          </Link>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm text-ink-soft">
          <p>
            <span className="font-display font-semibold text-ink">Draftly.</span> Proposals that win
            the work.
          </p>
          <p className="flex items-center gap-1.5">
            <span>Made with</span>
            <span className="text-vermillion" aria-label="love">♥</span>
            <span>in Canada</span>
            <span aria-label="Canadian flag">🍁</span>
          </p>
          <p className="flex items-center gap-4">
            <Link href="/support" className="underline underline-offset-4 hover:text-ink">
              Support
            </Link>
            <span>© {new Date().getFullYear()} Draftly</span>
          </p>
        </div>
      </footer>
    </main>
  );
}
