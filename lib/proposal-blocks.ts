/**
 * Shared line-based parser for the proposal markdown dialect. Used by both the
 * web Document renderer and the PDF builder so they never drift apart. One
 * block per source line (keeps the web streaming caret's line indexing).
 */

export interface Inline {
  text: string;
  bold: boolean;
}

export type Block =
  | { kind: "h1"; inlines: Inline[] }
  | { kind: "h2"; inlines: Inline[] }
  | { kind: "quote"; inlines: Inline[] }
  | { kind: "bullet"; inlines: Inline[] }
  | { kind: "numbered"; inlines: Inline[] } // inlines hold the FULL line incl. "1. "
  | { kind: "tableRow"; cells: Inline[][] }
  | { kind: "tableDivider" } // kept so line indexes stay 1:1; renderers skip it
  | { kind: "blank" }
  | { kind: "p"; inlines: Inline[] };

/** Split `**bold**` spans into inline segments. An unpaired ** degrades to plain. */
export function parseInlines(text: string): Inline[] {
  const parts = text.split(/\*\*/);
  if (parts.length === 1) return [{ text, bold: false }];
  // Odd part count means every ** was paired; even means the last opener was
  // unpaired, so the trailing segment renders plain (same as stripping).
  const paired = parts.length % 2 === 1;
  const inlines: Inline[] = [];
  parts.forEach((part, i) => {
    if (part === "") return;
    const bold = i % 2 === 1 && (paired || i < parts.length - 1);
    inlines.push({ text: part, bold });
  });
  return inlines.length > 0 ? inlines : [{ text: "", bold: false }];
}

/** Concatenated plain text of a line: exactly what the web renders today. */
export function inlineText(inlines: Inline[]): string {
  return inlines.map((i) => i.text).join("");
}

export function parseLine(line: string): Block {
  if (line.startsWith("# ")) return { kind: "h1", inlines: parseInlines(line.slice(2)) };
  if (line.startsWith("## ")) return { kind: "h2", inlines: parseInlines(line.slice(3)) };
  if (line.startsWith("> ")) return { kind: "quote", inlines: parseInlines(line.slice(2)) };
  if (/^[-*] /.test(line)) return { kind: "bullet", inlines: parseInlines(line.slice(2)) };
  if (/^\d+\. /.test(line)) return { kind: "numbered", inlines: parseInlines(line) };
  if (line.startsWith("|")) {
    // Divider detection verbatim from the original renderer.
    if (line.replace(/[|\s:-]/g, "") === "") return { kind: "tableDivider" };
    const cells = line
      .replace(/\*\*/g, "")
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c !== "")
      .map((c) => [{ text: c, bold: false }]);
    return { kind: "tableRow", cells };
  }
  if (line.trim() === "") return { kind: "blank" };
  return { kind: "p", inlines: parseInlines(line) };
}

export function parseBlocks(text: string): Block[] {
  return text.split("\n").map(parseLine);
}

/** A coalesced run of table rows, for the PDF renderer. */
export interface TableGroup {
  kind: "table";
  rows: Inline[][][];
  headerRow: boolean;
}

export type PdfBlock = Exclude<Block, { kind: "tableRow" | "tableDivider" }> | TableGroup;

/** Groups consecutive tableRow/tableDivider blocks into TableGroups. */
export function groupForPdf(blocks: Block[]): PdfBlock[] {
  const out: PdfBlock[] = [];
  let i = 0;
  while (i < blocks.length) {
    const b = blocks[i];
    if (b.kind === "tableRow" || b.kind === "tableDivider") {
      const rows: Inline[][][] = [];
      let headerRow = false;
      let rowIndex = 0;
      while (i < blocks.length) {
        const t = blocks[i];
        if (t.kind === "tableRow") {
          rows.push(t.cells);
          rowIndex++;
          i++;
        } else if (t.kind === "tableDivider") {
          if (rowIndex === 1) headerRow = true;
          i++;
        } else {
          break;
        }
      }
      if (rows.length > 0) out.push({ kind: "table", rows, headerRow });
    } else {
      out.push(b);
      i++;
    }
  }
  return out;
}
