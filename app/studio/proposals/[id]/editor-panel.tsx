"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import type { ProposalEditorHandle, SaveState } from "../../editor/proposal-editor";
import { SaveStatus } from "../../editor/save-status";

const ProposalEditor = dynamic(
  () => import("../../editor/proposal-editor").then((m) => m.ProposalEditor),
  {
    ssr: false,
    loading: () => <div className="min-h-48 p-8 sm:p-10" />,
  },
);

export function EditorPanel({
  proposalId,
  initialContent,
  status,
}: {
  proposalId: string;
  initialContent: string;
  status: "draft" | "sent" | "won" | "lost";
}) {
  const editorRef = useRef<ProposalEditorHandle>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  async function downloadPdf() {
    setDownloading(true);
    const ok = (await editorRef.current?.flush()) ?? true;
    setDownloading(false);
    if (ok) window.location.assign(`/api/proposals/${proposalId}/pdf`);
  }

  async function copyMarkdown() {
    const text = editorRef.current?.getText() ?? initialContent;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    void editorRef.current?.flush();
  }

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
        <SaveStatus state={saveState} onRetry={() => void editorRef.current?.flush()} />
        <button
          onClick={downloadPdf}
          disabled={downloading}
          className="cursor-pointer border border-ink px-3 py-1.5 text-xs font-medium transition-colors hover:bg-ink hover:text-cream disabled:opacity-60"
        >
          {downloading ? "Saving…" : "Download PDF"}
        </button>
        <button
          onClick={copyMarkdown}
          className="cursor-pointer border border-ink px-3 py-1.5 text-xs font-medium transition-colors hover:bg-ink hover:text-cream"
        >
          {copied ? "Copied ✓" : "Copy markdown"}
        </button>
      </div>

      <div className="relative mt-4">
        <div className="border border-line bg-cream shadow-[8px_10px_0_0_rgba(27,23,18,0.08)]">
          <ProposalEditor
            ref={editorRef}
            proposalId={proposalId}
            initialText={initialContent}
            onSaveState={setSaveState}
            placeholder="This draft is empty. Start typing, or generate again from the studio."
          />
        </div>
        {status !== "draft" && (
          <div
            className={`pointer-events-none absolute -top-4 -right-3 -rotate-8 border-4 px-4 py-1.5 font-display text-lg font-bold tracking-[0.18em] uppercase ${
              status === "won"
                ? "border-moss text-moss"
                : status === "lost"
                  ? "border-line text-ink-soft/60"
                  : "border-ink text-ink"
            }`}
          >
            {status}
          </div>
        )}
      </div>
    </>
  );
}
