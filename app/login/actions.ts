"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrigin } from "@/lib/url";

/** Where to send the user after successful auth. Resuming checkout takes priority. */
function resolveNext(next: string, plan: string): string {
  if (plan) return `/api/checkout?plan=${encodeURIComponent(plan)}`;
  if (next && next.startsWith("/")) return next;
  return "/studio";
}

function backToLogin(params: Record<string, string>): never {
  const qs = new URLSearchParams(params).toString();
  redirect(`/login?${qs}`);
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");
  const plan = String(formData.get("plan") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    backToLogin({ error: error.message, mode: "signin", next, plan });
  }
  redirect(resolveNext(next, plan));
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");
  const plan = String(formData.get("plan") ?? "");

  const origin = await getOrigin();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(
        resolveNext(next, plan),
      )}`,
    },
  });

  if (error) {
    backToLogin({ error: error.message, mode: "signup", next, plan });
  }

  // If email confirmation is disabled in Supabase, a session is returned and the
  // user is signed in immediately. Otherwise they must confirm via email first.
  if (data.session) {
    redirect(resolveNext(next, plan));
  }
  backToLogin({
    message: "Check your email to confirm your account, then sign in.",
    mode: "signin",
    next,
    plan,
  });
}
