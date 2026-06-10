"use client";

export function UsageMeter({ used, limit }: { used: number; limit: number }) {
  const pct = Math.min((used / limit) * 100, 100);
  const warning = used / limit >= 0.8 && used < limit;
  const blocked = used >= limit;
  const left = Math.max(limit - used, 0);

  return (
    <div className="mt-5">
      <div className="flex items-baseline justify-between">
        <span className="eyebrow text-ink-soft">
          {blocked
            ? `${limit} of ${limit}: monthly limit reached`
            : `${used} of ${limit} proposals this month${warning ? ` (${left} left)` : ""}`}
        </span>
        {(warning || blocked) && (
          <a
            href="/api/checkout?plan=studio"
            className="text-xs text-vermillion underline underline-offset-4 hover:text-vermillion-deep"
          >
            Upgrade for unlimited →
          </a>
        )}
      </div>
      <div className="mt-2 h-1 w-full bg-line">
        <div
          className={`h-1 ${warning || blocked ? "bg-vermillion" : "bg-moss"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
