"use client";

export interface PricingItemDraft {
  item: string;
  qty: string;
  price: string;
}

function parseMoney(s: string): number {
  const n = parseFloat(s.replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function computeTotal(items: PricingItemDraft[]): number {
  return items.reduce((sum, it) => {
    const qty = parseFloat(it.qty) || 1;
    return sum + parseMoney(it.price) * qty;
  }, 0);
}

export function PricingItems({
  items,
  onChange,
  expanded,
  onToggle,
}: {
  items: PricingItemDraft[];
  onChange: (items: PricingItemDraft[]) => void;
  expanded: boolean;
  onToggle: () => void;
}) {
  if (!expanded) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="mt-5 cursor-pointer text-sm text-ink-soft underline underline-offset-4 hover:text-ink"
      >
        + Add pricing items
      </button>
    );
  }

  const total = computeTotal(items);

  function update(i: number, field: keyof PricingItemDraft, value: string) {
    const next = items.slice();
    next[i] = { ...next[i], [field]: value };
    onChange(next);
  }

  return (
    <div className="mt-5">
      <div className="flex items-baseline justify-between">
        <span className="eyebrow text-ink-soft">Pricing items</span>
        <button
          type="button"
          onClick={() => onChange([...items, { item: "", qty: "1", price: "" }])}
          className="cursor-pointer text-xs text-ink-soft underline underline-offset-4 hover:text-ink"
        >
          + Add line
        </button>
      </div>
      <div className="mt-2 space-y-2">
        {items.map((it, i) => (
          <div key={i} className="grid grid-cols-[1fr_56px_96px_24px] gap-2">
            <input
              value={it.item}
              onChange={(e) => update(i, "item", e.target.value)}
              placeholder="Design & build"
              className="border border-line bg-paper px-2.5 py-2 text-sm outline-none placeholder:text-ink-soft/50 focus:border-ink"
            />
            <input
              value={it.qty}
              onChange={(e) => update(i, "qty", e.target.value)}
              placeholder="1"
              className="border border-line bg-paper px-2.5 py-2 text-sm outline-none placeholder:text-ink-soft/50 focus:border-ink"
            />
            <input
              value={it.price}
              onChange={(e) => update(i, "price", e.target.value)}
              placeholder="$4,500"
              className="border border-line bg-paper px-2.5 py-2 text-sm outline-none placeholder:text-ink-soft/50 focus:border-ink"
            />
            <button
              type="button"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              aria-label="Remove line"
              className="cursor-pointer text-ink-soft hover:text-vermillion-deep"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      {items.length > 0 && (
        <div className="mt-3 flex items-baseline justify-between border-t border-line pt-2">
          <span className="eyebrow text-ink-soft">Total</span>
          <span className="font-display text-lg font-semibold">
            ${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        </div>
      )}
    </div>
  );
}
