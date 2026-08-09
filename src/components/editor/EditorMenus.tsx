"use client";

import { BubbleMenu, FloatingMenu } from "@tiptap/react/menus";
import { Editor } from "@tiptap/core";
import {
  Bold,
  Italic,
  Code,
  Link as LinkIcon,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  List,
  ListOrdered,
  Code2,
  Image as ImageIcon,
  Strikethrough,
  Type,
} from "lucide-react";
import { useEffect, useState } from "react";

type ToolbarProps = {
  editor: Editor | null;
  onOpenLinkPicker: () => void;
  onOpenImagePicker: () => void;
};

function ToolButton({
  active,
  disabled,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`p-1.5 rounded-md transition-colors flex items-center justify-center ${
        active
          ? "bg-surface-hover text-text"
          : "text-muted hover:text-text hover:bg-surface-hover/60"
      } ${disabled ? "opacity-30 cursor-not-allowed" : ""}`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-border/60 mx-0.5" />;
}

export function EditorBubbleMenu({ editor, onOpenLinkPicker, onOpenImagePicker }: ToolbarProps) {
  if (!editor) return null;
  return (
    <BubbleMenu
      editor={editor}
      className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg bg-bg border border-border shadow-lg"
    >
      <ToolButton
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold"
      >
        <Bold size={15} />
      </ToolButton>
      <ToolButton
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic"
      >
        <Italic size={15} />
      </ToolButton>
      <ToolButton
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="Strikethrough"
      >
        <Strikethrough size={15} />
      </ToolButton>
      <ToolButton
        active={editor.isActive("code")}
        onClick={() => editor.chain().focus().toggleCode().run()}
        title="Inline code"
      >
        <Code size={15} />
      </ToolButton>
      <Divider />
      <ToolButton
        active={editor.isActive("link")}
        onClick={onOpenLinkPicker}
        title="Link"
      >
        <LinkIcon size={15} />
      </ToolButton>
    </BubbleMenu>
  );
}

export function EditorFloatingMenu({
  editor,
  onOpenLinkPicker,
  onOpenImagePicker,
}: ToolbarProps) {
  if (!editor) return null;

  const shouldShow = ({ editor }: { editor: Editor }) => {
    const { $from } = editor.state.selection;
    if ($from.pos !== $from.end()) return false;
    const node = $from.node();
    if (!node.isTextblock) return false;
    const text = $from.parent.textContent;
    if (text.length > 0 && text !== "/") return false;
    return true;
  };

  return (
    <FloatingMenu
      editor={editor}
      shouldShow={shouldShow}
      className="flex flex-col gap-0.5 p-1 rounded-lg bg-bg border border-border shadow-lg min-w-[160px]"
    >
      <FloatingItem
        icon={<Heading1 size={14} />}
        label="Heading 1"
        shortcut="H1"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      />
      <FloatingItem
        icon={<Heading2 size={14} />}
        label="Heading 2"
        shortcut="H2"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      />
      <FloatingItem
        icon={<Heading3 size={14} />}
        label="Heading 3"
        shortcut="H3"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      />
      <FloatingItem
        icon={<Type size={14} />}
        label="Plain text"
        onClick={() =>
          editor.chain().focus().setParagraph().run()
        }
      />
      <div className="h-px bg-border/60 my-1" />
      <FloatingItem
        icon={<List size={14} />}
        label="Bullet list"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <FloatingItem
        icon={<ListOrdered size={14} />}
        label="Numbered list"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />
      <FloatingItem
        icon={<Quote size={14} />}
        label="Quote"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      />
      <FloatingItem
        icon={<Code2 size={14} />}
        label="Code block"
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      />
      <div className="h-px bg-border/60 my-1" />
      <FloatingItem
        icon={<LinkIcon size={14} />}
        label="Link"
        onClick={onOpenLinkPicker}
      />
      <FloatingItem
        icon={<ImageIcon size={14} />}
        label="Image"
        onClick={onOpenImagePicker}
      />
    </FloatingMenu>
  );
}

function FloatingItem({
  icon,
  label,
  shortcut,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] text-text hover:bg-surface-hover text-left w-full"
    >
      <span className="text-muted shrink-0">{icon}</span>
      <span className="flex-1">{label}</span>
      {shortcut && <span className="text-[10px] text-muted/70">{shortcut}</span>}
    </button>
  );
}

export function useEditorStats(editor: Editor | null) {
  const [stats, setStats] = useState({ words: 0, chars: 0, readMinutes: 0 });

  useEffect(() => {
    if (!editor) return;
    const update = () => {
      const text = editor.getText().trim();
      const words = text.length === 0 ? 0 : text.split(/\s+/).filter(Boolean).length;
      const chars = text.length;
      const readMinutes = Math.max(1, Math.ceil(words / 220));
      setStats({ words, chars, readMinutes });
    };
    update();
    editor.on("update", update);
    editor.on("selectionUpdate", update);
    return () => {
      editor.off("update", update);
      editor.off("selectionUpdate", update);
    };
  }, [editor]);

  return stats;
}
