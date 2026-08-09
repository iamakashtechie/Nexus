"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Editor } from "@tiptap/core";
import {
  Heading1,
  Heading2,
  Heading3,
  Type,
  List,
  ListOrdered,
  Quote,
  Code2,
  Link as LinkIcon,
  Image as ImageIcon,
  Minus,
  FileText,
  CornerDownLeft,
} from "lucide-react";

export type SlashItem = {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  keywords: string[];
  command: (editor: Editor) => void;
};

export const SLASH_ITEMS: SlashItem[] = [
  {
    id: "h1",
    label: "Heading 1",
    description: "Big section heading",
    icon: <Heading1 size={14} />,
    keywords: ["heading", "title", "h1"],
    command: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: "h2",
    label: "Heading 2",
    description: "Medium section heading",
    icon: <Heading2 size={14} />,
    keywords: ["heading", "subtitle", "h2"],
    command: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: "h3",
    label: "Heading 3",
    description: "Small section heading",
    icon: <Heading3 size={14} />,
    keywords: ["heading", "subheading", "h3"],
    command: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    id: "text",
    label: "Plain text",
    description: "Regular paragraph",
    icon: <Type size={14} />,
    keywords: ["paragraph", "text", "plain"],
    command: (e) => e.chain().focus().setParagraph().run(),
  },
  {
    id: "ul",
    label: "Bullet list",
    description: "Unordered list",
    icon: <List size={14} />,
    keywords: ["list", "bullet", "unordered"],
    command: (e) => e.chain().focus().toggleBulletList().run(),
  },
  {
    id: "ol",
    label: "Numbered list",
    description: "Ordered list",
    icon: <ListOrdered size={14} />,
    keywords: ["list", "numbered", "ordered"],
    command: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    id: "quote",
    label: "Quote",
    description: "Block quote",
    icon: <Quote size={14} />,
    keywords: ["quote", "blockquote"],
    command: (e) => e.chain().focus().toggleBlockquote().run(),
  },
  {
    id: "code",
    label: "Code block",
    description: "Code with syntax highlighting",
    icon: <Code2 size={14} />,
    keywords: ["code", "codeblock", "snippet"],
    command: (e) => e.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: "divider",
    label: "Divider",
    description: "Horizontal rule",
    icon: <Minus size={14} />,
    keywords: ["divider", "hr", "rule", "separator"],
    command: (e) => e.chain().focus().setHorizontalRule().run(),
  },
  {
    id: "mermaid",
    label: "Mermaid diagram",
    description: "Set block language to mermaid",
    icon: <FileText size={14} />,
    keywords: ["mermaid", "diagram", "chart"],
    command: (e) => {
      e.chain().focus().toggleCodeBlock({ language: "mermaid" }).run();
    },
  },
  {
    id: "link",
    label: "Link",
    description: "Open link picker",
    icon: <LinkIcon size={14} />,
    keywords: ["link", "url", "href"],
    command: () => {
      window.dispatchEvent(new CustomEvent("nexus:open-link-picker"));
    },
  },
  {
    id: "image",
    label: "Image",
    description: "Insert image from URL",
    icon: <ImageIcon size={14} />,
    keywords: ["image", "picture", "photo", "img"],
    command: () => {
      window.dispatchEvent(new CustomEvent("nexus:open-image-picker"));
    },
  },
];

export function filterSlashItems(query: string): SlashItem[] {
  const q = query.toLowerCase().trim();
  if (!q) return SLASH_ITEMS;
  return SLASH_ITEMS.filter(
    (i) =>
      i.label.toLowerCase().includes(q) ||
      i.keywords.some((k) => k.includes(q))
  );
}

type SlashMenuProps = {
  editor: Editor | null;
};

type State = {
  open: boolean;
  query: string;
  rect: DOMRect | null;
  triggerPos: number | null;
};

