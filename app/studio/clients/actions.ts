"use server";

import { revalidatePath } from "next/cache";
import { resolveAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

export interface ClientProfileInput {
  name: string;
  businessContext?: string;
  defaultBudget?: string;
  defaultTone?: string;
  notes?: string;
}

type ActionResult = { ok: true } | { ok: false; error: string };

async function requireClientProfiles() {
  const res = await resolveAccess();
  if (res.kind !== "ok") return null;
  if (!res.access.entitlements.clientProfiles) return null;
  return res.access;
}

export async function createClientProfile(input: ClientProfileInput): Promise<ActionResult> {
  const access = await requireClientProfiles();
  if (!access) return { ok: false, error: "Client profiles require the Studio plan." };

  const name = (input.name ?? "").trim();
  if (!name) return { ok: false, error: "Client name is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("client_profiles").insert({
    account_id: access.accountId,
    created_by: access.userId,
    name: name.slice(0, 200),
    business_context: input.businessContext?.slice(0, 2000) || null,
    default_budget: input.defaultBudget?.slice(0, 100) || null,
    default_tone: input.defaultTone?.slice(0, 100) || null,
    notes: input.notes?.slice(0, 2000) || null,
  });
  if (error) return { ok: false, error: "Couldn't save the profile. Try again." };

  revalidatePath("/studio/clients");
  revalidatePath("/studio");
  return { ok: true };
}

export async function updateClientProfile(
  id: string,
  input: ClientProfileInput,
): Promise<ActionResult> {
  const access = await requireClientProfiles();
  if (!access) return { ok: false, error: "Client profiles require the Studio plan." };

  const name = (input.name ?? "").trim();
  if (!name) return { ok: false, error: "Client name is required." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("client_profiles")
    .update({
      name: name.slice(0, 200),
      business_context: input.businessContext?.slice(0, 2000) || null,
      default_budget: input.defaultBudget?.slice(0, 100) || null,
      default_tone: input.defaultTone?.slice(0, 100) || null,
      notes: input.notes?.slice(0, 2000) || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false, error: "Couldn't update the profile. Try again." };

  revalidatePath("/studio/clients");
  revalidatePath("/studio");
  return { ok: true };
}

export async function deleteClientProfile(id: string): Promise<ActionResult> {
  const access = await requireClientProfiles();
  if (!access) return { ok: false, error: "Client profiles require the Studio plan." };

  const supabase = await createClient();
  const { error } = await supabase.from("client_profiles").delete().eq("id", id);
  if (error) return { ok: false, error: "Couldn't delete the profile. Try again." };

  revalidatePath("/studio/clients");
  revalidatePath("/studio");
  return { ok: true };
}
