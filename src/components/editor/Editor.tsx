"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { createLowlight } from "lowlight";
import js from "highlight.js/lib/languages/javascript";
import ts from "highlight.js/lib/languages/typescript";
import python from "highlight.js/lib/languages/python";
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import { CodeBlockWithMermaidExtension } from "./MermaidCodeBlock";
import { useEffect, useCallback, useRef } from "react";

const lowlight = createLowlight();
lowlight.register({ js, ts, python, bash, css });

type EditorProps = {
  content: object;
  onChange: (content: object) => void;
  editable?: boolean;
};

export default function Editor({ content, onChange, editable = true }: EditorProps) {
  const initialContentStr = useRef("");
  const isInitialized = useRef(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      CodeBlockWithMermaidExtension.configure({ lowlight }),
    ],
    content,
    editable,
    onCreate({ editor }) {
      initialContentStr.current = JSON.stringify(editor.getJSON());
      isInitialized.current = true;
    },
    onUpdate({ editor }) {
      if (!isInitialized.current) return;
      const currentJson = editor.getJSON();
      const currentStr = JSON.stringify(currentJson);
      if (currentStr === initialContentStr.current) return;
      onChange(currentJson);
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable);
  }, [editor, editable]);

  // Sync content when prop changes (note switch / new note creation)
  useEffect(() => {
    if (!editor || !isInitialized.current) return;
    const incomingStr = JSON.stringify(content);
    if (incomingStr === initialContentStr.current) return;
    initialContentStr.current = incomingStr;
    editor.commands.setContent(content);
  }, [editor, content]);

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
    <div className="tiptap-wrapper flex-1 flex flex-col h-full min-h-0 border border-border/40 rounded-xl px-5 md:px-8 py-4 md:py-6 bg-surface/30 transition-all hover:border-border/60" onKeyDown={handleKeyDown}>
      <EditorContent
        editor={editor}
        className="tiptap flex-1 flex flex-col h-full text-text min-h-[500px] [&>div]:flex-1 [&>div]:outline-none"
      />
    </div>
  );
}
