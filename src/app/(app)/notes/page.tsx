"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import type { NoteWithTags } from "@/types";
import dynamic from "next/dynamic";

const Editor = dynamic(() => import("@/components/editor/Editor"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center" style={{ color: "var(--muted)" }}>
      <p className="text-sm">Loading editor...</p>
    </div>
  ),
});

export default function NotesPage() {
  const router = useRouter();
  const { apiFetch } = useApi();
  const [notes, setNotes] = useState<NoteWithTags[]>([]);
  const [activeNote, setActiveNote] = useState<NoteWithTags | null>(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchNotes = useCallback(
    async (q?: string) => {
      const params = q ? `?q=${encodeURIComponent(q)}` : "";
      const res = await apiFetch<{ success: boolean; data: NoteWithTags[] }>(
        `/api/notes${params}`
      );
      if (res.success) setNotes(res.data);
    },
    [apiFetch]
  );

  useEffect(() => {
    void fetchNotes();
  }, [fetchNotes]);

  async function createNote() {
    const res = await apiFetch<{ success: boolean; data: NoteWithTags }>(
      "/api/notes",
      {
        method: "POST",
        body: JSON.stringify({
          title: "Untitled",
          content: { type: "doc", content: [{ type: "paragraph" }] },
        }),
      }
    );
    if (res.success) {
      setNotes((prev) => [res.data, ...prev]);
      setActiveNote(res.data);
    }
  }

  const autoSave = useCallback(
    (noteId: string, field: "title" | "content", value: unknown) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      setSaving(true);
      const t = setTimeout(async () => {
        await apiFetch(`/api/notes/${noteId}`, {
          method: "PATCH",
          body: JSON.stringify({ [field]: value }),
        });
        setSaving(false);
        void fetchNotes(search);
      }, 800);
      saveTimeoutRef.current = t;
    },
    [apiFetch, fetchNotes, search]
  );

  async function deleteNote(id: string) {
    await apiFetch(`/api/notes/${id}`, { method: "DELETE" });
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (activeNote?.id === id) setActiveNote(null);
  }

  async function togglePin(note: NoteWithTags) {
    const res = await apiFetch<{ success: boolean; data: NoteWithTags }>(
      `/api/notes/${note.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ pinned: !note.pinned }),
      }
    );
    if (res.success) {
      setNotes((prev) => prev.map((n) => (n.id === note.id ? res.data : n)));
      if (activeNote?.id === note.id) setActiveNote(res.data);
    }
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      localStorage.removeItem("nexus_token");
      router.push("/login");
    }
  }

  const filtered = notes.filter((n) =>
    n.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg)" }}>

      {/* Sidebar */}
      <aside
        className="flex flex-col w-64 shrink-0 border-r"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-4 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <span className="font-semibold text-sm tracking-tight" style={{ color: "var(--text)" }}>
            Nexus
          </span>
          <button
            onClick={logout}
            className="text-xs px-2 py-1 rounded transition-colors"
            style={{ color: "var(--muted)" }}
            title="Logout"
          >
            logout
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <input
            data-testid="search-input"
            type="text"
            placeholder="Search notes..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              fetchNotes(e.target.value);
            }}
            className="w-full px-3 py-1.5 rounded-md text-xs outline-none"
            style={{
              background: "var(--bg)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
          />
        </div>

        {/* New note button */}
        <div className="px-3 py-2">
          <button
            data-testid="new-note-btn"
            onClick={createNote}
            className="w-full py-1.5 rounded-md text-xs font-medium transition-opacity hover:opacity-80"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            + New note
          </button>
        </div>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {filtered.length === 0 && (
            <p className="text-xs text-center mt-6" style={{ color: "var(--muted)" }}>
              No notes yet
            </p>
          )}
          {filtered.map((note) => (
            <div
              key={note.id}
              onClick={() => setActiveNote(note)}
              className="group relative flex items-start gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors mb-0.5"
              style={{
                background: activeNote?.id === note.id ? "var(--bg)" : "transparent",
                border: activeNote?.id === note.id
                  ? "1px solid var(--border)"
                  : "1px solid transparent",
              }}
            >
              {note.pinned && (
                <span className="mt-0.5 text-xs shrink-0" style={{ color: "var(--accent)" }}>
                  ●
                </span>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: "var(--text)" }}>
                  {note.title}
                </p>
                <p className="text-xs mt-0.5 truncate" style={{ color: "var(--muted)" }}>
                  {new Date(note.updatedAt).toLocaleDateString()}
                </p>
              </div>

              {/* Actions */}
              <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                <button
                  data-testid="note-menu"
                  onClick={(e) => { e.stopPropagation(); togglePin(note); }}
                  className="text-xs p-1 rounded hover:opacity-70"
                  style={{ color: "var(--muted)" }}
                  title={note.pinned ? "Unpin" : "Pin"}
                >
                  {note.pinned ? "unpin" : "pin"}
                </button>
                <button
                  data-testid="delete-note"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Delete this note?")) deleteNote(note.id);
                  }}
                  className="text-xs p-1 rounded hover:opacity-70"
                  style={{ color: "#E24B4A" }}
                  title="Delete"
                >
                  del
                </button>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Editor area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeNote ? (
          <>
            {/* Note header */}
            <div
              className="flex items-center gap-4 px-8 py-4 border-b shrink-0"
              style={{ borderColor: "var(--border)" }}
            >
              <input
                data-testid="note-title"
                type="text"
                value={activeNote.title}
                onChange={(e) => {
                  setActiveNote({ ...activeNote, title: e.target.value });
                  autoSave(activeNote.id, "title", e.target.value);
                }}
                className="flex-1 text-lg font-semibold bg-transparent outline-none"
                style={{ color: "var(--text)" }}
                placeholder="Untitled"
              />
              <span className="text-xs" style={{ color: "var(--muted)" }}>
                {saving ? "Saving..." : "Saved"}
              </span>
            </div>

            {/* Editor */}
            <div className="flex-1 overflow-y-auto">
              <Editor
                content={activeNote.content as object}
                onChange={(content) => autoSave(activeNote.id, "content", content)}
              />
            </div>
          </>
        ) : (
          <div
            className="flex-1 flex flex-col items-center justify-center gap-3"
            style={{ color: "var(--muted)" }}
          >
            <p className="text-sm">Select a note or create a new one</p>
            <button
              onClick={createNote}
              className="text-sm px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              + New note
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
