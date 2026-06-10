"use client";

import { useState } from "react";
import { signIn, signUp } from "./actions";

export function AuthForm({
  next,
  plan,
  initialMode,
}: {
  next: string;
  plan: string;
  initialMode: "signin" | "signup";
}) {
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const isSignin = mode === "signin";

  return (
    <form action={isSignin ? signIn : signUp} className="mt-8">
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="plan" value={plan} />

      <label className="block">
        <span className="eyebrow text-ink-soft">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@studio.com"
          className="mt-2 w-full border border-line bg-paper px-3.5 py-2.5 outline-none placeholder:text-ink-soft/50 focus:border-ink"
        />
      </label>

      <label className="mt-5 block">
        <span className="eyebrow text-ink-soft">Password</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={isSignin ? "current-password" : "new-password"}
          placeholder="At least 8 characters"
          className="mt-2 w-full border border-line bg-paper px-3.5 py-2.5 outline-none placeholder:text-ink-soft/50 focus:border-ink"
        />
      </label>

      <button
        type="submit"
        className="mt-7 w-full cursor-pointer border border-ink bg-ink px-6 py-3.5 font-medium text-cream transition-colors hover:bg-vermillion hover:border-vermillion"
      >
        {isSignin ? "Sign in →" : "Create account →"}
      </button>

      <p className="mt-5 text-center text-sm text-ink-soft">
        {isSignin ? "New to Draftly?" : "Already have an account?"}{" "}
        <button
          type="button"
          onClick={() => setMode(isSignin ? "signup" : "signin")}
          className="cursor-pointer font-medium text-vermillion underline underline-offset-4"
        >
          {isSignin ? "Create an account" : "Sign in"}
        </button>
      </p>
    </form>
  );
}
