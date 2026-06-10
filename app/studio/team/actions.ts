"use server";

import { revalidatePath } from "next/cache";
import { resolveAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { ok: true } | { ok: false; error: string };

async function requireTeamOwner() {
  const res = await resolveAccess();
  if (res.kind !== "ok") return null;
  if (res.access.entitlements.teamSeats === 0) return null;
  if (res.access.via !== "subscription") return null; // only the owner manages seats
  return res.access;
}

export async function inviteTeamMember(emailRaw: string): Promise<ActionResult> {
  const access = await requireTeamOwner();
  if (!access) return { ok: false, error: "Only the Agency account owner can invite teammates." };

  const email = emailRaw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (access.email && email === access.email.toLowerCase()) {
    return { ok: false, error: "That's your own email — you already have a seat." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("team_members").insert({
    account_id: access.accountId,
    invited_email: email,
  });

  if (error) {
    if (error.message.includes("TEAM_SEAT_LIMIT")) {
      return {
        ok: false,
        error: "All 5 seats are filled. Remove a member to invite another.",
      };
    }
    if (error.code === "23505") {
      return { ok: false, error: "That email is already invited." };
    }
    return { ok: false, error: "Couldn't send the invite. Try again." };
  }

  revalidatePath("/studio/team");
  return { ok: true };
}

export async function removeTeamMember(memberId: string): Promise<ActionResult> {
  const res = await resolveAccess();
  if (res.kind !== "ok") return { ok: false, error: "Sign in required." };

  // RLS allows: owner removes anyone; a member removes their own row.
  const supabase = await createClient();
  const { error } = await supabase.from("team_members").delete().eq("id", memberId);
  if (error) return { ok: false, error: "Couldn't remove that member. Try again." };

  revalidatePath("/studio/team");
  return { ok: true };
}
