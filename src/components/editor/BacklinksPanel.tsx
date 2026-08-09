"use client";

import { useEffect, useState } from "react";
import { Link2, ExternalLink, Loader2 } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { normalizeNoteTitle } from "@/lib/fileType";
import type { NoteWithTags } from "@/types";

type BacklinksResponse = {
  success: boolean;
  data: NoteWithTags[];
};

type BacklinksPanelProps = {
  activeNote: NoteWithTags | null;
  onSelect: (id: string) => void;
};

export function BacklinksPanel({ activeNote, onSelect }: BacklinksPanelProps) {
  const { apiFetch } = useApi();
  const [backlinks, setBacklinks] = useState<NoteWithTags[]>([]);
  const [outgoing, setOutgoing] = useState<NoteWithTags[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!activeNote) {
      setBacklinks([]);
      setOutgoing([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await apiFetch<BacklinksResponse>(
          `/api/notes/${activeNote.id}/backlinks`
        );
        if (cancelled) return;
        if (res.success) {
          setBacklinks(res.data);
          const links = extractOutgoingLinks(activeNote);
          if (links.length > 0) {
            const r2 = await apiFetch<BacklinksResponse>(
              `/api/notes?titles=${encodeURIComponent(links.join(","))}`
            );
            if (!cancelled && r2.success) setOutgoing(r2.data);
          } else {
            setOutgoing([]);
          }
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [activeNote, apiFetch]);

  if (!activeNote) return null;
  const total = backlinks.length + outgoing.length;
  if (!loading && total === 0) return null;

  return (
    <div
      data-testid="backlinks-panel"
      className="border-t border-border/40 bg-surface/30 px-5 md:px-8 py-3 shrink-0"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted font-semibold w-full"
      >
        <Link2 size={11} />
        Links
        <span className="text-muted/60 normal-case font-normal tracking-normal">
          {loading ? (
            <Loader2 size={11} className="inline animate-spin" />
          ) : (
            `${total} ${total === 1 ? "note" : "notes"}`
          )}
        </span>
      </button>
      {open && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 mt-3">
          <Section
            label="Backlinks"
            empty="No notes link here yet."
            notes={backlinks}
            onSelect={onSelect}
          />
          <Section
            label="Outgoing"
            empty="No internal links in this note."
            notes={outgoing}
            onSelect={onSelect}
          />
        </div>
      )}
    </div>
  );
}

function Section({
  label,
  empty,
  notes,
  onSelect,
}: {
  label: string;
  empty: string;
  notes: NoteWithTags[];
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted/70 mb-1.5">
        {label}
      </div>
      {notes.length === 0 ? (
        <p className="text-[11px] text-muted/60 italic">{empty}</p>
      ) : (
        <ul className="space-y-1">
          {notes.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => onSelect(n.id)}
                className="flex items-center gap-1.5 text-[12px] text-text/80 hover:text-text hover:underline w-full text-left truncate"
              >
                <ExternalLink size={10} className="text-muted shrink-0" />
                <span className="truncate">{normalizeNoteTitle(n.title)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function extractOutgoingLinks(note: NoteWithTags): string[] {
  const titles = new Set<string>();
  const md = note.markdownContent ?? "";
  const re = /\[\[([^\]\n]+)\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md))) titles.add(m[1].trim());
  collectFromContent(note.content, titles);
  return Array.from(titles);
}

function collectFromContent(node: unknown, titles: Set<string>) {
  if (!node || typeof node !== "object") return;
  const data = node as {
    type?: string;
    text?: string;
    attrs?: { title?: string };
    content?: unknown[];
  };
  if (data.type === "text" && typeof data.text === "string") {
    const re = /\[\[([^\]\n]+)\]\]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(data.text))) titles.add(m[1].trim());
  }
  if (data.attrs?.title) titles.add(String(data.attrs.title));
  if (Array.isArray(data.content)) data.content.forEach((c) => collectFromContent(c, titles));
}
