import Link from "next/link";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { AuthForm } from "./auth-form";

export const metadata = {
  title: "Sign in · Draftly",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string;
    plan?: string;
    message?: string;
    error?: string;
    mode?: string;
  }>;
}) {
  const params = await searchParams;
  const next = params.next ?? "";
  const plan = params.plan ?? "";

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect(next.startsWith("/") ? next : "/studio");
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="font-display text-2xl font-semibold tracking-tight"
        >
          Draftly<span className="text-vermillion">.</span>
        </Link>

        <h1 className="mt-8 font-display text-3xl font-medium tracking-tight">
          {plan ? "Almost there." : "Welcome back."}
        </h1>
        <p className="mt-2 text-ink-soft">
          {plan
            ? "Create your account or sign in to start your free trial."
            : "Sign in to open your studio."}
        </p>

        {!isSupabaseConfigured() ? (
          <p className="mt-8 border border-line bg-cream p-4 text-sm text-ink-soft">
            Accounts aren&apos;t enabled yet. Set the Supabase environment
            variables to turn on sign-in.
          </p>
        ) : (
          <>
            {params.message && (
              <p className="mt-6 border-l-2 border-moss bg-cream py-2 pl-3 text-sm text-moss">
                {params.message}
              </p>
            )}
            {params.error && (
              <p className="mt-6 border-l-2 border-vermillion bg-cream py-2 pl-3 text-sm text-vermillion-deep">
                {params.error}
              </p>
            )}
            <AuthForm
              next={next}
              plan={plan}
              initialMode={params.mode === "signup" ? "signup" : "signin"}
            />
          </>
        )}
      </div>
    </main>
  );
}
