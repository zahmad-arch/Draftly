import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getStudioContext } from "@/lib/studio/context";
import { createClient } from "@/lib/supabase/server";
import type { ProposalStatus } from "../../status-stamp";
import { EditorPanel } from "./editor-panel";

export default async function ProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getStudioContext();
  if (ctx.kind === "demo") redirect("/studio");
  if (ctx.kind === "unauthenticated") redirect("/login?next=/studio/proposals");
  if (ctx.kind === "unsubscribed") redirect("/#pricing");

  const { id } = await params;
  const supabase = await createClient();
  const { data: proposal } = await supabase
    .from("proposals")
    .select("id, client_name, title, content, status, value, created_at, model")
    .eq("id", id)
    .maybeSingle();

  if (!proposal) notFound();

  const status = proposal.status as ProposalStatus;

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div>
        <Link
          href="/studio/proposals"
          className="text-sm text-ink-soft underline underline-offset-4 hover:text-ink"
        >
          ← All proposals
        </Link>
        <h1 className="mt-3 font-display text-3xl font-medium tracking-tight">
          {proposal.title || "Untitled proposal"}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          {new Date(proposal.created_at).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
          {proposal.status === "won" && proposal.value != null
            ? ` · won at $${Number(proposal.value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
            : ""}
        </p>
      </div>

      <EditorPanel
        proposalId={proposal.id}
        initialContent={proposal.content ?? ""}
        status={status}
      />
    </div>
  );
}
