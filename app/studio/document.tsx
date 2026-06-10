import { inlineText, parseBlocks } from "@/lib/proposal-blocks";

/** Lightweight markdown-ish renderer: headings, lists, quotes, table rows, paragraphs. */
export function Document({ text, streaming = false }: { text: string; streaming?: boolean }) {
  const blocks = parseBlocks(text);
  return (
    <div className="space-y-1">
      {blocks.map((block, i) => {
        const isLast = i === blocks.length - 1;
        const caret = streaming && isLast ? <span className="caret text-vermillion">▌</span> : null;

        switch (block.kind) {
          case "h1":
            return (
              <h2 key={i} className="pt-2 pb-1 font-display text-2xl font-semibold tracking-tight">
                {inlineText(block.inlines)} {caret}
              </h2>
            );
          case "h2":
            return (
              <h3 key={i} className="pt-4 pb-1 font-display text-lg font-semibold">
                {inlineText(block.inlines)} {caret}
              </h3>
            );
          case "quote":
            return (
              <p key={i} className="border-l-2 border-vermillion py-1 pl-3 text-sm text-ink-soft italic">
                {inlineText(block.inlines)} {caret}
              </p>
            );
          case "bullet":
            return (
              <p key={i} className="flex gap-2 text-[0.95rem] leading-relaxed">
                <span className="text-vermillion">✳</span>
                <span>
                  {inlineText(block.inlines)} {caret}
                </span>
              </p>
            );
          case "numbered":
            return (
              <p key={i} className="pl-1 text-[0.95rem] leading-relaxed">
                {inlineText(block.inlines)} {caret}
              </p>
            );
          case "tableDivider":
            return null;
          case "tableRow":
            return (
              <p key={i} className="grid grid-cols-2 gap-2 border-b border-line py-1.5 text-sm">
                {block.cells.map((cell, j) => (
                  <span key={j} className={j > 0 ? "text-right font-medium" : ""}>
                    {inlineText(cell)}
                  </span>
                ))}
                {caret}
              </p>
            );
          case "blank":
            return (
              <div key={i} className="h-2">
                {caret}
              </div>
            );
          case "p":
            return (
              <p key={i} className="text-[0.95rem] leading-relaxed">
                {inlineText(block.inlines)} {caret}
              </p>
            );
        }
      })}
    </div>
  );
}
