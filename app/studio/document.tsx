import { parseBlocks, type Inline } from "@/lib/proposal-blocks";

function InlineSpans({ inlines }: { inlines: Inline[] }) {
  return (
    <>
      {inlines.map((seg, i) => {
        if (seg.bold && seg.italic)
          return (
            <strong key={i} className="italic">
              {seg.text}
            </strong>
          );
        if (seg.bold) return <strong key={i}>{seg.text}</strong>;
        if (seg.italic) return <em key={i}>{seg.text}</em>;
        return <span key={i}>{seg.text}</span>;
      })}
    </>
  );
}

/** Lightweight markdown-ish renderer: headings, lists, quotes, table rows, paragraphs. */
export function Document({ text, streaming = false }: { text: string; streaming?: boolean }) {
  const blocks = parseBlocks(text);

  // Mark header rows: a tableRow whose next block is a tableDivider.
  const isHeaderRow = (i: number) =>
    blocks[i].kind === "tableRow" && blocks[i + 1]?.kind === "tableDivider";

  return (
    <div className="space-y-1">
      {blocks.map((block, i) => {
        const isLast = i === blocks.length - 1;
        const caret = streaming && isLast ? <span className="caret text-vermillion">▌</span> : null;

        switch (block.kind) {
          case "h1":
            return (
              <h2 key={i} className="pt-2 pb-1 font-display text-2xl font-semibold tracking-tight">
                <InlineSpans inlines={block.inlines} /> {caret}
              </h2>
            );
          case "h2":
            return (
              <h3 key={i} className="pt-4 pb-1 font-display text-lg font-semibold">
                <InlineSpans inlines={block.inlines} /> {caret}
              </h3>
            );
          case "quote":
            return (
              <p key={i} className="border-l-2 border-vermillion py-1 pl-3 text-sm text-ink-soft italic">
                <InlineSpans inlines={block.inlines} /> {caret}
              </p>
            );
          case "bullet":
            return (
              <p
                key={i}
                className="flex gap-2 text-[0.95rem] leading-relaxed"
                style={block.level > 0 ? { paddingLeft: `${block.level * 1.25}rem` } : undefined}
              >
                <span className="text-vermillion">✳︎</span>
                <span>
                  <InlineSpans inlines={block.inlines} /> {caret}
                </span>
              </p>
            );
          case "numbered":
            return (
              <p
                key={i}
                className="pl-1 text-[0.95rem] leading-relaxed"
                style={block.level > 0 ? { paddingLeft: `${0.25 + block.level * 1.25}rem` } : undefined}
              >
                {block.n}. <InlineSpans inlines={block.inlines} /> {caret}
              </p>
            );
          case "tableDivider":
            return null;
          case "tableRow": {
            const header = isHeaderRow(i);
            return (
              <p
                key={i}
                className={`grid gap-2 border-b border-line py-1.5 text-sm ${
                  header ? "text-[0.6875rem] font-semibold tracking-[0.12em] text-ink-soft uppercase" : ""
                }`}
                style={{ gridTemplateColumns: `repeat(${block.cells.length}, minmax(0, 1fr))` }}
              >
                {block.cells.map((cell, j) => (
                  <span key={j} className={j > 0 ? `text-right ${header ? "" : "font-medium"}` : ""}>
                    <InlineSpans inlines={cell} />
                  </span>
                ))}
                {caret}
              </p>
            );
          }
          case "blank":
            return (
              <div key={i} className="h-2">
                {caret}
              </div>
            );
          case "p":
            return (
              <p key={i} className="text-[0.95rem] leading-relaxed">
                <InlineSpans inlines={block.inlines} /> {caret}
              </p>
            );
        }
      })}
    </div>
  );
}
