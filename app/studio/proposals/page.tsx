import { redirect } from "next/navigation";
import { getStudioContext } from "@/lib/studio/context";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "../empty-state";
import { ProposalsList, type ProposalRow } from "./proposals-list";

export const metadata = { title: "Proposals — Draftly" };

export default async function ProposalsPage() {
  const ctx = await getStudioContext();
  if (ctx.kind === "demo") redirect("/studio");
  if (ctx.kind === "unauthenticated") redirect("/login?next=/studio/proposals");
  if (ctx.kind === "unsubscribed") redirect("/#pricing");

  const { access } = ctx;
  const supabase = await createClient();
  const { data: proposals } = await supabase
    .from("proposals")
    .select("id, client_name, title, status, value, created_at")
    .eq("account_id", access.accountId)
    .order("created_at", { ascending: false })
    .limit(100);

  const ent = access.entitlements;
  const usageLine =
    ent.monthlyLimit !== null
      ? `${access.usedThisMonth} of ${ent.monthlyLimit} proposals used this month`
      : `${proposals?.length ?? 0} proposal${(proposals?.length ?? 0) === 1 ? "" : "s"}`;

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <p className="eyebrow text-vermillion">The record</p>
      <h1 className="mt-3 font-display text-3xl font-medium tracking-tight">Proposals</h1>
      <p className="mt-1 text-sm text-ink-soft">{usageLine}</p>

      <div className="mt-8">
        {proposals && proposals.length > 0 ? (
          <ProposalsList proposals={proposals as ProposalRow[]} />
        ) : (
          <div className="border border-line bg-cream">
            <EmptyState
              message="No proposals yet. Your first draft is ninety seconds away."
              actionHref="/studio"
              actionLabel="Open the generator →"
            />
          </div>
        )}
      </div>
    </div>
  );
}
