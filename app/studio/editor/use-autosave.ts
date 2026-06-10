"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

const DEBOUNCE_MS = 1200;
const RETRY_MS = 5000;

/**
 * Debounced autosave of proposal content. Single-flight with latest-wins:
 * edits during an in-flight save trigger one follow-up save. One automatic
 * retry on failure, then surfaces an error state for manual retry.
 */
export function useAutosave(proposalId: string | null, getText: () => string) {
  const [state, setState] = useState<SaveState>("idle");
  const stateRef = useRef(state);
  stateRef.current = state;

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflight = useRef<Promise<boolean> | null>(null);
  const dirtyAgain = useRef(false);
  const retried = useRef(false);

  const doSave = useCallback(async (): Promise<boolean> => {
    if (!proposalId) return true;
    if (inflight.current) {
      dirtyAgain.current = true;
      return inflight.current;
    }
    setState("saving");
    const run = (async () => {
      try {
        const res = await fetch(`/api/proposals/${proposalId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: getText() }),
        });
        if (!res.ok) throw new Error(String(res.status));
        retried.current = false;
        return true;
      } catch {
        return false;
      } finally {
        inflight.current = null;
      }
    })();
    inflight.current = run;
    const ok = await run;

    if (dirtyAgain.current) {
      dirtyAgain.current = false;
      return doSave();
    }
    if (ok) {
      setState("saved");
      return true;
    }
    if (!retried.current) {
      retried.current = true;
      retryTimer.current = setTimeout(() => void doSave(), RETRY_MS);
      return false;
    }
    setState("error");
    return false;
  }, [proposalId, getText]);

  const markDirty = useCallback(() => {
    if (!proposalId) return;
    setState("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void doSave(), DEBOUNCE_MS);
  }, [proposalId, doSave]);

  const flush = useCallback(async (): Promise<boolean> => {
    if (!proposalId) return true;
    if (timer.current) clearTimeout(timer.current);
    if (retryTimer.current) clearTimeout(retryTimer.current);
    if (stateRef.current === "dirty" || stateRef.current === "error") {
      retried.current = false;
      return doSave();
    }
    if (inflight.current) return inflight.current;
    return true;
  }, [proposalId, doSave]);

  // Warn on close with unsaved changes; best-effort keepalive save on hide.
  useEffect(() => {
    if (!proposalId) return;

    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (stateRef.current === "dirty" || stateRef.current === "saving") {
        e.preventDefault();
      }
    }
    function onPageHide() {
      if (stateRef.current === "dirty") {
        try {
          fetch(`/api/proposals/${proposalId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: getText() }),
            keepalive: true,
          });
        } catch {
          // best effort only
        }
      }
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("pagehide", onPageHide);
      if (timer.current) clearTimeout(timer.current);
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, [proposalId, getText]);

  return { state, markDirty, flush };
}
