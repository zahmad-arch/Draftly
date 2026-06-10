"use client";

import { useState } from "react";
import type { PlanId } from "@/lib/plans";

export function CheckoutButton({
  planId,
  highlighted,
}: {
  planId: PlanId;
  highlighted?: boolean;
}) {
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  async function checkout() {
    setState("loading");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      setMessage(data.error ?? "Checkout is unavailable right now.");
      setState("error");
    } catch {
      setMessage("Checkout is unavailable right now.");
      setState("error");
    }
  }

  return (
    <div className="mt-8">
      <button
        onClick={checkout}
        disabled={state === "loading"}
        className={`w-full cursor-pointer border px-5 py-3 text-sm font-medium transition-colors disabled:opacity-60 ${
          highlighted
            ? "border-vermillion bg-vermillion text-cream hover:bg-vermillion-deep hover:border-vermillion-deep"
            : "border-ink bg-ink text-cream hover:bg-vermillion hover:border-vermillion"
        }`}
      >
        {state === "loading" ? "Opening checkout…" : "Start free trial"}
      </button>
      {state === "error" && (
        <p className={`mt-2 text-xs ${highlighted ? "text-cream/70" : "text-ink-soft"}`}>{message}</p>
      )}
    </div>
  );
}
