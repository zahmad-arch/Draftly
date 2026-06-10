export type PlanId = "solo" | "studio" | "agency";

export interface Plan {
  id: PlanId;
  name: string;
  priceMonthly: number;
  tagline: string;
  features: string[];
  highlighted?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: "solo",
    name: "Solo",
    priceMonthly: 10,
    tagline: "For independent freelancers",
    features: [
      "30 proposals a month",
      "Tone & voice controls",
      "Copy-ready output",
      "Email support",
    ],
  },
  {
    id: "studio",
    name: "Studio",
    priceMonthly: 49,
    tagline: "For small studios & consultants",
    features: [
      "Unlimited proposals",
      "Pricing-table generator",
      "Reusable client profiles",
      "Priority support",
    ],
    highlighted: true,
  },
  {
    id: "agency",
    name: "Agency",
    priceMonthly: 129,
    tagline: "For teams that pitch weekly",
    features: [
      "Everything in Studio",
      "5 team seats",
      "Brand voice training",
      "Win-rate analytics",
      "Our most powerful AI model",
    ],
  },
];

export function getPlan(id: string): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}
