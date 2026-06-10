import { redirect } from "next/navigation";
import { getStudioContext } from "@/lib/studio/context";
import { createClient } from "@/lib/supabase/server";
import { GhostBars, LockedPanel } from "../locked";
import { TeamManager, type TeamMemberRow } from "./team-manager";

export const metadata = { title: "Team · Draftly" };

export default async function TeamPage() {
  const ctx = await getStudioContext();
  if (ctx.kind === "demo") redirect("/studio");
  if (ctx.kind === "unauthenticated") redirect("/login?next=/studio/team");
  if (ctx.kind === "unsubscribed") redirect("/#pricing");

  const { access } = ctx;

  if (access.entitlements.teamSeats === 0) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-12">
        <LockedPanel
          feature="team"
          headline="Five seats. One studio."
          sell="Invite up to four teammates. Everyone drafts under your shared brand voice and client roster, and every proposal lands in one place."
          ghost={
            <div className="max-w-md space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 border-b border-line pb-3">
                  <div className="h-2 w-40 bg-line" />
                  <div className="ml-auto h-2 w-16 bg-line" />
                </div>
              ))}
            </div>
          }
        />
      </div>
    );
  }

  const supabase = await createClient();
  const { data: members } = await supabase
    .from("team_members")
    .select("id, invited_email, user_id, invited_at, claimed_at")
    .eq("account_id", access.accountId)
    .order("invited_at");

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <TeamManager
        members={(members as TeamMemberRow[] | null) ?? []}
        seats={access.entitlements.teamSeats}
        ownerEmail={access.via === "subscription" ? (access.email ?? "you") : null}
        isOwner={access.via === "subscription"}
        selfUserId={access.userId}
      />
    </div>
  );
}
