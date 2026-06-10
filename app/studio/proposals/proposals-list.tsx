"use client";

import Link from "next/link";
import { useState } from "react";
import { StatusStamp, type ProposalStatus } from "../status-stamp";

export interface ProposalRow {
  id: string;
  client_name: string | null;
  title: string | null;
  status: ProposalStatus;
  value: number | null;
  created_at: string;
}

export function ProposalsList({ proposals: initial }: { proposals: ProposalRow[] }) {
  const [proposals, setProposals] = useState(initial);
  const [editing, setEditing] = useState<string | null>(null);
  const [valueDraft, setValueDraft] = useState("");
  const [pendingWon, setPendingWon] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function patch(id: string, body: { status?: ProposalStatus; value?: number | null }) {
    setError("");
    const res = await fetch(`/api/proposals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      setError("Couldn't update that proposal. Try again.");
      return false;
    }
    setProposals((list) =>
      list.map((p) =>
        p.id === id
          ? { ...p, ...(body.status ? { status: body.status } : {}), ...(body.value !== undefined ? { value: body.value } : {}) }
          : p,
      ),
    );
    return true;
  }

  async function setStatus(id: string, status: ProposalStatus) {
    if (status === "won") {
      setPendingWon(id);
      setValueDraft("");
      return;
    }
    setPendingWon(null);
    await patch(id, { status });
    setEditing(null);
  }

  async function confirmWon(id: string) {
    const cleaned = valueDraft.replace(/[$,\s]/g, "");
    const value = cleaned ? parseFloat(cleaned) : null;
    const ok = await patch(id, {
      status: "won",
      value: value !== null && Number.isFinite(value) && value >= 0 ? value : null,
    });
    if (ok) {
      setPendingWon(null);
      setEditing(null);
    }
  }

  return (
    <div className="border-t border-line">
      {error && <p className="py-3 text-sm text-vermillion-deep">{error}</p>}
      {proposals.map((p) => (
        <div
          key={p.id}
          className="grid items-baseline gap-x-4 gap-y-2 border-b border-line py-4 sm:grid-cols-[1.5fr_auto_auto_auto_auto]"
        >
          <Link
            href={`/studio/proposals/${p.id}`}
            className="font-display text-lg font-medium hover:text-vermillion-deep"
          >
            {p.title || p.client_name || "Untitled proposal"}
          </Link>
          <span className="text-sm text-ink-soft">
            {new Date(p.created_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </span>
          <span className="text-sm font-medium">
            {p.status === "won" && p.value != null
              ? `$${Number(p.value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
              : ""}
          </span>

          {editing === p.id ? (
            pendingWon === p.id ? (
              <span className="flex items-center gap-2">
                <input
                  autoFocus
                  value={valueDraft}
                  onChange={(e) => setValueDraft(e.target.value)}
                  placeholder="$12,400"
                  className="w-24 border border-line bg-paper px-2 py-1 text-xs outline-none focus:border-ink"
                  onKeyDown={(e) => e.key === "Enter" && confirmWon(p.id)}
                />
                <button
                  onClick={() => confirmWon(p.id)}
                  className="cursor-pointer border-2 border-moss px-2 py-0.5 text-[0.65rem] font-bold tracking-[0.18em] text-moss uppercase"
                >
                  Won ✓
                </button>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                {(["sent", "won", "lost"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(p.id, s)}
                    className={`cursor-pointer px-2 py-0.5 text-[0.65rem] tracking-[0.18em] uppercase ${
                      s === "won"
                        ? "border-2 border-moss font-bold text-moss"
                        : s === "lost"
                          ? "border border-line text-ink-soft"
                          : "border border-ink text-ink"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </span>
            )
          ) : (
            <button
              onClick={() => {
                setEditing(p.id);
                setPendingWon(null);
              }}
              className="cursor-pointer text-left"
              title="Change status"
            >
              <StatusStamp status={p.status} />
            </button>
          )}

          <Link
            href={`/studio/proposals/${p.id}`}
            className="text-sm text-ink-soft underline underline-offset-4 hover:text-ink"
          >
            Open
          </Link>
        </div>
      ))}
    </div>
  );
}
