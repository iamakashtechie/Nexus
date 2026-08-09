"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Editor } from "@tiptap/core";
import { Search, X, ChevronUp, ChevronDown } from "lucide-react";

type FindInNoteProps = {
  editor: Editor | null;
  isMarkdown: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  textareaValue: string;
};

type Match = { from: number; to: number };

export function FindInNote({
  editor,
  isMarkdown,
  textareaRef,
  textareaValue,
}: FindInNoteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [matches, setMatches] = useState<Match[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const computeMatches = useCallback(
    (q: string): Match[] => {
      if (!q) return [];
      const needle = q.toLowerCase();
      const out: Match[] = [];

      if (isMarkdown) {
        const haystack = textareaValue.toLowerCase();
        let idx = haystack.indexOf(needle);
        while (idx !== -1) {
          out.push({ from: idx, to: idx + needle.length });
          idx = haystack.indexOf(needle, idx + 1);
        }
        return out;
      }

      if (!editor) return [];
      const doc = editor.state.doc;
      doc.descendants((node, pos) => {
        if (node.isText) {
          const text = node.text?.toLowerCase() ?? "";
          let idx = text.indexOf(needle);
          while (idx !== -1) {
            out.push({ from: pos + idx, to: pos + idx + needle.length });
            idx = text.indexOf(needle, idx + 1);
          }
        }
      });
      return out;
    },
    [editor, isMarkdown, textareaValue]
  );

  useEffect(() => {
    setMatches(computeMatches(query));
    setActiveIndex(0);
  }, [query, computeMatches]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setOpen(true);
        requestAnimationFrame(() => inputRef.current?.focus());
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const goto = useCallback(
    (idx: number) => {
      if (matches.length === 0) return;
      const safeIdx = (idx + matches.length) % matches.length;
      setActiveIndex(safeIdx);
      const m = matches[safeIdx];

      if (isMarkdown) {
        const ta = textareaRef.current;
        if (!ta) return;
        ta.focus();
        ta.setSelectionRange(m.from, m.to);
        const before = textareaValue.slice(0, m.from);
        const lineCount = before.split("\n").length;
        const lineHeight = 20;
        ta.scrollTop = Math.max(0, (lineCount - 5) * lineHeight);
        return;
      }

      if (!editor) return;
      editor.commands.focus();
      try {
        editor.commands.setTextSelection({ from: m.from, to: m.to });
      } catch {
        /* ignore out-of-bounds */
      }
      const coords = editor.view.coordsAtPos(m.from);
      const scrollContainer = document.querySelector("main") as HTMLElement | null;
      if (scrollContainer) {
        const offset = coords.top - scrollContainer.getBoundingClientRect().top - 80;
        scrollContainer.scrollBy({ top: offset, behavior: "smooth" });
      }
    },
    [matches, isMarkdown, textareaRef, textareaValue, editor]
  );

  useEffect(() => {
    if (!open) return;
    goto(activeIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  if (!open) return null;

  return (
    <div
      data-testid="find-in-note"
      className="fixed top-3 right-3 z-[240] flex items-center gap-2 px-2.5 py-1.5 bg-surface border border-border rounded-lg shadow-2xl"
    >
      <Search size={13} className="text-muted" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Find in note…"
        className="w-[180px] bg-transparent text-[12px] outline-none text-text placeholder:text-muted/50"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            goto(activeIndex + (e.shiftKey ? -1 : 1));
          }
        }}
      />
      <span className="text-[10px] text-muted/70 w-12 text-right tabular-nums">
        {matches.length === 0
          ? query
            ? "0/0"
            : ""
          : `${activeIndex + 1}/${matches.length}`}
      </span>
      <button
        type="button"
        onClick={() => goto(activeIndex - 1)}
        className="text-muted hover:text-text p-1 rounded-md hover:bg-surface-hover"
        aria-label="Previous match"
      >
        <ChevronUp size={13} />
      </button>
      <button
        type="button"
        onClick={() => goto(activeIndex + 1)}
        className="text-muted hover:text-text p-1 rounded-md hover:bg-surface-hover"
        aria-label="Next match"
      >
        <ChevronDown size={13} />
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-muted hover:text-text p-1 rounded-md hover:bg-surface-hover"
        aria-label="Close find"
      >
        <X size={13} />
      </button>
    </div>
  );
}
