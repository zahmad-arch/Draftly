import Link from "next/link";

export function EmptyState({
  glyph = "¶",
  message,
  actionHref,
  actionLabel,
}: {
  glyph?: string;
  message: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="font-display text-6xl text-line">{glyph}</p>
      <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-soft">{message}</p>
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="mt-5 text-sm text-vermillion underline underline-offset-4 hover:text-vermillion-deep"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
