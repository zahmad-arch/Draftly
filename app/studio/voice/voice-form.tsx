"use client";

import { useState, useTransition } from "react";
import { saveBrandVoice } from "./actions";

export function VoiceForm({
  initial,
  readOnly,
}: {
  initial: { voiceName: string; description: string; writingSample: string };
  readOnly: boolean;
}) {
  const [form, setForm] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    setError("");
    startTransition(async () => {
      const result = await saveBrandVoice(form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
    });
  }

  const field =
    "mt-2 w-full border border-line bg-paper px-3.5 py-2.5 outline-none placeholder:text-ink-soft/50 focus:border-ink disabled:opacity-60";

  return (
    <form onSubmit={submit} className="self-start border border-line bg-cream p-7">
      {readOnly && (
        <p className="mb-4 border-l-2 border-line py-1 pl-3 text-sm text-ink-soft">
          Only the account owner can edit the brand voice.
        </p>
      )}
      {saved && (
        <p className="mb-4 border-l-2 border-moss bg-cream py-2 pl-3 text-sm text-moss">
          Voice saved. Every new draft will use it. ✳
        </p>
      )}
      {error && <p className="mb-4 text-sm text-vermillion-deep">{error}</p>}

      <label className="block">
        <span className="eyebrow text-ink-soft">Voice name</span>
        <input
          value={form.voiceName}
          onChange={(e) => setForm({ ...form, voiceName: e.target.value })}
          disabled={readOnly}
          placeholder="North Star voice"
          className={field}
        />
      </label>

      <label className="mt-5 block">
        <span className="eyebrow text-ink-soft">Voice description</span>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          disabled={readOnly}
          rows={3}
          placeholder="Plainspoken. Short sentences. Confident without being salesy. No agency jargon."
          className={`${field} resize-y leading-relaxed`}
        />
      </label>

      <label className="mt-5 block">
        <span className="eyebrow text-ink-soft">Writing sample</span>
        <textarea
          value={form.writingSample}
          onChange={(e) => setForm({ ...form, writingSample: e.target.value })}
          disabled={readOnly}
          rows={10}
          placeholder="Paste a proposal or email that sounds like you…"
          className={`${field} resize-y leading-relaxed`}
        />
      </label>

      {!readOnly && (
        <button
          type="submit"
          disabled={pending}
          className="mt-6 w-full cursor-pointer border border-ink bg-ink px-6 py-3.5 font-medium text-cream transition-colors hover:bg-vermillion hover:border-vermillion disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save voice →"}
        </button>
      )}
    </form>
  );
}
