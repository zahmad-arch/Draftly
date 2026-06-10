import { redirect } from "next/navigation";
import { getStudioContext } from "@/lib/studio/context";
import { createClient } from "@/lib/supabase/server";
import { GhostBars, LockedPanel } from "../locked";
import { ClientsManager, type ClientProfileRow } from "./clients-manager";

export const metadata = { title: "Clients · Draftly" };

export default async function ClientsPage() {
  const ctx = await getStudioContext();
  if (ctx.kind === "demo") redirect("/studio");
  if (ctx.kind === "unauthenticated") redirect("/login?next=/studio/clients");
  if (ctx.kind === "unsubscribed") redirect("/#pricing");

  const { access } = ctx;

  if (!access.entitlements.clientProfiles) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-12">
        <LockedPanel
          feature="clientProfiles"
          headline="Stop re-typing the same client brief."
          sell="Save each client's business context, default budget, and tone once. Load it into the generator with one click and every proposal starts warm."
          ghost={
            <div className="grid gap-px border border-line bg-line sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="bg-paper p-6">
                  <GhostBars widths={[60, 90, 45]} />
                </div>
              ))}
            </div>
          }
        />
      </div>
    );
  }

  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("client_profiles")
    .select("id, name, business_context, default_budget, default_tone, notes, updated_at")
    .eq("account_id", access.accountId)
    .order("name");

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <ClientsManager profiles={(profiles as ClientProfileRow[] | null) ?? []} />
    </div>
  );
}
