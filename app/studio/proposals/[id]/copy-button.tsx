"use client";

import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="cursor-pointer border border-ink px-3 py-1.5 text-xs font-medium transition-colors hover:bg-ink hover:text-cream"
    >
      {copied ? "Copied ✓" : "Copy markdown"}
    </button>
  );
}
