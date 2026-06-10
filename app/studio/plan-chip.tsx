export function PlanChip({ plan, className = "" }: { plan: string; className?: string }) {
  return (
    <span
      className={`border border-line bg-cream px-2 py-0.5 text-[0.65rem] font-semibold tracking-[0.18em] text-ink-soft uppercase ${className}`}
    >
      {plan} <span className="text-vermillion">✳</span>
    </span>
  );
}
