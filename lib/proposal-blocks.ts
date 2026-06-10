/**
 * Shared line-based parser for the proposal markdown dialect. Used by the web
 * Document renderer, the PDF builder, and the editor converters so they never
 * drift apart. One block per source line (keeps streaming caret indexing).
 *
 * Dialect: `# h1`, `## h2`, `> quote`, `- bullet` / `1. numbered` (nesting via
 * two leading spaces per level), `| pipe | tables |` (divider after the first
 * row marks a header row), blank lines, paragraphs. Inline: `**bold**`,
 * `*italic*`, `***bold italic***`.
 */

export interface Inline {
  text: string;
  bold: boolean;
  italic: boolean;
}

export type Block =
  | { kind: "h1"; inlines: Inline[] }
  | { kind: "h2"; inlines: Inline[] }
  | { kind: "quote"; inlines: Inline[] }
  | { kind: "bullet"; level: number; inlines: Inline[] }
  | { kind: "numbered"; level: number; n: number; inlines: Inline[] }
  | { kind: "tableRow"; cells: Inline[][] }
  | { kind: "tableDivider" } // kept so line indexes stay 1:1; renderers skip it
  | { kind: "blank" }
  | { kind: "p"; inlines: Inline[] };

// Longest marker wins: *** then ** then *. Content must start and end on a
// non-space (so "2 * 3 * 4" stays plain) and contain no asterisks.
const INLINE_RE =
  /\*\*\*(\S(?:[^*]*\S)?)\*\*\*|\*\*(\S(?:[^*]*\S)?)\*\*|\*(\S(?:[^*]*\S)?)\*/g;

/** Tokenize `**bold**` / `*italic*` spans. Unpaired markers stay literal text. */
export function parseInlines(text: string): Inline[] {
  const inlines: Inline[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE_RE)) {
    if (m.index > last) {
      inlines.push({ text: text.slice(last, m.index), bold: false, italic: false });
    }
    if (m[1] !== undefined) inlines.push({ text: m[1], bold: true, italic: true });
    else if (m[2] !== undefined) inlines.push({ text: m[2], bold: true, italic: false });
    else inlines.push({ text: m[3], bold: false, italic: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    inlines.push({ text: text.slice(last), bold: false, italic: false });
  }
  return inlines.length > 0 ? inlines : [{ text: "", bold: false, italic: false }];
}

/** Concatenated plain text of a line (marks dropped). */
export function inlineText(inlines: Inline[]): string {
  return inlines.map((i) => i.text).join("");
}

const LIST_RE = /^((?: {2})*)(?:([-*]) |(\d+)\. )(.*)$/;

export function parseLine(line: string): Block {
  if (line.startsWith("# ")) return { kind: "h1", inlines: parseInlines(line.slice(2)) };
  if (line.startsWith("## ")) return { kind: "h2", inlines: parseInlines(line.slice(3)) };
  if (line.startsWith("> ")) return { kind: "quote", inlines: parseInlines(line.slice(2)) };

  const list = LIST_RE.exec(line);
  if (list) {
    const level = list[1].length / 2;
    if (list[2] !== undefined) {
      return { kind: "bullet", level, inlines: parseInlines(list[4]) };
    }
    return {
      kind: "numbered",
      level,
      n: parseInt(list[3], 10),
      inlines: parseInlines(list[4]),
    };
  }

  if (line.startsWith("|")) {
    // Divider detection verbatim from the original renderer.
    if (line.replace(/[|\s:-]/g, "") === "") return { kind: "tableDivider" };
    const cells = line
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => parseInlines(c.trim()));
    return { kind: "tableRow", cells };
  }

  if (line.trim() === "") return { kind: "blank" };
  return { kind: "p", inlines: parseInlines(line) };
}

export function parseBlocks(text: string): Block[] {
  return text.split("\n").map(parseLine);
}

/** Pull a display title from the markdown's first h1 heading. */
export function titleFrom(text: string): string | null {
  const m = text.match(/^#\s+(.+)$/m);
  return m ? inlineText(parseInlines(m[1].trim())).slice(0, 200) : null;
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