export function SlashMenu({ editor }: SlashMenuProps) {
  const [state, setState] = useState<State>({
    open: false,
    query: "",
    rect: null,
    triggerPos: null,
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const items = filterSlashItems(state.query);

  useEffect(() => {
    if (!editor) return;

    const update = () => {
      const { selection } = editor.state;
      const { $from } = selection;
      if (!selection.empty) {
        setState((s) => (s.open ? { ...s, open: false } : s));
        return;
      }

      const text = $from.parent.textContent;
      const cursorOffset = $from.parentOffset;
      const before = text.slice(0, cursorOffset);
      const match = before.match(/(?:^|\s)\/(\S*)$/);
      if (!match) {
        setState((s) => (s.open ? { ...s, open: false } : s));
        return;
      }

      const query = match[1];
      const triggerOffsetInParent = before.lastIndexOf("/");
      const triggerPos = $from.start() + triggerOffsetInParent;
      const coords = editor.view.coordsAtPos(triggerPos);
      const rect = new DOMRect(
        coords.left,
        coords.top,
        0,
        coords.bottom - coords.top
      );
      setState({ open: true, query, rect, triggerPos });
      setActiveIndex(0);
    };

    editor.on("selectionUpdate", update);
    editor.on("update", update);
    update();

    return () => {
      editor.off("selectionUpdate", update);
      editor.off("update", update);
    };
  }, [editor]);

  const execute = useCallback(
    (item: SlashItem) => {
      if (!editor || state.triggerPos == null) return;
      const { state: edState } = editor;
      const { tr } = edState;
      const from = state.triggerPos;
      const to = edState.selection.from;
      tr.deleteRange(from, to);
      editor.view.dispatch(tr);
      item.command(editor);
      setState({ open: false, query: "", rect: null, triggerPos: null });
    },
    [editor, state.triggerPos]
  );

  useEffect(() => {
    if (!state.open) return;
    const handler = (e: KeyboardEvent) => {
      if (items.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % items.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + items.length) % items.length);
      } else if (e.key === "Enter") {
        if (e.shiftKey) return;
        e.preventDefault();
        execute(items[activeIndex]);
      } else if (e.key === "Escape") {
        setState({ open: false, query: "", rect: null, triggerPos: null });
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [state.open, items, activeIndex, execute]);

  if (!state.open || !state.rect || items.length === 0) return null;

  return (
    <div
      data-testid="slash-menu"
      style={{
        position: "fixed",
        top: Math.min(state.rect.bottom + 4, window.innerHeight - 280),
        left: Math.min(state.rect.left, window.innerWidth - 260),
        zIndex: 220,
      }}
      className="w-[240px] max-h-[280px] overflow-y-auto bg-bg border border-border rounded-lg shadow-2xl p-1"
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="text-[10px] uppercase tracking-wider text-muted/70 px-2 py-1">
        Blocks
      </div>
      {items.map((item, i) => (
        <button
          key={item.id}
          type="button"
          onMouseEnter={() => setActiveIndex(i)}
          onClick={() => execute(item)}
          className={`flex items-center gap-2.5 w-full px-2 py-1.5 rounded-md text-left text-[12px] ${
            i === activeIndex
              ? "bg-surface-hover text-text"
              : "text-text/80 hover:bg-surface-hover/60"
          }`}
        >
          <span className="text-muted shrink-0">{item.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="truncate">{item.label}</div>
            <div className="text-[10px] text-muted/70 truncate">
              {item.description}
            </div>
          </div>
          {i === activeIndex && (
            <CornerDownLeft size={11} className="text-muted/70 shrink-0" />
          )}
        </button>
      ))}
    </div>
  );
}

export type LinkMatchItem = {
  id: string;
  title: string;
};

type LinkMenuProps = {
  editor: Editor | null;
  fetchCandidates: (query: string) => Promise<LinkMatchItem[]>;
  onSelect: (item: LinkMatchItem) => void;
};

export function LinkAutocompleteMenu({ editor, fetchCandidates, onSelect }: LinkMenuProps) {
  const [state, setState] = useState<{
    open: boolean;
    query: string;
    rect: DOMRect | null;
    triggerPos: number | null;
  }>({ open: false, query: "", rect: null, triggerPos: null });
  const [items, setItems] = useState<LinkMatchItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const requestSeqRef = useRef(0);

  useEffect(() => {
    if (!editor) return;

    const update = async () => {
      const { selection } = editor.state;
      const { $from } = selection;
      if (!selection.empty) {
        setState((s) => (s.open ? { ...s, open: false } : s));
        return;
      }

      const text = $from.parent.textContent;
      const cursorOffset = $from.parentOffset;
      const before = text.slice(0, cursorOffset);
      const match = before.match(/\[\[([^\[\]\n]*)$/);
      if (!match) {
        setState((s) => (s.open ? { ...s, open: false } : s));
        return;
      }

      const query = match[1];
      const triggerOffsetInParent = before.lastIndexOf("[[");
      const triggerPos = $from.start() + triggerOffsetInParent;
      const coords = editor.view.coordsAtPos(triggerPos);
      const rect = new DOMRect(
        coords.left,
        coords.top,
        0,
        coords.bottom - coords.top
      );

      setState({ open: true, query, rect, triggerPos });
      setActiveIndex(0);

      const seq = ++requestSeqRef.current;
      const next = await fetchCandidates(query);
      if (seq !== requestSeqRef.current) return;
      setItems(next);
    };

    editor.on("selectionUpdate", update);
    editor.on("update", update);
    void update();

    return () => {
      editor.off("selectionUpdate", update);
      editor.off("update", update);
    };
  }, [editor, fetchCandidates]);

  const execute = useCallback(
    (item: LinkMatchItem | null) => {
      if (!editor || state.triggerPos == null) return;
      const { state: edState } = editor;
      const { tr } = edState;
      const from = state.triggerPos;
      const to = edState.selection.from;
      tr.deleteRange(from, to);
      if (item) {
        onSelect(item);
      } else {
        editor.view.dispatch(tr);
      }
      setState({ open: false, query: "", rect: null, triggerPos: null });
    },
    [editor, state.triggerPos, onSelect]
  );

  useEffect(() => {
    if (!state.open) return;
    const handler = (e: KeyboardEvent) => {
      if (items.length === 0) {
        if (e.key === "Escape") {
          setState({ open: false, query: "", rect: null, triggerPos: null });
        }
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % items.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + items.length) % items.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        execute(items[activeIndex]);
      } else if (e.key === "Escape") {
        setState({ open: false, query: "", rect: null, triggerPos: null });
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [state.open, items, activeIndex, execute]);

  if (!state.open || !state.rect) return null;

  return (
    <div
      data-testid="link-menu"
      style={{
        position: "fixed",
        top: Math.min(state.rect.bottom + 4, window.innerHeight - 280),
        left: Math.min(state.rect.left, window.innerWidth - 280),
        zIndex: 220,
      }}
      className="w-[260px] max-h-[280px] overflow-y-auto bg-bg border border-border rounded-lg shadow-2xl p-1"
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="text-[10px] uppercase tracking-wider text-muted/70 px-2 py-1">
        Link to note
      </div>
      {items.length === 0 ? (
        <div className="px-2 py-3 text-[12px] text-muted/70">
          {state.query.trim()
            ? `No matches for "${state.query}"`
            : "Type a note title…"}
        </div>
      ) : (
        items.map((item, i) => (
          <button
            key={item.id}
            type="button"
            onMouseEnter={() => setActiveIndex(i)}
            onClick={() => execute(item)}
            className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-left text-[12px] truncate ${
              i === activeIndex
                ? "bg-surface-hover text-text"
                : "text-text/80 hover:bg-surface-hover/60"
            }`}
          >
            <FileText size={12} className="text-muted shrink-0" />
            <span className="truncate">{item.title}</span>
          </button>
        ))
      )}
    </div>
  );
}
