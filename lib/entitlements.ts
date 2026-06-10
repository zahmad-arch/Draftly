import type { PlanId } from "@/lib/plans";

export interface Entitlements {
  /** Proposals per calendar month; null = unlimited. Keep in sync with lib/plans.ts copy. */
  monthlyLimit: number | null;
  /** Line-item Investment table editor in the generator. */
  pricingTables: boolean;
  /** Reusable client profiles. */
  clientProfiles: boolean;
  /** Brand voice training. */
  brandVoice: boolean;
  /** Win-rate analytics. */
  analytics: boolean;
  /** Total seats including the owner; 0 = no team feature. */
  teamSeats: number;
  /** Anthropic model used for drafting. */
  model: string;
}

export const ENTITLEMENTS: Record<PlanId, Entitlements> = {
  solo: {
    monthlyLimit: 30,
    pricingTables: false,
    clientProfiles: false,
    brandVoice: false,
    analytics: false,
    teamSeats: 0,
    model: "claude-sonnet-4-6",
  },
  studio: {
    monthlyLimit: null,
    pricingTables: true,
    clientProfiles: true,
    brandVoice: false,
    analytics: false,
    teamSeats: 0,
    model: "claude-sonnet-4-6",
  },
  agency: {
    monthlyLimit: null,
    pricingTables: true,
    clientProfiles: true,
    brandVoice: true,
    analytics: true,
    teamSeats: 5,
    model: "claude-opus-4-8",
  },
};

/** Unknown/legacy plan strings resolve to the most restrictive tier. */
export function entitlementsFor(plan: string | null | undefined): Entitlements {
  return ENTITLEMENTS[(plan ?? "") as PlanId] ?? ENTITLEMENTS.solo;
}

export type Feature = "pricingTables" | "clientProfiles" | "brandVoice" | "analytics" | "team";

/** The cheapest plan that includes a feature, for upsell copy and links. */
export function requiredPlanFor(feature: Feature): PlanId {
  switch (feature) {
    case "pricingTables":
    case "clientProfiles":
      return "studio";
    case "brandVoice":
    case "analytics":
    case "team":
      return "agency";
  }
}

/** Centralised so upgrades can later move to the Stripe portal in one place. */
export function upgradeHref(plan: PlanId): string {
  return `/api/checkout?plan=${plan}`;
}
