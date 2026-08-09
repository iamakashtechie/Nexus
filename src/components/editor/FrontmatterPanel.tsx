"use client";

import { useEffect, useState } from "react";
import { Settings2, Tag as TagIcon, Pin, Hash, X } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { toast } from "sonner";
import type { NoteWithTags } from "@/types";

type FrontmatterPanelProps = {
  note: NoteWithTags;
  onTogglePin: () => void;
  onChangeTags: (next: string[]) => void;
};

type TagsResponse = {
  success: boolean;
  data: Array<{ id: string; name: string }>;
};

export function FrontmatterPanel({
  note,
  onTogglePin,
  onChangeTags,
}: FrontmatterPanelProps) {
  const { apiFetch } = useApi();
  const [open, setOpen] = useState(false);
  const [allTags, setAllTags] = useState<Array<{ id: string; name: string }>>([]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    let cancelled = false;
    apiFetch<TagsResponse>(`/api/tags`)
      .then((r) => {
        if (!cancelled && r.success) setAllTags(r.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [apiFetch]);

  const noteTagNames = new Set(note.tags.map((t) => t.tag.name));

  const toggleTag = async (name: string) => {
    const next = noteTagNames.has(name)
      ? Array.from(noteTagNames).filter((n) => n !== name)
      : Array.from(noteTagNames).concat(name);
    onChangeTags(next);
  };

  const addNewTag = async () => {
    const name = draft.trim();
    if (!name) return;
    if (noteTagNames.has(name)) {
      setDraft("");
      return;
    }
    const next = Array.from(noteTagNames).concat(name);
    onChangeTags(next);
    setDraft("");
    if (!allTags.find((t) => t.name === name)) {
      setAllTags((prev) => [...prev, { id: `local-${Date.now()}`, name }]);
    }
    toast.success(`Tag "${name}" added`);
  };

  const removeTag = (name: string) => {
    const next = Array.from(noteTagNames).filter((n) => n !== name);
    onChangeTags(next);
  };

  return (
    <div
      data-testid="frontmatter-panel"
      className="border-t border-border/40 bg-surface/30 px-5 md:px-8 py-3 shrink-0"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted font-semibold"
      >
        <Settings2 size={11} />
        Properties
      </button>
      {open && (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-[160px_1fr] gap-x-6 gap-y-3 text-[12px]">
          <Row label="Pinned" icon={<Pin size={11} />}>
            <button
              type="button"
              onClick={onTogglePin}
              className={`text-[11px] px-2.5 py-1 rounded-md border transition-colors ${
                note.pinned
                  ? "bg-text text-bg border-transparent"
                  : "border-border text-muted hover:text-text"
              }`}
            >
              {note.pinned ? "Pinned" : "Pin note"}
            </button>
          </Row>
          <Row label="Tags" icon={<TagIcon size={11} />}>
            <div className="flex flex-wrap items-center gap-1.5">
              {Array.from(noteTagNames).map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-hover text-[11px] text-text"
                >
                  <Hash size={9} className="text-muted" />
                  {name}
                  <button
                    type="button"
                    onClick={() => removeTag(name)}
                    className="text-muted hover:text-text ml-0.5"
                    aria-label={`Remove ${name}`}
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void addNewTag();
                    }
                  }}
                  placeholder="Add tag…"
                  className="px-2 py-0.5 text-[11px] bg-bg border border-border rounded-md outline-none focus:border-accent w-24"
                />
              </div>
            </div>
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {allTags
                  .filter((t) => !noteTagNames.has(t.name))
                  .slice(0, 12)
                  .map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => void toggleTag(t.name)}
                      className="text-[10px] text-muted hover:text-text px-1.5 py-0.5 rounded border border-border/60 hover:border-border"
                    >
                      + {t.name}
                    </button>
                  ))}
              </div>
            )}
          </Row>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="contents">
      <div className="flex items-center gap-1.5 text-muted text-[11px] uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}
