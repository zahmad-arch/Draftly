"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { editorDocToText, textToEditorDoc } from "@/lib/editor/convert";
import { buildExtensions, proposalEditorProps } from "@/lib/editor/extensions";
import type { SaveState } from "./use-autosave";
import { useAutosave } from "./use-autosave";
import { EditorToolbar } from "./toolbar";
import { TableControls } from "./table-controls";

export type { SaveState };

export interface ProposalEditorHandle {
  /** Current content serialized to the proposal text dialect. */
  getText(): string;
  /** Force-save pending changes; resolves true when persisted. */
  flush(): Promise<boolean>;
}

export interface ProposalEditorProps {
  proposalId: string | null;
  initialText: string;
  onSaveState?: (s: SaveState) => void;
  placeholder?: string;
}

export const ProposalEditor = forwardRef<ProposalEditorHandle, ProposalEditorProps>(
  function ProposalEditor({ proposalId, initialText, onSaveState, placeholder }, ref) {
    const editorRef = useRef<ReturnType<typeof useEditor>>(null);

    const getText = useCallback(() => {
      const e = editorRef.current;
      return e ? editorDocToText(e.getJSON()) : initialText;
    }, [initialText]);

    const { state, markDirty, flush } = useAutosave(proposalId, getText);

    // Surface save-state changes to the parent (in an effect, not in render).
    const onSaveStateRef = useRef(onSaveState);
    onSaveStateRef.current = onSaveState;
    useEffect(() => {
      onSaveStateRef.current?.(state);
    }, [state]);

    const editor = useEditor({
      extensions: buildExtensions(placeholder),
      content: textToEditorDoc(initialText),
      immediatelyRender: false,
      editorProps: {
        ...proposalEditorProps,
        handleKeyDown: (_view, event) => {
          if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
            event.preventDefault();
            void flush();
            return true;
          }
          return false;
        },
      },
      onUpdate: () => markDirty(),
    });
    editorRef.current = editor;

    useImperativeHandle(ref, () => ({ getText, flush }), [getText, flush]);

    const inTable = useEditorState({
      editor,
      selector: ({ editor: e }) => (e ? e.isActive("table") : false),
    });

    if (!editor) {
      // Pre-hydration placeholder keeps layout stable.
      return <div className="min-h-48 p-8 sm:p-10" />;
    }

    return (
      <div>
        <div className="sticky top-0 z-10 bg-cream">
          <EditorToolbar editor={editor} />
          {inTable && <TableControls editor={editor} />}
        </div>
        <div
          className="proposal-editor min-h-48 cursor-text p-8 sm:p-10"
          onClick={(e) => {
            if (e.target === e.currentTarget) editor.commands.focus("end");
          }}
        >
          <EditorContent editor={editor} />
        </div>
      </div>
    );
  },
);
