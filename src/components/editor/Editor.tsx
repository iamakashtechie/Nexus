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
    <div className="tiptap-wrapper h-full" onKeyDown={handleKeyDown}>
      <EditorContent
        editor={editor}
        className="tiptap h-full px-8 py-6 text-sm leading-relaxed"
        style={{ color: "var(--text)" }}
      />
    </div>
  );
}
