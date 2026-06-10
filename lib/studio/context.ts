import { cache } from "react";
import { resolveAccess, type AccessResult } from "@/lib/access";

/**
 * Request-deduped access resolution for the studio layout and pages.
 * The layout renders the shell from this; each page enforces the
 * subscription itself (the generator page additionally runs the Stripe
 * checkout-session reconcile, which needs searchParams a layout can't read).
 */
export const getStudioContext = cache(async (): Promise<AccessResult> => {
  return resolveAccess();
});
