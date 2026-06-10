"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const TONES = ["Confident & warm", "Formal & precise", "Friendly & casual", "Bold & direct"];

export default function Studio() {
  const [clientName, setClientName] = useState("");
  const [yourBusiness, setYourBusiness] = useState("");
  const [projectNotes, setProjectNotes] = useState("");
  const [budget, setBudget] = useState("");
  const [tone, setTone] = useState(TONES[0]);

  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [welcome, setWelcome] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("welcome")) setWelcome(true);
  }, []);

  useEffect(() => {
    if (streaming && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [draft, streaming]);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setStreaming(true);
    setError("");
    setDraft("");
    setCopied(false);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientName, yourBusiness, projectNotes, budget, tone }),
      });
      if (!res.ok || !res.body) {
        throw new Error(`Generation failed (${res.status})`);
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

  return (
    <main className="flex-1">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="font-display text-2xl font-semibold tracking-tight">
            Draftly<span className="text-vermillion">.</span>
          </Link>
          <Link href="/#pricing" className="text-sm text-ink-soft underline underline-offset-4 hover:text-ink">
            Upgrade plan
          </Link>
        </div>
      </header>

      {welcome && (
        <div className="border-b border-line bg-moss px-6 py-3 text-center text-sm text-cream">
          Welcome aboard — your trial is active. Draft your first proposal below. ✳
        </div>
      )}

      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 lg:grid-cols-[0.9fr_1.1fr]">
        {/* ── Input form ──────────────────────────── */}
        <form onSubmit={generate} className="self-start border border-line bg-cream p-7">
          <p className="eyebrow text-vermillion">The studio</p>
          <h1 className="mt-3 font-display text-3xl font-medium tracking-tight">
            Brief in. Proposal out.
          </h1>

          <label className="mt-7 block">
            <span className="eyebrow text-ink-soft">Client</span>
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
            <span className="eyebrow text-ink-soft">Project notes — paste anything</span>
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

          <button
            type="submit"
            disabled={streaming}
            className="mt-7 w-full cursor-pointer border border-ink bg-ink px-6 py-3.5 font-medium text-cream transition-colors hover:bg-vermillion hover:border-vermillion disabled:opacity-60"
          >
            {streaming ? "Drafting…" : "Draft my proposal →"}
          </button>
          {error && <p className="mt-3 text-sm text-vermillion-deep">{error}</p>}
        </form>

        {/* ── Output document ─────────────────────── */}
        <div className="relative">
          <div className="sticky top-8">
            <div className="flex items-center justify-between pb-3">
              <p className="eyebrow text-ink-soft">Your draft</p>
              {draft && !streaming && (
                <button
                  onClick={copy}
                  className="cursor-pointer border border-ink px-3 py-1.5 text-xs font-medium transition-colors hover:bg-ink hover:text-cream"
                >
                  {copied ? "Copied ✓" : "Copy markdown"}
                </button>
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
    </main>
  );
}

/** Lightweight markdown-ish renderer — headings, lists, quotes, table rows, paragraphs. */
function Document({ text, streaming }: { text: string; streaming: boolean }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        const isLast = i === lines.length - 1;
        const caret = streaming && isLast ? <span className="caret text-vermillion">▌</span> : null;
        const clean = line.replace(/\*\*/g, "");

        if (line.startsWith("# "))
          return (
            <h2 key={i} className="pt-2 pb-1 font-display text-2xl font-semibold tracking-tight">
              {clean.slice(2)} {caret}
            </h2>
          );
        if (line.startsWith("## "))
          return (
            <h3 key={i} className="pt-4 pb-1 font-display text-lg font-semibold">
              {clean.slice(3)} {caret}
            </h3>
          );
        if (line.startsWith("> "))
          return (
            <p key={i} className="border-l-2 border-vermillion py-1 pl-3 text-sm text-ink-soft italic">
              {clean.slice(2)} {caret}
            </p>
          );
        if (/^[-*] /.test(line))
          return (
            <p key={i} className="flex gap-2 text-[0.95rem] leading-relaxed">
              <span className="text-vermillion">✳</span>
              <span>
                {clean.slice(2)} {caret}
              </span>
            </p>
          );
        if (/^\d+\. /.test(line))
          return (
            <p key={i} className="pl-1 text-[0.95rem] leading-relaxed">
              {clean} {caret}
            </p>
          );
        if (line.startsWith("|")) {
          if (/^\|[\s:-]+\|/.test(line.replace(/-/g, "-"))) {
            const isDivider = line.replace(/[|\s:-]/g, "") === "";
            if (isDivider) return null;
          }
          return (
            <p key={i} className="grid grid-cols-2 gap-2 border-b border-line py-1.5 text-sm">
              {clean
                .split("|")
                .filter((c) => c.trim() !== "")
                .map((cell, j) => (
                  <span key={j} className={j > 0 ? "text-right font-medium" : ""}>
                    {cell.trim()}
                  </span>
                ))}
              {caret}
            </p>
          );
        }
        if (line.trim() === "") return <div key={i} className="h-2">{caret}</div>;
        return (
          <p key={i} className="text-[0.95rem] leading-relaxed">
            {clean} {caret}
          </p>
        );
      })}
    </div>
  );
}
