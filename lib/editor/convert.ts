/**
 * Bidirectional converters between the proposal text dialect and Tiptap JSON.
 * The text dialect (lib/proposal-blocks.ts) stays the single source of truth:
 * the editor is a view over it. Round-trip on generator output is byte-stable;
 * arbitrary text normalizes harmlessly (`* `->`- `, renumbering, level clamps).
 */
import type { JSONContent } from "@tiptap/core";
import { parseBlocks, type Block, type Inline } from "@/lib/proposal-blocks";

// ── Load: text -> editor doc ───────────────────────────────────────────────

function inlinesToContent(inlines: Inline[]): JSONContent[] | undefined {
  const content: JSONContent[] = [];
  for (const seg of inlines) {
    if (seg.text === "") continue;
    const marks: JSONContent["marks"] = [];
    if (seg.bold) marks.push({ type: "bold" });
    if (seg.italic) marks.push({ type: "italic" });
    content.push({
      type: "text",
      text: seg.text,
      ...(marks.length > 0 ? { marks } : {}),
    });
  }
  return content.length > 0 ? content : undefined;
}

function paragraph(inlines?: Inline[]): JSONContent {
  const content = inlines ? inlinesToContent(inlines) : undefined;
  return { type: "paragraph", ...(content ? { content } : {}) };
}

interface ListLine {
  kind: "bullet" | "numbered";
  level: number;
  inlines: Inline[];
}

/** Builds a (possibly nested) list forest from a normalized run of list lines. */
function buildLists(lines: ListLine[]): JSONContent[] {
  // Normalize: first line at level 0; level jumps clamped to +1.
  const norm = lines.map((l) => ({ ...l }));
  for (let i = 0; i < norm.length; i++) {
    const prev = i === 0 ? -1 : norm[i - 1].level;
    norm[i].level = Math.max(0, Math.min(norm[i].level, prev + 1));
  }

  let i = 0;
  function build(level: number): JSONContent[] {
    const out: JSONContent[] = [];
    while (i < norm.length && norm[i].level >= level) {
      const kind = norm[i].kind;
      const list: JSONContent = {
        type: kind === "bullet" ? "bulletList" : "orderedList",
        ...(kind === "numbered" ? { attrs: { start: 1 } } : {}),
        content: [],
      };
      while (i < norm.length && norm[i].level === level && norm[i].kind === kind) {
        const item: JSONContent = {
          type: "listItem",
          content: [paragraph(norm[i].inlines)],
        };
        i++;
        if (i < norm.length && norm[i].level > level) {
          item.content!.push(...build(level + 1));
        }
        list.content!.push(item);
      }
      out.push(list);
      // A same-level kind change loops again, opening a sibling list.
      if (i < norm.length && norm[i].level < level) break;
    }
    return out;
  }
  return build(0);
}

function tableNode(rows: Inline[][][], headerRow: boolean): JSONContent {
  const cols = Math.max(...rows.map((r) => r.length), 1);
  return {
    type: "table",
    content: rows.map((cells, rowIndex) => ({
      type: "tableRow",
      content: Array.from({ length: cols }, (_, c) => ({
        type: headerRow && rowIndex === 0 ? "tableHeader" : "tableCell",
        content: [paragraph(cells[c] ?? [])],
      })),
    })),
  };
}

export function blocksToEditorDoc(blocks: Block[]): JSONContent {
  const content: JSONContent[] = [];
  let i = 0;

  while (i < blocks.length) {
    const b = blocks[i];
    switch (b.kind) {
      case "h1":
      case "h2":
        content.push({
          type: "heading",
          attrs: { level: b.kind === "h1" ? 1 : 2 },
          content: inlinesToContent(b.inlines),
        });
        i++;
        break;
      case "quote": {
        const paragraphs: JSONContent[] = [];
        while (i < blocks.length && blocks[i].kind === "quote") {
          paragraphs.push(paragraph((blocks[i] as { inlines: Inline[] }).inlines));
          i++;
        }
        content.push({ type: "blockquote", content: paragraphs });
        break;
      }
      case "bullet":
      case "numbered": {
        const lines: ListLine[] = [];
        while (i < blocks.length) {
          const l = blocks[i];
          if (l.kind === "bullet") {
            lines.push({ kind: "bullet", level: l.level, inlines: l.inlines });
          } else if (l.kind === "numbered") {
            lines.push({ kind: "numbered", level: l.level, inlines: l.inlines });
          } else break;
          i++;
        }
        content.push(...buildLists(lines));
        break;
      }
      case "tableRow":
      case "tableDivider": {
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
          } else break;
        }
        if (rows.length > 0) content.push(tableNode(rows, headerRow));
        break;
      }
      case "blank":
        content.push(paragraph());
        i++;
        break;
      case "p":
        content.push(paragraph(b.inlines));
        i++;
        break;
    }
  }

  return { type: "doc", content: content.length > 0 ? content : [paragraph()] };
}

