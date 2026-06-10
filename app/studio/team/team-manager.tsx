"use client";

import { useState, useTransition } from "react";
import { inviteTeamMember, removeTeamMember } from "./actions";

export interface TeamMemberRow {
  id: string;
  invited_email: string;
  user_id: string | null;
  invited_at: string;
  claimed_at: string | null;
}

export function TeamManager({
  members,
  seats,
  ownerEmail,
  isOwner,
  selfUserId,
}: {
  members: TeamMemberRow[];
  seats: number;
  ownerEmail: string | null;
  isOwner: boolean;
  selfUserId: string;
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const seatsUsed = members.length + 1; // owner always occupies seat one
  const full = seatsUsed >= seats;

  function invite(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await inviteTeamMember(email);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEmail("");
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await removeTeamMember(id);
      if (!result.ok) setError(result.error);
      setConfirmRemove(null);
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <p className="eyebrow text-vermillion">The roster</p>
          <h1 className="mt-3 font-display text-3xl font-medium tracking-tight">Team</h1>
        </div>
        <p className="font-display text-2xl font-medium">
          {seatsUsed} <span className="text-ink-soft">of {seats} seats</span>
        </p>
      </div>

      {isOwner &&
        (full ? (
          <p className="mt-6 border-l-2 border-line py-1 pl-3 text-sm text-ink-soft">
            All {seats} seats are filled. Remove a member to invite another.
          </p>
        ) : (
          <form onSubmit={invite} className="mt-6">
            <div className="flex max-w-md gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teammate@studio.com"
                className="flex-1 border border-line bg-paper px-3.5 py-2.5 outline-none placeholder:text-ink-soft/50 focus:border-ink"
              />
              <button
                type="submit"
                disabled={pending}
                className="cursor-pointer border border-ink bg-ink px-5 py-2.5 text-sm font-medium text-cream transition-colors hover:bg-vermillion hover:border-vermillion disabled:opacity-60"
              >
                {pending ? "Inviting…" : "Invite →"}
              </button>
            </div>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
              No invitation email is sent — your teammate gets access the moment they sign in
              to Draftly with this address.
            </p>
          </form>
        ))}

      {error && <p className="mt-4 text-sm text-vermillion-deep">{error}</p>}

      <div className="mt-8 border-t border-line">
        {/* Owner row */}
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-line py-4">
          <span className="font-medium">{ownerEmail ?? "Account owner"}</span>
          <span className="eyebrow text-ink-soft">Owner</span>
        </div>

        {members.map((m) => {
          const claimed = Boolean(m.user_id);
          const isSelf = m.user_id === selfUserId;
          return (
            <div
              key={m.id}
              className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-line py-4"
            >
              <span className="font-medium">{m.invited_email}</span>
              <span className="eyebrow text-ink-soft">Member</span>
              {claimed ? (
                <span className="text-sm text-ink-soft">
                  joined{" "}
                  {new Date(m.claimed_at!).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              ) : (
                <span className="border border-dashed border-line px-2 py-0.5 text-xs text-ink-soft">
                  awaiting sign-in <span className="text-vermillion">✳</span>
                </span>
              )}
              {(isOwner || isSelf) && (
                <span className="ml-auto text-sm">
                  {confirmRemove === m.id ? (
                    <span className="text-ink-soft">
                      {isSelf && !isOwner ? "Leave team?" : "Remove?"}{" "}
                      <button
                        onClick={() => remove(m.id)}
                        className="cursor-pointer font-medium text-vermillion-deep underline underline-offset-4"
                      >
                        Yes
                      </button>{" "}
                      /{" "}
                      <button
                        onClick={() => setConfirmRemove(null)}
                        className="cursor-pointer underline underline-offset-4"
                      >
                        No
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setConfirmRemove(m.id)}
                      className="cursor-pointer text-ink-soft underline underline-offset-4 hover:text-vermillion-deep"
                    >
                      {isSelf && !isOwner ? "Leave" : "Remove"}
                    </button>
                  )}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
