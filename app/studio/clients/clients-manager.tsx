"use client";

import { useState, useTransition } from "react";
import { EmptyState } from "../empty-state";
import {
  createClientProfile,
  deleteClientProfile,
  updateClientProfile,
  type ClientProfileInput,
} from "./actions";

const TONES = ["Confident & warm", "Formal & precise", "Friendly & casual", "Bold & direct"];

export interface ClientProfileRow {
  id: string;
  name: string;
  business_context: string | null;
  default_budget: string | null;
  default_tone: string | null;
  notes: string | null;
  updated_at: string;
}

const EMPTY: ClientProfileInput = {
  name: "",
  businessContext: "",
  defaultBudget: "",
  defaultTone: "",
  notes: "",
};

export function ClientsManager({ profiles }: { profiles: ClientProfileRow[] }) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ClientProfileInput>(EMPTY);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY);
    setPanelOpen(true);
    setError("");
  }

  function openEdit(p: ClientProfileRow) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      businessContext: p.business_context ?? "",
      defaultBudget: p.default_budget ?? "",
      defaultTone: p.default_tone ?? "",
      notes: p.notes ?? "",
    });
    setPanelOpen(true);
    setError("");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = editingId
        ? await updateClientProfile(editingId, form)
        : await createClientProfile(form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPanelOpen(false);
      setForm(EMPTY);
      setEditingId(null);
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteClientProfile(id);
      if (!result.ok) setError(result.error);
      setConfirmDelete(null);
    });
  }

  const field =
    "mt-2 w-full border border-line bg-paper px-3.5 py-2.5 outline-none placeholder:text-ink-soft/50 focus:border-ink";

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <p className="eyebrow text-vermillion">The roster</p>
          <h1 className="mt-3 font-display text-3xl font-medium tracking-tight">
            Client profiles
          </h1>
        </div>
        {!panelOpen && (
          <button
            onClick={openCreate}
            className="cursor-pointer border border-ink bg-ink px-5 py-2.5 text-sm font-medium text-cream transition-colors hover:bg-vermillion hover:border-vermillion"
          >
            New profile →
          </button>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-vermillion-deep">{error}</p>}

      {panelOpen && (
        <form onSubmit={submit} className="mt-8 border border-line bg-cream p-7">
          <p className="eyebrow text-ink-soft">
            {editingId ? "Edit profile" : "New profile"}
          </p>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="eyebrow text-ink-soft">Client name</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="Hartline Coffee Co."
                className={field}
              />
            </label>
            <label className="block">
              <span className="eyebrow text-ink-soft">Default budget signal</span>
              <input
                value={form.defaultBudget}
                onChange={(e) => setForm({ ...form, defaultBudget: e.target.value })}
                placeholder="$10–15k"
                className={field}
              />
            </label>
          </div>
          <label className="mt-5 block">
            <span className="eyebrow text-ink-soft">Their business</span>
            <textarea
              value={form.businessContext}
              onChange={(e) => setForm({ ...form, businessContext: e.target.value })}
              rows={3}
              placeholder="Specialty coffee roaster, two retail locations, strong wholesale arm…"
              className={`${field} resize-y leading-relaxed`}
            />
          </label>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="eyebrow text-ink-soft">Default tone</span>
              <select
                value={form.defaultTone}
                onChange={(e) => setForm({ ...form, defaultTone: e.target.value })}
                className={`${field} cursor-pointer py-3`}
              >
                <option value="">No default</option>
                {TONES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="eyebrow text-ink-soft">Always-include notes</span>
              <input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Decision-maker is Dana; prefers fixed-price"
                className={field}
              />
            </label>
          </div>
          <div className="mt-6 flex items-center gap-4">
            <button
              type="submit"
              disabled={pending}
              className="cursor-pointer border border-ink bg-ink px-6 py-3 font-medium text-cream transition-colors hover:bg-vermillion hover:border-vermillion disabled:opacity-60"
            >
              {pending ? "Saving…" : editingId ? "Save changes →" : "Create profile →"}
            </button>
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              className="cursor-pointer text-sm text-ink-soft underline underline-offset-4 hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {profiles.length === 0 && !panelOpen ? (
        <div className="mt-8 border border-line bg-cream">
          <EmptyState
            glyph="✳"
            message="No saved clients yet. Draft a proposal and choose 'Save as client profile', or create one here."
          />
        </div>
      ) : (
        profiles.length > 0 && (
          <div className="mt-8 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {profiles.map((p) => (
              <div key={p.id} className="group bg-paper p-6 transition-colors hover:bg-cream">
                <h3 className="font-display text-xl font-semibold">{p.name}</h3>
                {p.business_context && (
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-soft">
                    {p.business_context}
                  </p>
                )}
                <p className="eyebrow mt-4 text-ink-soft/70">
                  {p.default_budget ? `${p.default_budget} · ` : ""}
                  updated{" "}
                  {new Date(p.updated_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
                <div className="mt-4 flex gap-4 text-sm">
                  <button
                    onClick={() => openEdit(p)}
                    className="cursor-pointer text-ink-soft underline underline-offset-4 hover:text-ink"
                  >
                    Edit
                  </button>
                  {confirmDelete === p.id ? (
                    <span className="text-ink-soft">
                      Delete?{" "}
                      <button
                        onClick={() => remove(p.id)}
                        className="cursor-pointer font-medium text-vermillion-deep underline underline-offset-4"
                      >
                        Yes
                      </button>{" "}
                      /{" "}
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="cursor-pointer underline underline-offset-4"
                      >
                        No
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(p.id)}
                      className="cursor-pointer text-ink-soft underline underline-offset-4 hover:text-vermillion-deep"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </>
  );
}
