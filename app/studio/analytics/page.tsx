import Link from "next/link";
import { redirect } from "next/navigation";
import { getStudioContext } from "@/lib/studio/context";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "../empty-state";
import { GhostBars, LockedPanel } from "../locked";
import { StatusStamp, type ProposalStatus } from "../status-stamp";

export const metadata = { title: "Analytics — Draftly" };

interface MonthStat {
  month: string;
  drafted: number;
  sent: number;
  won: number;
  lost: number;
  won_value: number;
}

export default async function AnalyticsPage() {
  const ctx = await getStudioContext();
  if (ctx.kind === "demo") redirect("/studio");
  if (ctx.kind === "unauthenticated") redirect("/login?next=/studio/analytics");
  if (ctx.kind === "unsubscribed") redirect("/#pricing");

  const { access } = ctx;

  if (!access.entitlements.analytics) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-12">
        <LockedPanel
          feature="analytics"
          headline="Know exactly which proposals win."
          sell="Win rate, value won, and trends over time — mark proposals won or lost and Draftly shows you what's working."
          ghost={
            <div className="grid max-w-lg gap-10 sm:grid-cols-3">
              {["—%", "—", "$—"].map((s, i) => (
                <div key={i}>
                  <p className="font-display text-5xl font-medium text-line">{s}</p>
                  <div className="mt-3">
                    <GhostBars widths={[80]} />
                  </div>
                </div>
              ))}
            </div>
          }
        />
      </div>
    );
  }

  const supabase = await createClient();
  const [statsRes, recentRes] = await Promise.all([
    supabase.rpc("proposal_stats", { p_account_id: access.accountId }),
    supabase
      .from("proposals")
      .select("id, client_name, title, status, value, created_at")
      .eq("account_id", access.accountId)
      .neq("status", "draft")
      .order("updated_at", { ascending: false })
      .limit(10),
  ]);

  const months = ((statsRes.data as MonthStat[] | null) ?? []).slice().reverse();
  const totals = months.reduce(
    (acc, m) => ({
      sent: acc.sent + m.sent,
      won: acc.won + m.won,
      lost: acc.lost + m.lost,
      value: acc.value + Number(m.won_value),
    }),
    { sent: 0, won: 0, lost: 0, value: 0 },
  );
  const decided = totals.won + totals.lost;
  const winRate = decided > 0 ? Math.round((totals.won / decided) * 100) : null;
  const recent = recentRes.data ?? [];
  const lastSix = months.slice(-6);
  const maxSent = Math.max(...lastSix.map((m) => m.sent), 1);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <p className="eyebrow text-vermillion">The scoreboard</p>
      <h1 className="mt-3 font-display text-3xl font-medium tracking-tight">Win-rate analytics</h1>

      {totals.sent === 0 ? (
        <div className="mt-8 border border-line bg-cream">
          <EmptyState
            glyph="№"
            message="Nothing to count yet. Mark proposals sent, won, or lost in History and your scoreboard fills in."
            actionHref="/studio/proposals"
            actionLabel="Go to History →"
          />
        </div>
      ) : (
        <>
          {/* Stats band */}
          <div className="mt-8 grid gap-10 border border-line bg-moss p-10 text-cream md:grid-cols-3">
            <div>
              <p className="font-display text-5xl font-medium tracking-tight">
                {winRate !== null ? `${winRate}%` : "—"}
              </p>
              <p className="mt-3 leading-relaxed text-cream/75">
                win rate across {decided} decided proposal{decided === 1 ? "" : "s"}
              </p>
            </div>
            <div>
              <p className="font-display text-5xl font-medium tracking-tight">{totals.sent}</p>
              <p className="mt-3 leading-relaxed text-cream/75">proposals sent</p>
            </div>
            <div>
              <p className="font-display text-5xl font-medium tracking-tight">
                ${totals.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              <p className="mt-3 leading-relaxed text-cream/75">value won</p>
            </div>
          </div>

          {/* Trend */}
          {lastSix.length > 1 && (
            <div className="mt-10">
              <p className="eyebrow text-ink-soft">Last {lastSix.length} months</p>
              <div className="mt-4 flex h-40 items-end gap-6 border-b border-line">
                {lastSix.map((m) => (
                  <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex w-full items-end justify-center gap-1.5">
                      <div
                        className="w-4 bg-line"
                        style={{ height: `${(m.sent / maxSent) * 130}px` }}
                        title={`${m.sent} sent`}
                      />
                      <div
                        className="w-4 bg-moss"
                        style={{ height: `${(m.won / maxSent) * 130}px` }}
                        title={`${m.won} won`}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex gap-6">
                {lastSix.map((m) => (
                  <p key={m.month} className="eyebrow flex-1 text-center text-ink-soft/70">
                    {new Date(m.month + "T00:00:00").toLocaleDateString(undefined, {
                      month: "short",
                    })}
                  </p>
                ))}
              </div>
              <p className="eyebrow mt-3 text-ink-soft/70">
                <span className="text-moss">✳</span> won · <span>sent</span>
              </p>
            </div>
          )}

          {/* Recent outcomes */}
          {recent.length > 0 && (
            <div className="mt-10">
              <p className="eyebrow text-ink-soft">Recent outcomes</p>
              <div className="mt-3 border-t border-line">
                {recent.map((p) => (
                  <Link
                    key={p.id}
                    href={`/studio/proposals/${p.id}`}
                    className="grid items-baseline gap-x-4 border-b border-line py-3 transition-colors hover:bg-cream sm:grid-cols-[1.5fr_auto_auto_auto]"
                  >
                    <span className="font-display font-medium">
                      {p.title || p.client_name || "Untitled proposal"}
                    </span>
                    <span className="text-sm text-ink-soft">
                      {new Date(p.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span className="text-sm font-medium">
                      {p.status === "won" && p.value != null
                        ? `$${Number(p.value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                        : ""}
                    </span>
                    <StatusStamp status={p.status as ProposalStatus} />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {decided < 5 && (
            <p className="mt-8 text-sm text-ink-soft">
              Mark more proposals won or lost in{" "}
              <Link href="/studio/proposals" className="underline underline-offset-4">
                History
              </Link>{" "}
              to sharpen this picture.
            </p>
          )}
        </>
      )}
    </div>
  );
}
