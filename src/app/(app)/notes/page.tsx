"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import type { NoteWithTags } from "@/types";
import type { Notebook } from "@prisma/client";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { ContextMenu, type MenuItem } from "@/components/ui/ContextMenu";
import {
  normalizeFileType,
  normalizeNoteTitle,
  resolveNoteFileType,
} from "@/lib/fileType";
import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

function extractTextFromRichContent(node: unknown): string {
  if (!node || typeof node !== "object") return "";

  const data = node as { type?: string; text?: string; content?: unknown[] };
  const children = Array.isArray(data.content) ? data.content : [];

  if (data.type === "text") return data.text ?? "";

  const childText = children.map(extractTextFromRichContent).join("");

  if (["paragraph", "heading", "codeBlock", "blockquote", "listItem"].includes(data.type ?? "")) {
    return `${childText}\n`;
  }

  return childText;
}

function getMarkdownValue(note: NoteWithTags | null): string {
  if (!note) return "";
  if (note.markdownContent && note.markdownContent.trim().length > 0) return note.markdownContent;
  return extractTextFromRichContent(note.content).trim();
}

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
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [activeNote, setActiveNote] = useState<NoteWithTags | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Notebooks / Folders
  type NotebookWithCount = Notebook & { _count: { notes: number } };
  const [notebooks, setNotebooks] = useState<NotebookWithCount[]>([]);
  const [activeNotebookId, setActiveNotebookId] = useState<string | null>(null); // null = All Notes
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameFolderName, setRenameFolderName] = useState("");
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; tone: "info" | "success" | "error" }>>([]);

  // Context menu
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; items: MenuItem[]; placement?: "right" | "left" } | null>(null);

  const isMarkdownNote = activeNote
    ? resolveNoteFileType({ title: activeNote.title, fileType: activeNote.fileType }) === ".md"
    : false;
  const markdownValue = getMarkdownValue(activeNote);

  function showToast(message: string, tone: "info" | "success" | "error" = "info") {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3200);
  }

  const fetchNotebooks = useCallback(async () => {
    const res = await apiFetch<{ success: boolean; data: NotebookWithCount[] }>("/api/notebooks");
    if (res.success) setNotebooks(res.data);
  }, [apiFetch]);

  const fetchNotes = useCallback(
    async (q?: string) => {
      setLoadingNotes(true);
      const params = q ? `?q=${encodeURIComponent(q)}` : "";
      const res = await apiFetch<{ success: boolean; data: NoteWithTags[] }>(
        `/api/notes${params}`
      );
      if (res.success) setNotes(res.data);
      setLoadingNotes(false);
    },
    [apiFetch]
  );

  useEffect(() => {
    void fetchNotes();
    void fetchNotebooks();
  }, [fetchNotes, fetchNotebooks]);

  async function createNote() {
    const res = await apiFetch<{ success: boolean; data: NoteWithTags }>(
      "/api/notes",
      {
        method: "POST",
        body: JSON.stringify({
          title: "Untitled.md",
          fileType: ".md",
          markdownContent: "",
          content: { type: "doc", content: [{ type: "paragraph" }] },
        }),
      }
    );
    if (res.success) {
      setNotes((prev) => [res.data, ...prev]);
      setActiveNote(res.data);
      setIsEditing(true);
    }
  }

  const triggerApiSave = useCallback(async (noteId: string, payload: any) => {
    setSaving(true);
    await apiFetch(`/api/notes/${noteId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    setSaving(false);
    setHasUnsavedChanges(false);
    void fetchNotes(search);
  }, [apiFetch, fetchNotes, search]);

  const autoSave = useCallback(
    (noteId: string, field: "title" | "content" | "markdownContent" | "fileType", value: unknown) => {
      setHasUnsavedChanges(true); // Always mark as unsaved on any edit
      if (!autoSaveEnabled) return;

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      setSaving(true);
      const t = setTimeout(() => {
        void triggerApiSave(noteId, { [field]: value });
      }, 800);
      saveTimeoutRef.current = t;
    },
    [autoSaveEnabled, triggerApiSave]
  );

  const handleManualSave = async () => {
    if (!activeNote || !hasUnsavedChanges) return;
    const resolvedFileType = resolveNoteFileType({
      title: activeNote.title,
      fileType: activeNote.fileType,
    });

    await triggerApiSave(activeNote.id, {
      title: activeNote.title,
      fileType: resolvedFileType,
      ...(resolvedFileType === ".md"
        ? { markdownContent: activeNote.markdownContent ?? "" }
        : { content: activeNote.content }),
    });
  };

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

  // Notebook CRUD
  async function createNotebook(name: string) {
    const res = await apiFetch<{ success: boolean; data: NotebookWithCount }>("/api/notebooks", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    if (res.success) {
      setNotebooks(prev => [...prev, res.data]);
    }
    setCreatingFolder(false);
    setNewFolderName("");
  }

  async function renameNotebook(id: string, name: string) {
    await apiFetch(`/api/notebooks/${id}`, { method: "PATCH", body: JSON.stringify({ name }) });
    void fetchNotebooks();
    setRenamingFolderId(null);
    setRenameFolderName("");
  }

  async function deleteNotebook(id: string) {
    if (!confirm("Delete this folder? Notes inside will become unfiled.")) return;
    await apiFetch(`/api/notebooks/${id}`, { method: "DELETE" });
    if (activeNotebookId === id) setActiveNotebookId(null);
    void fetchNotebooks();
    void fetchNotes(search);
  }

  async function moveNoteToFolder(noteId: string, notebookId: string | null) {
    await apiFetch(`/api/notes/${noteId}`, {
      method: "PATCH",
      body: JSON.stringify({ notebookId }),
    });
    void fetchNotes(search);
    void fetchNotebooks();
  }

  function getAuthToken(): string {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("nexus_token") ?? "";
  }

  function saveBlob(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function downloadNoteFile(note: NoteWithTags) {
    showToast("Preparing note download. It will start shortly.", "info");

    const res = await fetch(`/api/notes/${note.id}/download`, {
      headers: {
        Authorization: `Bearer ${getAuthToken()}`,
      },
    });

    if (res.status === 401) {
      localStorage.removeItem("nexus_token");
      window.location.href = "/login";
      return;
    }

    if (!res.ok) {
      showToast("Failed to download file.", "error");
      return;
    }

    const blob = await res.blob();
    const fileName =
      res.headers
        .get("content-disposition")
        ?.match(/filename=\"?([^\";]+)\"?/)?.[1] ?? note.title;
    saveBlob(blob, fileName);
    showToast("Note downloaded.", "success");
  }

  async function downloadNotebookZip(nb: NotebookWithCount) {
    showToast("Preparing folder backup. Download will start shortly.", "info");

    const res = await fetch(`/api/notebooks/${nb.id}/download`, {
      headers: {
        Authorization: `Bearer ${getAuthToken()}`,
      },
    });

    if (res.status === 401) {
      localStorage.removeItem("nexus_token");
      window.location.href = "/login";
      return;
    }

    if (!res.ok) {
      showToast("Failed to download folder.", "error");
      return;
    }

    const blob = await res.blob();
    const fileName =
      res.headers
        .get("content-disposition")
        ?.match(/filename=\"?([^\";]+)\"?/)?.[1] ?? `${nb.name}.zip`;
    saveBlob(blob, fileName);
    showToast("Folder backup downloaded.", "success");
  }

  // Note context menu builder
  function buildNoteContextMenu(note: NoteWithTags): MenuItem[] {
    return [
      { label: note.pinned ? "Unpin" : "Pin", onClick: () => togglePin(note) },
      { label: "Download File", onClick: () => void downloadNoteFile(note) },
      {
        label: "Move to Folder",
        onClick: () => {},
        divider: true,
      },
      ...notebooks.map(nb => ({
        label: `  📁 ${nb.name}`,
        onClick: () => moveNoteToFolder(note.id, nb.id),
      })),
      { label: "Delete", onClick: () => { if (confirm("Delete this note?")) deleteNote(note.id); }, danger: true, divider: true },
    ];
  }

  // Folder context menu builder
  function buildFolderContextMenu(nb: NotebookWithCount): MenuItem[] {
    return [
      { label: "Download Folder (.zip)", onClick: () => void downloadNotebookZip(nb) },
      { label: "Rename", onClick: () => { setRenamingFolderId(nb.id); setRenameFolderName(nb.name); } },
      { label: "Delete Folder", onClick: () => deleteNotebook(nb.id), danger: true, divider: true },
    ];
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      localStorage.removeItem("nexus_token");
      router.push("/login");
    }
  }

  const filtered = notes
    .filter(n => n.title.toLowerCase().includes(search.toLowerCase()))
    .filter(n => {
      if (activeNotebookId === null) return true;
      return n.notebookId === activeNotebookId;
    });

  return (
    <div className="flex h-screen overflow-hidden bg-bg text-text selection:bg-accent/20 selection:text-text">

      {/* Sidebar */}
      <aside className={`flex-col w-full md:w-72 shrink-0 border-r border-border bg-surface ${activeNote ? 'hidden md:flex' : 'flex'}`}>
        {/* Header content minimalized */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-[4px] bg-text text-bg flex items-center justify-center font-bold text-[10px] tracking-tighter">N</div>
            <span className="font-semibold text-sm tracking-tight text-text">Nexus</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeSwitcher />
            <button
              data-testid="new-note-btn"
              onClick={createNote}
              className="p-1.5 rounded-md text-muted hover:text-text hover:bg-surface-hover transition-colors"
              title="New Note"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            </button>
            <button
              onClick={logout}
              className="p-1.5 rounded-md text-muted hover:text-text hover:bg-surface-hover transition-colors"
              title="Logout"
            >
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2">
          <div className="group relative flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 text-muted/70 group-focus-within:text-accent transition-colors"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input
              data-testid="search-input"
              type="text"
              placeholder="Search notes..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                fetchNotes(e.target.value);
              }}
              className="w-full pl-9 pr-3 py-1.5 rounded-md text-sm outline-none bg-surface-hover/50 hover:bg-surface-hover focus:bg-surface border border-transparent focus:border-border text-text transition-all placeholder:text-muted/50"
            />
          </div>
        </div>

        {/* Folders */}
        <div className="px-2 pt-2 pb-1">
          <div className="px-2 pb-1">
            <h3 className="text-[11px] font-semibold text-muted uppercase tracking-wider">Folders</h3>
          </div>
          <button
            onClick={() => setActiveNotebookId(null)}
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded-md transition-colors ${
              activeNotebookId === null ? 'bg-surface-hover/80 text-text font-medium' : 'text-muted hover:bg-surface-hover/50 hover:text-text'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
            All Notes
          </button>
          {notebooks.map(nb => (
            <div key={nb.id} className="group">
              {renamingFolderId === nb.id ? (
                <form
                  className="flex items-center gap-1 px-3 py-1"
                  onSubmit={(e) => { e.preventDefault(); if (renameFolderName.trim()) renameNotebook(nb.id, renameFolderName.trim()); }}
                >
                  <input
                    autoFocus
                    value={renameFolderName}
                    onChange={e => setRenameFolderName(e.target.value)}
                    onBlur={() => { setRenamingFolderId(null); setRenameFolderName(""); }}
                    className="flex-1 text-xs bg-transparent outline-none border-b border-border text-text py-0.5"
                  />
                </form>
              ) : (
                <button
                  onClick={() => setActiveNotebookId(nb.id)}
                  onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, items: buildFolderContextMenu(nb) }); }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs rounded-md transition-colors ${
                    activeNotebookId === nb.id ? 'bg-surface-hover/80 text-text font-medium' : 'text-muted hover:bg-surface-hover/50 hover:text-text'
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/></svg>
                    {nb.name}
                  </span>
                  <span className="text-[10px] text-muted/50 tabular-nums">{nb._count.notes}</span>
                </button>
              )}
            </div>
          ))}
          {creatingFolder ? (
            <form
              className="flex items-center gap-1 px-3 py-1"
              onSubmit={(e) => { e.preventDefault(); if (newFolderName.trim()) createNotebook(newFolderName.trim()); }}
            >
              <input
                autoFocus
                placeholder="Folder name"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onBlur={() => { setCreatingFolder(false); setNewFolderName(""); }}
                className="flex-1 text-xs bg-transparent outline-none border-b border-border text-text py-0.5 placeholder:text-muted/50"
              />
            </form>
          ) : (
            <button
              onClick={() => setCreatingFolder(true)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-muted/50 hover:text-muted hover:bg-surface-hover/50 rounded-md transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
              New Folder
            </button>
          )}
        </div>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto px-2 pb-4 pt-2">
          <div className="px-2 pb-1">
            <h3 className="text-[11px] font-semibold text-muted uppercase tracking-wider">Notes</h3>
          </div>
          {loadingNotes ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-2 animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              <p className="text-xs mt-1">Fetching notes...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-2 opacity-50"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
              <p className="text-xs">No notes found</p>
            </div>
          ) : null}
          {filtered.map((note) => (
            <div
              key={note.id}
              onClick={() => {
                setActiveNote(note);
                setIsEditing(false);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setCtxMenu({ x: e.clientX, y: e.clientY, items: buildNoteContextMenu(note) });
              }}
              className={`group relative flex items-start gap-2.5 px-3 py-2 rounded-md cursor-pointer transition-all mb-0.5 ${
                activeNote?.id === note.id
                  ? "bg-surface-hover/80 text-text"
                  : "hover:bg-surface-hover/50 text-text/80"
              }`}
            >
              <div className="flex-1 min-w-0 py-0.5">
                <p className={`text-[13px] truncate ${activeNote?.id === note.id ? "font-medium text-text" : "font-normal"}`}>
                  {normalizeNoteTitle(note.title)}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[11px] text-muted/70">
                    {new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </p>
                  {note.pinned && (
                    <span className="w-1.5 h-1.5 rounded-full bg-text/30"></span>
                  )}
                </div>
              </div>

              {/* Actions: three-dot on mobile, hover actions on desktop */}
              <button
                className="md:hidden p-1 text-muted"
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = (e.target as HTMLElement).getBoundingClientRect();
                  setCtxMenu({ x: rect.left, y: rect.bottom, items: buildNoteContextMenu(note), placement: "left" });
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
              </button>
              <div className="hidden group-hover:flex items-center gap-1 shrink-0 bg-gradient-to-l from-surface-hover pl-4 pr-1">
                <button
                  onClick={(e) => { e.stopPropagation(); togglePin(note); }}
                  className="text-muted hover:text-accent p-1 rounded-md transition-colors"
                  title={note.pinned ? "Unpin" : "Pin"}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={note.pinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const rect = (e.target as HTMLElement).getBoundingClientRect();
                    setCtxMenu({ x: rect.left, y: rect.bottom, items: buildNoteContextMenu(note), placement: "left" });
                  }}
                  className="text-muted hover:text-text p-1 rounded-md transition-colors"
                  title="More"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Context Menu Portal */}
      {ctxMenu && (
        <ContextMenu x={ctxMenu.x} y={ctxMenu.y} items={ctxMenu.items} placement={ctxMenu.placement} onClose={() => setCtxMenu(null)} />
      )}

      {/* Download toasts */}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[1200] flex w-[min(92vw,340px)] flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-lg border px-3 py-2 text-xs shadow-lg backdrop-blur-sm transition-all ${
              toast.tone === "success"
                ? "border-green-500/40 bg-green-500/12 text-green-300"
                : toast.tone === "error"
                  ? "border-red-500/40 bg-red-500/12 text-red-300"
                  : "border-border bg-surface/95 text-text"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>

      {/* Editor area */}
      <main className={`flex-1 flex-col overflow-hidden bg-bg relative w-full ${!activeNote ? 'hidden md:flex' : 'flex'}`}>
        {activeNote ? (
          <>
            {/* Note header / top bar */}
            <header className="flex items-center justify-between px-4 md:px-8 py-3 md:py-5 shrink-0 border-b border-transparent md:border-none">
               {/* Breadcrumbs or Status indicator can go here */}
               <div className="flex items-center gap-2 text-xs text-muted">
                 <button 
                   onClick={() => setActiveNote(null)}
                   className="md:hidden flex items-center gap-1 text-muted hover:text-text px-1 py-1 rounded-md transition-colors"
                 >
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                   Back
                 </button>
                 <span className="hidden md:inline">{activeNote.notebook?.name || "All Notes"}</span>
                 <span className="hidden md:inline text-border">/</span>
                 <span className="text-text font-medium truncate max-w-[120px] md:max-w-xs">{normalizeNoteTitle(activeNote.title)}</span>
               </div>
               
               <div className="flex items-center gap-3">
                 <label className="flex items-center gap-1.5 cursor-pointer text-xs text-muted hover:text-text transition-colors" title="Toggle Auto-Save">
                   <input 
                     type="checkbox" 
                     checked={autoSaveEnabled}
                     onChange={(e) => {
                       setAutoSaveEnabled(e.target.checked);
                       if (e.target.checked && hasUnsavedChanges && activeNote) {
                         void triggerApiSave(activeNote.id, { title: activeNote.title, content: activeNote.content });
                       }
                     }}
                     className="accent-accent w-3 h-3 cursor-pointer"
                   />
                   Auto-Save
                 </label>

                 <div className="w-px h-3 bg-border mx-1"></div>

                 <span className="text-[11px] text-muted flex items-center gap-1.5 min-w-[60px] justify-end">
                   {saving ? (
                     <>
                       <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
                       Saving...
                     </>
                   ) : hasUnsavedChanges ? (
                     <>
                       <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                       Unsaved
                     </>
                   ) : (
                     <>
                       <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                       Saved
                     </>
                   )}
                 </span>

                 {!autoSaveEnabled && (
                   <button 
                     onClick={handleManualSave}
                     disabled={!hasUnsavedChanges || saving}
                     className="text-xs font-medium px-3 py-1.5 rounded-md bg-text text-bg hover:opacity-90 transition-opacity disabled:opacity-50"
                   >
                     Save
                   </button>
                 )}
                 
                 <button onClick={() => setIsEditing(!isEditing)} className={`text-xs font-medium px-3 py-1.5 rounded-md hover:bg-surface-hover transition-colors border ${isEditing ? 'border-border/50 text-text' : 'border-transparent text-muted'}`}>{isEditing ? "View Mode" : "Edit Mode"}</button>
                  <button className="text-xs font-medium px-3 py-1.5 rounded-md text-text hover:bg-surface-hover transition-colors border border-transparent hidden sm:block">
                   Share
                 </button>
               </div>
            </header>

            {/* Note Title & Editor */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-5xl mx-auto w-full px-5 md:px-8 py-4 min-h-full flex flex-col">
                <input
                  data-testid="note-title"
                  type="text"
                  value={activeNote.title}
                  readOnly={!isEditing}
                  onChange={(e) => {
                    setActiveNote({ ...activeNote, title: e.target.value });
                    autoSave(activeNote.id, "title", e.target.value);
                  }}
                  onBlur={() => {
                    const resolvedFileType = resolveNoteFileType({
                      title: activeNote.title,
                      fileType: activeNote.fileType,
                    });
                    const normalizedTitle = normalizeNoteTitle(activeNote.title, resolvedFileType);
                    const titleChanged = normalizedTitle !== activeNote.title;
                    const fileTypeChanged = normalizeFileType(activeNote.fileType) !== resolvedFileType;

                    if (titleChanged || fileTypeChanged) {
                      setActiveNote({
                        ...activeNote,
                        title: normalizedTitle,
                        fileType: resolvedFileType,
                      });

                      if (titleChanged) {
                        autoSave(activeNote.id, "title", normalizedTitle);
                      }
                      if (fileTypeChanged) {
                        autoSave(activeNote.id, "fileType", resolvedFileType);
                      }
                    }
                  }}
                  className={`w-full text-3xl md:text-4xl font-bold bg-transparent outline-none text-text placeholder:text-muted/30 mb-2 tracking-tight ${!isEditing ? 'cursor-default' : ''}`}
                  placeholder="Untitled.md"
                />
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted/50 mb-6 md:mb-8 px-1">
                  <span>Created: {new Date(activeNote.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                  <span>Updated: {new Date(activeNote.updatedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                </div>
                
                <div className={`flex-1 flex flex-col pb-8 mt-2 ${isEditing ? 'cursor-text' : 'cursor-default'}`}>
                  {isMarkdownNote ? (
                    isEditing ? (
                      <textarea
                        value={markdownValue}
                        onChange={(e) => {
                          const next = e.target.value;
                          setActiveNote((prev) => (prev ? { ...prev, markdownContent: next } : null));
                          autoSave(activeNote.id, "markdownContent", next);
                        }}
                        className="flex-1 min-h-[500px] w-full rounded-xl border border-border/40 bg-surface/30 p-4 text-sm leading-6 text-text outline-none transition-all hover:border-border/60 focus:border-border"
                        spellCheck={false}
                      />
                    ) : (
                      <div className="min-h-[500px] rounded-xl border border-border/40 bg-surface/30 px-5 py-4">
                        <article className="prose prose-sm max-w-none prose-invert prose-headings:text-text prose-p:text-text/90 prose-strong:text-text prose-a:text-accent prose-code:text-text prose-pre:bg-surface-hover">
                          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                            {markdownValue}
                          </ReactMarkdown>
                        </article>
                      </div>
                    )
                  ) : (
                    <Editor
                      key={activeNote.id}
                      content={activeNote.content as object}
                      editable={isEditing}
                      onChange={(content) => {
                        setActiveNote(prev => prev ? { ...prev, content } : null);
                        autoSave(activeNote.id, "content", content);
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted max-w-xs mx-auto text-center px-4">
            <div className="w-12 h-12 rounded-xl bg-surface-hover/30 flex items-center justify-center mb-2">
               <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted/80"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>
            </div>
            <div>
              <h2 className="text-[15px] font-medium text-text mb-1 tracking-tight">Select a note</h2>
              <p className="text-[13px] text-muted mb-6">Choose a note from the sidebar or create a new one.</p>
            </div>
            <button
              onClick={createNote}
              className="px-4 py-2 rounded-md transition-all hover:bg-surface-hover text-text font-medium flex items-center gap-2 text-[13px]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
              Create Note
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
