import Link from "next/link";
import { redirect } from "next/navigation";
import { getStudioContext } from "@/lib/studio/context";
import { StudioNav, type NavItem } from "./studio-nav";

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getStudioContext();

  // Demo mode: open studio, minimal shell, no nav (features need a DB).
  if (ctx.kind === "demo") {
    return (
      <main className="flex-1">
        <header className="border-b border-line">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="font-display text-2xl font-semibold tracking-tight">
              Draftly<span className="text-vermillion">.</span>
            </Link>
            <Link
              href="/#pricing"
              className="text-sm text-ink-soft underline underline-offset-4 hover:text-ink"
            >
              Upgrade plan
            </Link>
          </div>
        </header>
        {children}
      </main>
    );
  }

  if (ctx.kind === "unauthenticated") redirect("/login?next=/studio");

  // Signed in but unsubscribed: pages handle their own redirect (the
  // generator page must run the Stripe reconcile first), so render a bare
  // shell without the nav.
  const ent = ctx.kind === "ok" ? ctx.access.entitlements : null;
  const email = ctx.kind === "ok" ? ctx.access.email : ctx.email;
  const plan = ctx.kind === "ok" ? ctx.access.plan : null;

  const items: NavItem[] = [
    { href: "/studio", label: "Draft" },
    { href: "/studio/proposals", label: "History" },
    {
      href: "/studio/clients",
      label: "Clients",
      locked: !ent?.clientProfiles,
      lockedTitle: "Included in Studio",
    },
    {
      href: "/studio/voice",
      label: "Voice",
      locked: !ent?.brandVoice,
      lockedTitle: "Included in Agency",
    },
    {
      href: "/studio/analytics",
      label: "Analytics",
      locked: !ent?.analytics,
      lockedTitle: "Included in Agency",
    },
    {
      href: "/studio/team",
      label: "Team",
      locked: !ent || ent.teamSeats === 0,
      lockedTitle: "Included in Agency",
    },
  ];

  return (
    <main className="flex-1">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="font-display text-2xl font-semibold tracking-tight">
            Draftly<span className="text-vermillion">.</span>
          </Link>
          <div className="flex items-center gap-5 text-sm">
            {plan && (
              <span className="hidden border border-line px-2.5 py-1 text-xs font-medium tracking-wide text-ink-soft uppercase sm:inline">
                {plan} plan
              </span>
            )}
            {email && <span className="hidden text-ink-soft md:inline">{email}</span>}
            <a
              href="/api/portal"
              className="text-ink-soft underline underline-offset-4 hover:text-ink"
            >
              Manage billing
            </a>
            <Link
              href="/support"
              className="hidden text-ink-soft underline underline-offset-4 hover:text-ink sm:inline"
            >
              Support
            </Link>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="cursor-pointer text-ink-soft underline underline-offset-4 hover:text-ink"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
        {ctx.kind === "ok" && <StudioNav items={items} />}
      </header>
      {children}
    </main>
  );
}
