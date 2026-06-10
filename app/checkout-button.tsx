import type { PlanId } from "@/lib/plans";

/**
 * Plain anchor (not next/link) so Next.js never prefetches it — prefetching a
 * checkout link would create phantom Stripe sessions. The route handles auth:
 * unauthenticated visitors are redirected to /login and bounced back to resume.
 */
export function CheckoutButton({
  planId,
  highlighted,
}: {
  planId: PlanId;
  highlighted?: boolean;
}) {
  return (
    <a
      href={`/api/checkout?plan=${planId}`}
      className={`mt-8 block w-full border px-5 py-3 text-center text-sm font-medium transition-colors ${
        highlighted
          ? "border-vermillion bg-vermillion text-cream hover:bg-vermillion-deep hover:border-vermillion-deep"
          : "border-ink bg-ink text-cream hover:bg-vermillion hover:border-vermillion"
      }`}
    >
      Start free trial
    </a>
  );
}
