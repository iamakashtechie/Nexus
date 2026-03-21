"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { createLowlight } from "lowlight";
import js from "highlight.js/lib/languages/javascript";
import ts from "highlight.js/lib/languages/typescript";
import python from "highlight.js/lib/languages/python";
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import { useEffect, useCallback } from "react";

const lowlight = createLowlight();
lowlight.register({ js, ts, python, bash, css });

type EditorProps = {
  content: object;
  onChange: (content: object) => void;
  editable?: boolean;
};

export default function Editor({ content, onChange, editable = true }: EditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      CodeBlockLowlight.configure({ lowlight }),
    ],
    content,
    editable,
    onUpdate({ editor }) {
      onChange(editor.getJSON());
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable);
  }, [editor, editable]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Tab") {
        e.preventDefault();
        editor?.commands.insertContent("  ");
      }
    },
    [editor]
  );

  return (
    <div className="tiptap-wrapper flex-1 flex flex-col h-full min-h-0 border border-border/40 rounded-xl p-3 md:p-4 bg-surface/30 transition-all hover:border-border/60" onKeyDown={handleKeyDown}>
      <EditorContent
        editor={editor}
        className="tiptap flex-1 flex flex-col h-full text-text min-h-[500px] [&>div]:flex-1 [&>div]:outline-none"
      />
    </div>
  );
}
