"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { Editor as TiptapEditor } from "@tiptap/core";
import { CodeBlockWithMermaidExtension } from "./MermaidCodeBlock";
import { WikiLink } from "./extensions/WikiLink";
import {
  EditorBubbleMenu,
  EditorFloatingMenu,
  useEditorStats,
} from "./EditorMenus";
import { SlashMenu, LinkAutocompleteMenu, type LinkMatchItem } from "./SuggestionMenus";
import {
  LinkPickerDialog,
} from "./MediaPickers";
import { useEffect, useCallback, useRef, useState } from "react";
import { getLowlight } from "@/lib/highlight";

const lowlight = getLowlight();

type EditorProps = {
  content: object;
  onChange: (content: object) => void;
  onLinkAutocomplete?: (
    query: string
  ) => Promise<LinkMatchItem[]>;
  editable?: boolean;
  /** Called once the TipTap editor instance is ready. */
  onEditorReady?: (editor: TiptapEditor) => void;
  /** Called when the user clicks a [[wiki-link]] span. */
  onWikiLinkClick?: (title: string) => void;
};

export default function Editor({
  content,
  onChange,
  onLinkAutocomplete,
  editable = true,
  onEditorReady,
  onWikiLinkClick,
}: EditorProps) {
  const initialContentStr = useRef("");
  const isInitialized = useRef(false);
  const [linkPickerOpen, setLinkPickerOpen] = useState(false);
  const [linkPickerInitial, setLinkPickerInitial] = useState("");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Link.configure({
        openOnClick: false,
        autolink: false,
        linkOnPaste: false,
        HTMLAttributes: {
          class: "text-accent underline underline-offset-2 cursor-pointer",
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      CodeBlockWithMermaidExtension.configure({ lowlight }),
      WikiLink,
    ],
    content,
    editable,
    onCreate({ editor }) {
      initialContentStr.current = JSON.stringify(editor.getJSON());
      isInitialized.current = true;
      onEditorReady?.(editor);
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

  useEffect(() => {
    if (!editor || !isInitialized.current) return;
    const incomingStr = JSON.stringify(content);
    if (incomingStr === initialContentStr.current) return;
    initialContentStr.current = incomingStr;
    editor.commands.setContent(content);
  }, [editor, content]);

  // Single listener for the link picker custom event
  useEffect(() => {
    if (!editor) return;
    const linkHandler = (e: Event) => {
      const detail = (e as CustomEvent<{ initial?: string }>).detail;
      setLinkPickerInitial(detail?.initial ?? "");
      setLinkPickerOpen(true);
    };
    window.addEventListener("nexus:open-link-picker", linkHandler as EventListener);
    return () => {
      window.removeEventListener("nexus:open-link-picker", linkHandler as EventListener);
    };
  }, [editor]);

  const stats = useEditorStats(editor);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Tab") {
        e.preventDefault();
        editor?.commands.insertContent("  ");
      }
    },
    [editor]
  );

  const handleLinkSubmit = useCallback(
    (url: string) => {
      if (!editor) return;
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    },
    [editor]
  );

  /** Delegate clicks on [[wiki-link]] spans to the parent. */
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!onWikiLinkClick) return;
      const target = e.target as HTMLElement;
      const wikiSpan = target.closest("span[data-wiki-title]") as HTMLElement | null;
      if (wikiSpan) {
        const title = wikiSpan.getAttribute("data-wiki-title") ?? "";
        if (title) onWikiLinkClick(title);
      }
    },
    [onWikiLinkClick]
  );

  return (
    <div
      className="tiptap-wrapper flex-1 flex flex-col h-full min-h-0 border border-border/40 rounded-xl px-5 md:px-8 py-4 md:py-6 bg-surface/30 transition-all hover:border-border/60 relative"
      onKeyDown={handleKeyDown}
      onClick={handleClick}
    >
      <EditorContent
        editor={editor}
        className="tiptap flex-1 flex flex-col h-full text-text min-h-[500px] [&>div]:flex-1 [&>div]:outline-none"
      />
      <EditorBubbleMenu
        editor={editor}
        onOpenLinkPicker={() => {
          window.dispatchEvent(new CustomEvent("nexus:open-link-picker"));
        }}
        onOpenImagePicker={() => {
          window.dispatchEvent(new CustomEvent("nexus:open-image-picker"));
        }}
      />
      <EditorFloatingMenu
        editor={editor}
        onOpenLinkPicker={() => {
          window.dispatchEvent(new CustomEvent("nexus:open-link-picker"));
        }}
        onOpenImagePicker={() => {
          window.dispatchEvent(new CustomEvent("nexus:open-image-picker"));
        }}
      />
      <SlashMenu editor={editor} />
      {onLinkAutocomplete && (
        <LinkAutocompleteMenu
          editor={editor}
          fetchCandidates={onLinkAutocomplete}
          onSelect={(item) => {
            if (!editor) return;
            // Insert [[Title]] text wrapped in the wikiLink mark so it's
            // immediately styled and clickable without requiring a round-trip.
            editor
              .chain()
              .focus()
              .insertContent({
                type: "text",
                text: `[[${item.title}]]`,
                marks: [{ type: "wikiLink", attrs: { title: item.title } }],
              })
              .run();
          }}
        />
      )}
      <span
        data-testid="editor-stats"
        className="hidden"
        data-words={stats.words}
        data-chars={stats.chars}
        data-minutes={stats.readMinutes}
      />
      <LinkPickerDialog
        isOpen={linkPickerOpen}
        onClose={() => setLinkPickerOpen(false)}
        initialValue={linkPickerInitial}
        onSubmit={handleLinkSubmit}
      />
    </div>
  );
}