export function textToEditorDoc(text: string): JSONContent {
  return blocksToEditorDoc(parseBlocks(text));
}

// ── Save: editor doc -> text ───────────────────────────────────────────────

interface Seg {
  text: string;
  bold: boolean;
  italic: boolean;
}

function nodeSegs(node: JSONContent): Seg[] {
  const segs: Seg[] = [];
  for (const child of node.content ?? []) {
    if (child.type !== "text" || !child.text) continue;
    const marks = child.marks ?? [];
    segs.push({
      text: child.text,
      bold: marks.some((m) => m.type === "bold"),
      italic: marks.some((m) => m.type === "italic"),
    });
  }
  return segs;
}

/** Serialize inline segments back to `**`/`*` markers, whitespace kept outside. */
function serializeInlines(segs: Seg[]): string {
  // Merge adjacent segments with identical marks.
  const merged: Seg[] = [];
  for (const s of segs) {
    const last = merged[merged.length - 1];
    if (last && last.bold === s.bold && last.italic === s.italic) {
      last.text += s.text;
    } else {
      merged.push({ ...s });
    }
  }
  return merged
    .map((s) => {
      if (!s.bold && !s.italic) return s.text;
      const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s.text)!;
      if (!m[2]) return s.text;
      const marker = s.bold && s.italic ? "***" : s.bold ? "**" : "*";
      return `${m[1]}${marker}${m[2]}${marker}${m[3]}`;
    })
    .join("");
}

function paragraphText(node: JSONContent): string {
  return serializeInlines(nodeSegs(node));
}

function serializeList(node: JSONContent, depth: number, lines: string[]): void {
  const ordered = node.type === "orderedList";
  let n = 0;
  for (const item of node.content ?? []) {
    if (item.type !== "listItem") continue;
    n++;
    const indent = "  ".repeat(depth);
    const marker = ordered ? `${n}. ` : "- ";
    const first = item.content?.[0];
    const text = first?.type === "paragraph" ? paragraphText(first) : "";
    lines.push(`${indent}${marker}${text}`);
    for (const child of (item.content ?? []).slice(1)) {
      if (child.type === "bulletList" || child.type === "orderedList") {
        serializeList(child, depth + 1, lines);
      }
    }
  }
}

function cellText(cell: JSONContent): string {
  const p = cell.content?.[0];
  const text = p?.type === "paragraph" ? paragraphText(p) : "";
  return text.replace(/\|/g, "").trim();
}

export function editorDocToText(doc: JSONContent): string {
  const lines: string[] = [];

  for (const node of doc.content ?? []) {
    switch (node.type) {
      case "heading": {
        const level = (node.attrs?.level as number) ?? 1;
        lines.push(`${level === 1 ? "#" : "##"} ${paragraphText(node)}`);
        break;
      }
      case "paragraph":
        lines.push(paragraphText(node));
        break;
      case "blockquote":
        for (const p of node.content ?? []) {
          if (p.type === "paragraph") lines.push(`> ${paragraphText(p)}`);
        }
        break;
      case "bulletList":
      case "orderedList":
        serializeList(node, 0, lines);
        break;
      case "table": {
        const rows = node.content ?? [];
        const headerRow =
          rows.length > 0 &&
          (rows[0].content ?? []).length > 0 &&
          (rows[0].content ?? []).every((c) => c.type === "tableHeader");
        rows.forEach((row, r) => {
          const cells = (row.content ?? []).map(cellText);
          lines.push(`| ${cells.join(" | ")} |`);
          if (r === 0 && headerRow) {
            lines.push(`|${cells.map(() => " --- ").join("|")}|`);
          }
        });
        break;
      }
      default:
        break;
    }
  }

  return lines.join("\n");
}
