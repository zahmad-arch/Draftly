import { redirect } from "next/navigation";
import { getStudioContext } from "@/lib/studio/context";
import { createClient } from "@/lib/supabase/server";
import { GhostBars, LockedPanel } from "../locked";
import { VoiceForm } from "./voice-form";

export const metadata = { title: "Brand voice · Draftly" };

export default async function VoicePage() {
  const ctx = await getStudioContext();
  if (ctx.kind === "demo") redirect("/studio");
  if (ctx.kind === "unauthenticated") redirect("/login?next=/studio/voice");
  if (ctx.kind === "unsubscribed") redirect("/#pricing");

  const { access } = ctx;

  if (!access.entitlements.brandVoice) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-12">
        <LockedPanel
          feature="brandVoice"
          headline="Every proposal, unmistakably yours."
          sell="Describe how your studio writes and paste a sample. Draftly matches your voice, cadence, and vocabulary on every draft your team sends."
          ghost={
            <div className="max-w-md border-l-2 border-line pl-4">
              <GhostBars widths={[95, 88, 70]} />
            </div>
          }
        />
      </div>
    );
  }

  const supabase = await createClient();
  const { data: voice } = await supabase
    .from("brand_voices")
    .select("voice_name, description, writing_sample, updated_at")
    .eq("account_id", access.accountId)
    .maybeSingle();

  const isOwner = access.via === "subscription";

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <p className="eyebrow text-vermillion">The signature</p>
      <h1 className="mt-3 font-display text-3xl font-medium tracking-tight">Brand voice</h1>

      <div className="mt-8 grid gap-10 lg:grid-cols-2">
        <VoiceForm
          initial={{
            voiceName: voice?.voice_name ?? "",
            description: voice?.description ?? "",
            writingSample: voice?.writing_sample ?? "",
          }}
          readOnly={!isOwner}
        />

        <div className="self-start border border-line bg-cream p-7">
          <p className="eyebrow text-ink-soft">How it shapes your drafts</p>
          <div className="mt-5 space-y-6">
            <div>
              <p className="eyebrow text-ink-soft/70">Without voice</p>
              <p className="mt-2 border-l-2 border-line py-1 pl-3 text-sm text-ink-soft italic">
                We are pleased to submit this proposal for your consideration and look forward
                to the opportunity to work together.
              </p>
            </div>
            <div>
              <p className="eyebrow text-ink-soft/70">With your voice</p>
              <p className="mt-2 border-l-2 border-vermillion py-1 pl-3 text-sm text-ink-soft italic">
                You need this live before the spring launch. Here&apos;s exactly how we get
                there, week by week.
              </p>
            </div>
          </div>
          <p className="mt-6 border-t border-line pt-4 text-sm leading-relaxed text-ink-soft">
            Applied to every proposal your team drafts. The generator shows{" "}
            <span className="text-moss">✳ Brand voice active</span> when it&apos;s on.
          </p>
        </div>
      </div>
    </div>
  );
}
