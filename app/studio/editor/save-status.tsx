"use client";

import type { SaveState } from "./use-autosave";

export function SaveStatus({ state, onRetry }: { state: SaveState; onRetry?: () => void }) {
  if (state === "idle") return null;
  if (state === "error") {
    return (
      <span className="eyebrow text-vermillion-deep">
        Save failed ·{" "}
        <button
          onClick={onRetry}
          className="cursor-pointer underline underline-offset-4"
        >
          Retry
        </button>
      </span>
    );
  }
  if (state === "saving" || state === "dirty") {
    return <span className="eyebrow text-ink-soft transition-opacity duration-300">Saving…</span>;
  }
  return <span className="eyebrow text-moss transition-opacity duration-300">Saved ✓</span>;
}
