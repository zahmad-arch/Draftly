/**
 * The editor schema is an allowlist: only constructs the proposal dialect and
 * the PDF can represent may exist in the document. Pasted rich text (Word,
 * Google Docs) is conformed to this schema by ProseMirror automatically;
 * pasted TEXT is additionally scrubbed of em dashes/emoji.
 */
import type { Extensions } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import Blockquote from "@tiptap/extension-blockquote";
import ListItem from "@tiptap/extension-list-item";
import Placeholder from "@tiptap/extension-placeholder";
import { Fragment, Slice, type Node as PMNode, type Schema } from "@tiptap/pm/model";
import type { EditorView } from "@tiptap/pm/view";
import { scrub } from "@/lib/sanitize";

/** Single line per quote paragraph; no nesting inside quotes. */
const ProposalBlockquote = Blockquote.extend({ content: "paragraph+" });

/** One paragraph then optional nested lists: guarantees serializability. */
const ProposalListItem = ListItem.extend({
  content: "paragraph (bulletList | orderedList)*",
});

/** One line per cell. */
const ProposalTableHeader = TableHeader.extend({ content: "paragraph" });
const ProposalTableCell = TableCell.extend({ content: "paragraph" });

export function buildExtensions(placeholder?: string): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2] },
      blockquote: false, // replaced by ProposalBlockquote
      listItem: false, // replaced by ProposalListItem
      code: false,
      codeBlock: false,
      horizontalRule: false,
      link: false,
      underline: false,
      strike: false,
      hardBreak: false,
    }),
    ProposalBlockquote,
    ProposalListItem,
    Table.configure({ resizable: false }),
    TableRow,
    ProposalTableHeader,
    ProposalTableCell,
    Placeholder.configure({
      placeholder: placeholder ?? "Start typing…",
    }),
  ];
}

function mapFragmentText(
  fragment: Fragment,
  schema: Schema,
  fn: (s: string) => string,
): Fragment {
  const nodes: PMNode[] = [];
  fragment.forEach((node) => {
    if (node.isText) {
      const t = fn(node.text ?? "");
      if (t) nodes.push(schema.text(t, node.marks));
    } else {
      nodes.push(node.copy(mapFragmentText(node.content, schema, fn)));
    }
  });
  return Fragment.fromArray(nodes);
}

/** editorProps for useEditor: scrub all pasted content. */
export const proposalEditorProps = {
  transformPastedText: (text: string) => scrub(text),
  transformPasted: (slice: Slice, view: EditorView) =>
    new Slice(
      mapFragmentText(slice.content, view.state.schema, scrub),
      slice.openStart,
      slice.openEnd,
    ),
};

/** Everything the schema may contain; dev-only drift check. */
export const ALLOWED_NODES = new Set([
  "doc",
  "text",
  "paragraph",
  "heading",
  "blockquote",
  "bulletList",
  "orderedList",
  "listItem",
  "table",
  "tableRow",
  "tableHeader",
  "tableCell",
]);
export const ALLOWED_MARKS = new Set(["bold", "italic"]);
