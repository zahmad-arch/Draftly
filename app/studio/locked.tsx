import { upgradeHref, requiredPlanFor, type Feature } from "@/lib/entitlements";
import { PlanChip } from "./plan-chip";

const PLAN_LABEL: Record<string, string> = { studio: "Studio", agency: "Agency" };

/** Full-route teaser for a feature the current plan doesn't include. */
export function LockedPanel({
  feature,
  headline,
  sell,
  ghost,
}: {
  feature: Feature;
  headline: string;
  sell: string;
  ghost: React.ReactNode;
}) {
  const plan = requiredPlanFor(feature);
  const label = PLAN_LABEL[plan];
  return (
    <div className="relative border border-dashed border-line bg-cream p-10 shadow-[8px_10px_0_0_rgba(27,23,18,0.06)] transition-colors hover:border-vermillion/40">
      <PlanChip plan={label} className="absolute -top-2.5 left-8" />
      <p className="eyebrow text-vermillion">Included in {label}</p>
      <h1 className="mt-3 max-w-xl font-display text-3xl font-medium tracking-tight">{headline}</h1>
      <p className="mt-3 max-w-md leading-relaxed text-ink-soft">{sell}</p>

      <div className="pointer-events-none mt-8 opacity-60 select-none" aria-hidden>
        {ghost}
      </div>

      <div className="mt-9 flex flex-wrap items-center gap-4">
        <a
          href={upgradeHref(plan)}
          className="border border-ink bg-ink px-6 py-3 font-medium text-cream transition-colors hover:bg-vermillion hover:border-vermillion"
        >
          Upgrade to {label} →
        </a>
        <a href="/#pricing" className="text-sm text-ink-soft underline underline-offset-4 hover:text-ink">
          Compare plans
        </a>
      </div>
    </div>
  );
}

/** Compact inline teaser used inside the generator form. */
export function LockedField({ feature, label, note }: { feature: Feature; label: string; note: string }) {
  const plan = requiredPlanFor(feature);
  const planLabel = PLAN_LABEL[plan];
  return (
    <a
      href={upgradeHref(plan)}
      className="relative mt-5 block border border-dashed border-line bg-paper/60 p-4 transition-colors hover:border-vermillion/40"
    >
      <PlanChip plan={`${label} · ${planLabel}`} className="absolute -top-2.5 left-3" />
      <div className="space-y-2 opacity-50" aria-hidden>
        <div className="h-2 w-3/4 bg-line" />
        <div className="h-2 w-1/2 bg-line" />
      </div>
      <p className="mt-3 text-xs text-ink-soft">
        {note}{" "}
        <span className="text-vermillion underline underline-offset-4">Upgrade →</span>
      </p>
    </a>
  );
}

/** Ghost bars for teaser previews — mirrors the landing mock-document technique. */
export function GhostBars({ widths = [100, 85, 92, 60] }: { widths?: number[] }) {
  return (
    <div className="space-y-2.5">
      {widths.map((w, i) => (
        <div key={i} className="h-2 bg-line" style={{ width: `${w}%` }} />
      ))}
    </div>
  );
}
