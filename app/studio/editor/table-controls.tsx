"use client";

import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";

const tbtn =
  "shrink-0 cursor-pointer px-2 py-1 text-[11px] font-medium text-ink-soft " +
  "transition-colors hover:bg-cream hover:text-ink " +
  "disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent";

function tableShape(editor: Editor): { rows: number; cols: number; headerOn: boolean } | null {
  const { $from } = editor.state.selection;
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d);
    if (node.type.name === "table") {
      const rows = node.childCount;
      const firstRow = node.firstChild;
      const cols = firstRow ? firstRow.childCount : 0;
      let headerOn = true;
      firstRow?.forEach((cell) => {
        if (cell.type.name !== "tableHeader") headerOn = false;
      });
      return { rows, cols, headerOn };
    }
  }
  return null;
}

export function TableControls({ editor }: { editor: Editor }) {
  const shape = useEditorState({
    editor,
    selector: ({ editor: e }) => tableShape(e),
  });

  if (!shape) return null;
  const stop = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-line bg-paper/70 px-3 py-1.5 whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <span className="eyebrow mr-2 shrink-0 text-vermillion">Table</span>
      <button
        type="button"
        onMouseDown={stop}
        className={tbtn}
        onClick={() => editor.chain().focus().addRowAfter().run()}
      >
        + Row
      </button>
      <button
        type="button"
        onMouseDown={stop}
        className={tbtn}
        disabled={shape.rows <= (shape.headerOn ? 2 : 1)}
        onClick={() => editor.chain().focus().deleteRow().run()}
      >
        − Row
      </button>
      <button
        type="button"
        onMouseDown={stop}
        className={tbtn}
        disabled={shape.cols >= 4}
        onClick={() => editor.chain().focus().addColumnAfter().run()}
      >
        + Col
      </button>
      <button
        type="button"
        onMouseDown={stop}
        className={tbtn}
        disabled={shape.cols <= 2}
        onClick={() => editor.chain().focus().deleteColumn().run()}
      >
        − Col
      </button>
      <button
        type="button"
        onMouseDown={stop}
        className={`${tbtn} ${shape.headerOn ? "bg-ink text-cream hover:bg-ink hover:text-cream" : ""}`}
        aria-pressed={shape.headerOn}
        onClick={() => editor.chain().focus().toggleHeaderRow().run()}
      >
        Header
      </button>
      <button
        type="button"
        onMouseDown={stop}
        className="ml-auto shrink-0 cursor-pointer px-2 py-1 text-[11px] font-medium text-ink-soft transition-colors hover:text-vermillion-deep"
        onClick={() => editor.chain().focus().deleteTable().run()}
      >
        Delete table
      </button>
    </div>
  );
}
