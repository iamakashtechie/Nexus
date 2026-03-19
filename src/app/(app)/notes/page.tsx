"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import type { NoteWithTags } from "@/types";
import dynamic from "next/dynamic";

const Editor = dynamic(() => import("@/components/editor/Editor"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center text-muted">
      <p className="text-sm animate-pulse">Loading editor...</p>
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
          title: "",
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
    <div className="flex h-screen overflow-hidden bg-bg text-text selection:bg-accent/20 selection:text-text">

      {/* Sidebar */}
      <aside className="flex flex-col w-72 shrink-0 border-r border-border bg-surface">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-accent text-white flex items-center justify-center font-bold text-[10px] tracking-tighter">N</div>
            <span className="font-semibold text-sm tracking-tight text-text">Nexus</span>
          </div>
          <button
            onClick={logout}
            className="text-xs px-2 py-1 rounded-md text-muted hover:text-text hover:bg-surface-hover transition-colors"
            title="Logout"
          >
            Logout
          </button>
        </div>

        {/* Action Bar */}
        <div className="px-3 pb-3">
          <button
            data-testid="new-note-btn"
            onClick={createNote}
            className="w-full py-2 px-3 rounded-lg text-sm font-medium transition-all bg-accent hover:bg-accent-hover text-white shadow-sm flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            New Note
          </button>
        </div>

        {/* Search */}
        <div className="px-3 pb-2">
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input
              data-testid="search-input"
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                fetchNotes(e.target.value);
              }}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg text-sm outline-none bg-bg border border-border text-text focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all placeholder:text-muted/70"
            />
          </div>
        </div>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto px-2 pb-4 pt-2">
          <div className="px-2 pb-1">
            <h3 className="text-[11px] font-semibold text-muted uppercase tracking-wider">Your Notes</h3>
          </div>
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-muted">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-2 opacity-50"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
              <p className="text-xs">No notes found</p>
            </div>
          )}
          {filtered.map((note) => (
            <div
              key={note.id}
              onClick={() => setActiveNote(note)}
              className={`group relative flex items-start gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all mb-0.5 ${
                activeNote?.id === note.id
                  ? "bg-accent/10 text-accent font-medium"
                  : "hover:bg-surface-hover text-text"
              }`}
            >
              {note.pinned && (
                <span className={`mt-1 text-[10px] shrink-0 ${activeNote?.id === note.id ? "text-accent" : "text-accent/60"}`}>
                  ●
                </span>
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm truncate ${activeNote?.id === note.id ? "font-medium" : "font-normal"}`}>
                  {note.title || "Untitled"}
                </p>
                <p className={`text-[11px] mt-0.5 truncate ${activeNote?.id === note.id ? "text-accent/70" : "text-muted"}`}>
                  {new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </p>
              </div>

              {/* Actions */}
              <div className="hidden group-hover:flex items-center gap-1 shrink-0 bg-gradient-to-l from-surface-hover pl-4 pr-1">
                <button
                  data-testid="note-menu"
                  onClick={(e) => { e.stopPropagation(); togglePin(note); }}
                  className="text-muted hover:text-accent p-1 rounded-md transition-colors"
                  title={note.pinned ? "Unpin" : "Pin"}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={note.pinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>
                </button>
                <button
                  data-testid="delete-note"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Delete this note?")) deleteNote(note.id);
                  }}
                  className="text-muted hover:text-red-500 p-1 rounded-md transition-colors"
                  title="Delete"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Editor area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-bg relative">
        {activeNote ? (
          <>
            {/* Note header / top bar */}
            <header className="flex items-center justify-between px-8 py-5 shrink-0">
               {/* Breadcrumbs or Status indicator can go here */}
               <div className="flex items-center gap-2 text-xs text-muted">
                 <span>Personal</span>
                 <span className="text-border">/</span>
                 <span className="text-text font-medium">{activeNote.title || "Untitled"}</span>
               </div>
               
               <div className="flex items-center gap-3">
                 <span className="text-[11px] text-muted flex items-center gap-1.5">
                   {saving ? (
                     <>
                       <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
                       Saving...
                     </>
                   ) : (
                     <>
                       <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                       Saved
                     </>
                   )}
                 </span>
                 <button className="text-xs font-medium px-3 py-1.5 rounded-md text-text hover:bg-border transition-colors border border-transparent">
                   Share
                 </button>
               </div>
            </header>

            {/* Note Title & Editor */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto px-8 py-4">
                <input
                  data-testid="note-title"
                  type="text"
                  value={activeNote.title}
                  onChange={(e) => {
                    setActiveNote({ ...activeNote, title: e.target.value });
                    autoSave(activeNote.id, "title", e.target.value);
                  }}
                  className="w-full text-4xl font-bold bg-transparent outline-none text-text placeholder:text-muted/40 mb-8 tracking-tight"
                  placeholder="Note Title"
                />
                
                <Editor
                  content={activeNote.content as object}
                  onChange={(content) => autoSave(activeNote.id, "content", content)}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted max-w-sm mx-auto text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center shadow-sm">
               <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent/60"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text mb-1 tracking-tight">Select a note to start</h2>
              <p className="text-sm text-muted mb-6">Choose a note from the sidebar or create a new one to capture your thoughts.</p>
            </div>
            <button
              onClick={createNote}
              className="px-5 py-2.5 rounded-lg transition-all bg-accent hover:bg-accent-hover text-white shadow-sm font-medium flex items-center gap-2 text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
              Create New Note
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
