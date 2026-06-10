/** Lightweight markdown-ish renderer: headings, lists, quotes, table rows, paragraphs. */
export function Document({ text, streaming = false }: { text: string; streaming?: boolean }) {
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
          const isDivider = line.replace(/[|\s:-]/g, "") === "";
          if (isDivider) return null;
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
        if (line.trim() === "")
          return (
            <div key={i} className="h-2">
              {caret}
            </div>
          );
        return (
          <p key={i} className="text-[0.95rem] leading-relaxed">
            {clean} {caret}
          </p>
        );
      })}
    </div>
  );
}
