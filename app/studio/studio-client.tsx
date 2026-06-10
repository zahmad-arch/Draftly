"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Document } from "./document";
import { LockedField } from "./locked";
import { PricingItems, type PricingItemDraft } from "./pricing-items";
import { UsageMeter } from "./usage-meter";
import { createClientProfile } from "./clients/actions";

const TONES = ["Confident & warm", "Formal & precise", "Friendly & casual", "Bold & direct"];

export interface ClientProfile {
  id: string;
  name: string;
  business_context: string | null;
  default_budget: string | null;
  default_tone: string | null;
  notes: string | null;
}

interface StudioClientProps {
  demo?: boolean;
  plan?: string;
  usage?: { used: number; limit: number } | null;
  profiles?: ClientProfile[];
  voiceName?: string | null;
  hasVoice?: boolean;
  canPricingTables?: boolean;
  canClientProfiles?: boolean;
  canBrandVoice?: boolean;
}

export function StudioClient({
  demo = false,
  usage: initialUsage = null,
  profiles = [],
  voiceName = null,
  hasVoice = false,
  canPricingTables = false,
  canClientProfiles = false,
  canBrandVoice = false,
}: StudioClientProps) {
  const [clientName, setClientName] = useState("");
  const [yourBusiness, setYourBusiness] = useState("");
  const [projectNotes, setProjectNotes] = useState("");
  const [budget, setBudget] = useState("");
  const [tone, setTone] = useState(TONES[0]);
  const [profileId, setProfileId] = useState("");

  const [pricingExpanded, setPricingExpanded] = useState(false);
  const [pricingItems, setPricingItems] = useState<PricingItemDraft[]>([]);

  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [welcome, setWelcome] = useState(false);
  const [usage, setUsage] = useState(initialUsage);
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [markedSent, setMarkedSent] = useState(false);
  const [savedProfile, setSavedProfile] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  const blocked = usage !== null && usage.used >= usage.limit;

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("welcome")) setWelcome(true);
  }, []);

  useEffect(() => {
    if (streaming && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [draft, streaming]);

  function loadProfile(id: string) {
    setProfileId(id);
    const p = profiles.find((x) => x.id === id);
    if (!p) return;
    setClientName(p.name);
    if (p.default_budget) setBudget(p.default_budget);
    if (p.default_tone && TONES.includes(p.default_tone)) setTone(p.default_tone);
  }

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setStreaming(true);
    setError("");
    setDraft("");
    setCopied(false);
    setProposalId(null);
    setMarkedSent(false);
    setSavedProfile(false);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName,
          yourBusiness,
          projectNotes,
          budget,
          tone,
          ...(profileId ? { clientProfileId: profileId } : {}),
          ...(pricingItems.length > 0
            ? { pricingItems: pricingItems.filter((p) => p.item.trim() && p.price.trim()) }
            : {}),
        }),
      });
      if (res.status === 401) throw new Error("Your session expired. Please sign in again.");
      if (res.status === 402)
        throw new Error("Your subscription is inactive. Renew it to keep drafting.");
      if (res.status === 429) {
        if (usage) setUsage({ ...usage, used: usage.limit });
        throw new Error("You've reached your monthly limit. Upgrade to Studio for unlimited drafting.");
      }
      if (!res.ok || !res.body) {
        throw new Error(`Generation failed (${res.status})`);
      }

      const pid = res.headers.get("X-Proposal-Id");
      if (pid) setProposalId(pid);
      const usedHeader = res.headers.get("X-Usage-Used");
      const limitHeader = res.headers.get("X-Usage-Limit");
      if (usedHeader && limitHeader) {
        setUsage({ used: Number(usedHeader), limit: Number(limitHeader) });
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setDraft((d) => d + decoder.decode(value, { stream: true }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setStreaming(false);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function markSent() {
    if (!proposalId) return;
    const res = await fetch(`/api/proposals/${proposalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "sent" }),
    });
    if (res.ok) setMarkedSent(true);
  }

  async function saveAsProfile() {
    const result = await createClientProfile({
      name: clientName,
      defaultBudget: budget,
      defaultTone: tone,
      notes: projectNotes.slice(0, 500),
    });
    if (result.ok) setSavedProfile(true);
  }

  const nextReset = (() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 1).toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
    });
  })();

  return (
    <>
      {welcome && (
        <div className="border-b border-line bg-moss px-6 py-3 text-center text-sm text-cream">
          Welcome aboard. Your trial is active. Draft your first proposal below. ✳
        </div>
      )}

      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 lg:grid-cols-[0.9fr_1.1fr]">
        {/* ── Input form ──────────────────────────── */}
        <form onSubmit={generate} className="self-start border border-line bg-cream p-7">
          <p className="eyebrow text-vermillion">The studio</p>
          <h1 className="mt-3 font-display text-3xl font-medium tracking-tight">
            Brief in. Proposal out.
          </h1>

          {usage && <UsageMeter used={usage.used} limit={usage.limit} />}

          <label className="mt-7 block">
            <span className="flex items-baseline justify-between">
              <span className="eyebrow text-ink-soft">Client</span>
              {canClientProfiles && profiles.length > 0 && (
                <select
                  value={profileId}
                  onChange={(e) => loadProfile(e.target.value)}
                  className="cursor-pointer border border-line bg-paper px-2 py-1 text-xs text-ink-soft outline-none focus:border-ink"
                >
                  <option value="">Load saved client…</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
              {!canClientProfiles && !demo && (
                <a
                  href="/api/checkout?plan=studio"
                  className="text-xs text-ink-soft/60 hover:text-ink-soft"
                  title="Included in Studio"
                >
                  Saved clients · Studio <span className="text-vermillion">✳</span>
                </a>
              )}
            </span>
            <input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Hartline Coffee Co."
              className="mt-2 w-full border border-line bg-paper px-3.5 py-2.5 outline-none placeholder:text-ink-soft/50 focus:border-ink"
            />
          </label>

          <label className="mt-5 block">
            <span className="eyebrow text-ink-soft">You / your business</span>
            <input
              value={yourBusiness}
              onChange={(e) => setYourBusiness(e.target.value)}
              placeholder="North Star Design Studio"
              className="mt-2 w-full border border-line bg-paper px-3.5 py-2.5 outline-none placeholder:text-ink-soft/50 focus:border-ink"
            />
          </label>

          <label className="mt-5 block">
            <span className="eyebrow text-ink-soft">Project notes: paste anything</span>
            <textarea
              value={projectNotes}
              onChange={(e) => setProjectNotes(e.target.value)}
              required
              rows={6}
              placeholder="they want a new site before their spring launch, ~6 pages, shopify for the beans, photography is done already, mentioned 10-15k budget, need it in 6 weeks…"
              className="mt-2 w-full resize-y border border-line bg-paper px-3.5 py-2.5 leading-relaxed outline-none placeholder:text-ink-soft/50 focus:border-ink"
            />
          </label>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="eyebrow text-ink-soft">Budget signal</span>
              <input
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="$10–15k"
                className="mt-2 w-full border border-line bg-paper px-3.5 py-2.5 outline-none placeholder:text-ink-soft/50 focus:border-ink"
              />
            </label>
            <label className="block">
              <span className="eyebrow text-ink-soft">Tone</span>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="mt-2 w-full border border-line bg-paper px-3.5 py-3 outline-none focus:border-ink"
              >
                {TONES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
          </div>

          {canPricingTables ? (
            <PricingItems
              items={pricingItems}
              onChange={setPricingItems}
              expanded={pricingExpanded}
              onToggle={() => {
                setPricingExpanded(true);
                if (pricingItems.length === 0)
                  setPricingItems([{ item: "", qty: "1", price: "" }]);
              }}
            />
          ) : (
            !demo && (
              <LockedField
                feature="pricingTables"
                label="Pricing table"
                note="Itemized pricing tables are included in Studio."
              />
            )
          )}

          {canBrandVoice && (
            <p className="mt-5 text-xs">
              {hasVoice ? (
                <span className="text-moss">
                  ✳ Brand voice active{voiceName ? ` — "${voiceName}"` : ""}{" "}
                  <Link href="/studio/voice" className="underline underline-offset-4">
                    Edit
                  </Link>
                </span>
              ) : (
                <Link
                  href="/studio/voice"
                  className="text-ink-soft underline underline-offset-4 hover:text-ink"
                >
                  Train your brand voice →
                </Link>
              )}
            </p>
          )}

          {blocked ? (
            <div className="mt-7">
              <a
                href="/api/checkout?plan=studio"
                className="block w-full border border-vermillion bg-vermillion px-6 py-3.5 text-center font-medium text-cream transition-colors hover:bg-vermillion-deep hover:border-vermillion-deep"
              >
                Upgrade to Studio for unlimited →
              </a>
              <p className="mt-2 text-center text-xs text-ink-soft">
                Your limit resets on {nextReset}.
              </p>
            </div>
          ) : (
            <button
              type="submit"
              disabled={streaming}
              className="mt-7 w-full cursor-pointer border border-ink bg-ink px-6 py-3.5 font-medium text-cream transition-colors hover:bg-vermillion hover:border-vermillion disabled:opacity-60"
            >
              {streaming ? "Drafting…" : "Draft my proposal →"}
            </button>
          )}
          {error && <p className="mt-3 text-sm text-vermillion-deep">{error}</p>}
        </form>

        {/* ── Output document ─────────────────────── */}
        <div className="relative">
          <div className="sticky top-8">
            <div className="flex items-center justify-between gap-3 pb-3">
              <p className="eyebrow text-ink-soft">Your draft</p>
              {draft && !streaming && (
                <div className="flex items-center gap-2">
                  {canClientProfiles && clientName.trim() && (
                    <button
                      onClick={saveAsProfile}
                      disabled={savedProfile}
                      className="cursor-pointer text-xs text-ink-soft underline underline-offset-4 hover:text-ink disabled:no-underline"
                    >
                      {savedProfile ? "Saved ✓" : "Save as client profile"}
                    </button>
                  )}
                  {proposalId && (
                    <button
                      onClick={markSent}
                      disabled={markedSent}
                      className="cursor-pointer border border-ink px-3 py-1.5 text-xs font-medium transition-colors hover:bg-ink hover:text-cream disabled:border-moss disabled:text-moss disabled:hover:bg-transparent"
                    >
                      {markedSent ? "Sent ✓" : "Mark as sent"}
                    </button>
                  )}
                  <button
                    onClick={copy}
                    className="cursor-pointer border border-ink px-3 py-1.5 text-xs font-medium transition-colors hover:bg-ink hover:text-cream"
                  >
                    {copied ? "Copied ✓" : "Copy markdown"}
                  </button>
                </div>
              )}
            </div>
            <div
              ref={outputRef}
              className="h-[70vh] overflow-y-auto border border-line bg-cream p-8 shadow-[8px_10px_0_0_rgba(27,23,18,0.08)]"
            >
              {draft ? (
                <Document text={draft} streaming={streaming} />
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <p className="font-display text-6xl text-line">¶</p>
                  <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-soft">
                    Your proposal appears here, written section by section as Draftly thinks it
                    through.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
