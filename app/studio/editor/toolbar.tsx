"use client";

import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";

const btn =
  "flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center text-sm " +
  "text-ink-soft transition-colors hover:bg-paper hover:text-ink " +
  "disabled:cursor-default disabled:text-ink-soft/30 disabled:hover:bg-transparent";
const btnActive = "bg-ink text-cream hover:bg-ink hover:text-cream";

function listDepth(editor: Editor): number {
  const { $from } = editor.state.selection;
  let depth = 0;
  for (let d = 1; d <= $from.depth; d++) {
    const name = $from.node(d).type.name;
    if (name === "bulletList" || name === "orderedList") depth++;
  }
  return depth;
}

export function EditorToolbar({ editor }: { editor: Editor }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      isH1: e.isActive("heading", { level: 1 }),
      isH2: e.isActive("heading", { level: 2 }),
      isQuote: e.isActive("blockquote"),
      isBold: e.isActive("bold"),
      isItalic: e.isActive("italic"),
      isBullet: e.isActive("bulletList"),
      isOrdered: e.isActive("orderedList"),
      inTable: e.isActive("table"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
      canLift: e.can().liftListItem("listItem"),
      canSink: e.can().sinkListItem("listItem") && listDepth(e) < 3,
    }),
  });

  const blockValue = s.isH1 ? "h1" : s.isH2 ? "h2" : s.isQuote ? "quote" : "p";

  function setBlock(value: string) {
    const chain = editor.chain().focus();
    if (s.isQuote && value !== "quote") chain.lift("blockquote");
    switch (value) {
      case "h1":
        chain.setHeading({ level: 1 }).run();
        break;
      case "h2":
        chain.setHeading({ level: 2 }).run();
        break;
      case "quote":
        chain.setParagraph().run();
        if (!s.isQuote) editor.chain().focus().toggleBlockquote().run();
        break;
      default:
        chain.setParagraph().run();
    }
  }

  const stop = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="flex items-center gap-0.5 overflow-x-auto border-b border-line bg-cream px-2 whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <span className="relative shrink-0">
        <select
          value={blockValue}
          disabled={s.inTable}
          onChange={(e) => setBlock(e.target.value)}
          onMouseDown={(e) => e.stopPropagation()}
          className="eyebrow h-9 w-28 cursor-pointer appearance-none bg-transparent pr-5 pl-2 text-ink-soft transition-colors outline-none hover:text-ink disabled:cursor-default disabled:opacity-40"
          aria-label="Block type"
        >
          <option value="p">Paragraph</option>
          <option value="h1">Heading</option>
          <option value="h2">Subheading</option>
          <option value="quote">Quote</option>
        </select>
        <span
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-1.5 -translate-y-1/2 text-[10px] text-ink-soft"
        >
          ▾
        </span>
      </span>

      <span aria-hidden className="mx-1 h-4 w-px shrink-0 bg-line" />

      <button
        type="button"
        onMouseDown={stop}
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`${btn} ${s.isBold ? btnActive : ""}`}
        aria-pressed={s.isBold}
        title="Bold ⌘B"
      >
        <span className="font-semibold">B</span>
      </button>
      <button
        type="button"
        onMouseDown={stop}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`${btn} ${s.isItalic ? btnActive : ""}`}
        aria-pressed={s.isItalic}
        title="Italic ⌘I"
      >
        <span className="font-display italic">I</span>
      </button>

      <span aria-hidden className="mx-1 h-4 w-px shrink-0 bg-line" />

      <button
        type="button"
        onMouseDown={stop}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`${btn} ${s.isBullet ? btnActive : ""}`}
        aria-pressed={s.isBullet}
        title="Bullet list"
      >
        <span className="text-vermillion">✳︎</span>
      </button>
      <button
        type="button"
        onMouseDown={stop}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`${btn} ${s.isOrdered ? btnActive : ""}`}
        aria-pressed={s.isOrdered}
        title="Numbered list"
      >
        <span className="font-display text-xs font-medium">1.</span>
      </button>
      <button
        type="button"
        onMouseDown={stop}
        onClick={() => editor.chain().focus().liftListItem("listItem").run()}
        disabled={!s.canLift}
        className={btn}
        title="Outdent ⇧Tab"
      >
        ⇤
      </button>
      <button
        type="button"
        onMouseDown={stop}
        onClick={() => editor.chain().focus().sinkListItem("listItem").run()}
        disabled={!s.canSink}
        className={btn}
        title="Indent Tab"
      >
        ⇥
      </button>

      <span aria-hidden className="mx-1 h-4 w-px shrink-0 bg-line" />

      <button
        type="button"
        onMouseDown={stop}
        onClick={() =>
          editor.chain().focus().insertTable({ rows: 3, cols: 2, withHeaderRow: true }).run()
        }
        className={`${btn} ${s.inTable ? btnActive : ""}`}
        title="Insert table"
      >
        <span className="text-base">⊞</span>
      </button>

      <button
        type="button"
        onMouseDown={stop}
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!s.canUndo}
        className={`${btn} ml-auto`}
        title="Undo ⌘Z"
      >
        ↺
      </button>
      <button
        type="button"
        onMouseDown={stop}
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!s.canRedo}
        className={btn}
        title="Redo ⇧⌘Z"
      >
        ↻
      </button>
    </div>
  );
}
