"use server";

import { revalidatePath } from "next/cache";
import { resolveAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function saveBrandVoice(input: {
  voiceName: string;
  description: string;
  writingSample: string;
}): Promise<ActionResult> {
  const res = await resolveAccess();
  if (res.kind !== "ok" || !res.access.entitlements.brandVoice) {
    return { ok: false, error: "Brand voice requires the Agency plan." };
  }
  // Only the account owner may train the voice; members get read access.
  if (res.access.via !== "subscription") {
    return { ok: false, error: "Only the account owner can edit the brand voice." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("brand_voices").upsert({
    account_id: res.access.accountId,
    voice_name: input.voiceName.trim().slice(0, 100),
    description: input.description.trim().slice(0, 2000),
    writing_sample: input.writingSample.trim().slice(0, 8000),
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: "Couldn't save the voice. Try again." };

  revalidatePath("/studio/voice");
  revalidatePath("/studio");
  return { ok: true };
}
