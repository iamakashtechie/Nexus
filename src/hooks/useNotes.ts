"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useApi } from "@/hooks/useApi";
import type { NoteWithTags } from "@/types";

export function useNotes() {
  const { apiFetch } = useApi();
  const [notes, setNotes] = useState<NoteWithTags[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeNote, setActiveNote] = useState<NoteWithTags | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPayloadRef = useRef<{
    noteId: string;
    payload: Record<string, unknown>;
  } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const fetchNotes = useCallback(
    async (q?: string) => {
      setLoading(true);
      const params = q ? `?q=${encodeURIComponent(q)}` : "";
      try {
        const res = await apiFetch<{
          success: boolean;
          data: NoteWithTags[];
        }>(`/api/notes${params}`);
        if (res.success) setNotes(res.data);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load notes"
        );
      } finally {
        setLoading(false);
      }
    },
    [apiFetch]
  );

  useEffect(() => {
    void fetchNotes(debouncedSearch);
  }, [fetchNotes, debouncedSearch]);

  const createNote = useCallback(
    async (
      notebookId: string | null,
      overrides?: {
        title?: string;
        markdownContent?: string;
        content?: object;
        fileType?: string;
      }
    ) => {
      try {
        const title = overrides?.title ?? "Untitled.md";
        const fileType = overrides?.fileType ?? ".md";
        const res = await apiFetch<{ success: boolean; data: NoteWithTags }>(
          "/api/notes",
          {
            method: "POST",
            body: JSON.stringify({
              title,
              fileType,
              markdownContent: overrides?.markdownContent ?? "",
              content:
                overrides?.content ?? {
                  type: "doc",
                  content: [{ type: "paragraph" }],
                },
              ...(notebookId ? { notebookId } : {}),
            }),
          }
        );
        if (res.success) {
          setNotes((prev) => [res.data, ...prev]);
          setActiveNote(res.data);
          return res.data;
        }
        return null;
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to create note"
        );
        return null;
      }
    },
    [apiFetch]
  );

  const triggerApiSave = useCallback(
    async (noteId: string, payload: Record<string, unknown>) => {
      setSaving(true);
      try {
        const res = await apiFetch<{ success: boolean; data: NoteWithTags }>(
          `/api/notes/${noteId}`,
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          }
        );
        setSaving(false);
        setHasUnsavedChanges(false);
        if (res.success) {
          setActiveNote((prev) =>
            prev?.id === noteId
              ? { ...prev, updatedAt: res.data.updatedAt }
              : prev
          );
          setNotes((prev) =>
            prev.map((n) =>
              n.id === noteId
                ? {
                    ...n,
                    title: res.data.title,
                    updatedAt: res.data.updatedAt,
                    pinned: res.data.pinned,
                    tags: res.data.tags,
                  }
                : n
            )
          );
        }
      } catch (err) {
        setSaving(false);
        toast.error(err instanceof Error ? err.message : "Save failed");
      }
    },
    [apiFetch]
  );

  const autoSave = useCallback(
    (
      noteId: string,
      field: "title" | "content" | "markdownContent" | "fileType" | "pinned" | "tags",
      value: unknown
    ) => {
      setHasUnsavedChanges(true);
      if (!autoSaveEnabled) return;

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

      if (pendingPayloadRef.current?.noteId === noteId) {
        pendingPayloadRef.current.payload[field] = value;
      } else {
        pendingPayloadRef.current = { noteId, payload: { [field]: value } };
      }

      const t = setTimeout(() => {
        const p = pendingPayloadRef.current;
        if (p && Object.keys(p.payload).length > 0) {
          pendingPayloadRef.current = null;
          void triggerApiSave(p.noteId, p.payload);
        }
      }, 1000);
      saveTimeoutRef.current = t;
    },
    [autoSaveEnabled, triggerApiSave]
  );

  const flushPending = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    const p = pendingPayloadRef.current;
    if (p && Object.keys(p.payload).length > 0) {
      pendingPayloadRef.current = null;
      void triggerApiSave(p.noteId, p.payload);
    }
  }, [triggerApiSave]);

  const handleManualSave = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    pendingPayloadRef.current = null;
    if (!activeNote || !hasUnsavedChanges) return;
    const { resolveNoteFileType } = await import("@/lib/fileType");
    const resolvedFileType = resolveNoteFileType({
      title: activeNote.title,
      fileType: activeNote.fileType,
    });
    const savePayload =
      resolvedFileType === ".md"
        ? {
            title: activeNote.title,
            fileType: resolvedFileType,
            markdownContent: activeNote.markdownContent ?? "",
          }
        : {
            title: activeNote.title,
            fileType: resolvedFileType,
            content: activeNote.content,
          };
    await triggerApiSave(activeNote.id, savePayload);
  }, [activeNote, hasUnsavedChanges, triggerApiSave]);

  const closeActiveNote = useCallback(() => {
    flushPending();
    if (activeNote) {
      setNotes((prev) =>
        prev.map((n) => (n.id === activeNote.id ? { ...n, ...activeNote } : n))
      );
    }
    setActiveNote(null);
    setHasUnsavedChanges(false);
  }, [activeNote, flushPending]);

  const switchNote = useCallback(
    (note: NoteWithTags) => {
      flushPending();
      setActiveNote(note);
      setHasUnsavedChanges(false);
    },
    [flushPending]
  );

  const deleteNote = useCallback(
    async (id: string) => {
      try {
        await apiFetch(`/api/notes/${id}`, { method: "DELETE" });
        setNotes((prev) => prev.filter((n) => n.id !== id));
        if (activeNote?.id === id) setActiveNote(null);
        toast.success("Note deleted");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Delete failed");
      }
    },
    [apiFetch, activeNote]
  );

  const togglePin = useCallback(
    async (note: NoteWithTags) => {
      try {
        const res = await apiFetch<{ success: boolean; data: NoteWithTags }>(
          `/api/notes/${note.id}`,
          {
            method: "PATCH",
            body: JSON.stringify({ pinned: !note.pinned }),
          }
        );
        if (res.success) {
          setNotes((prev) =>
            prev.map((n) => (n.id === note.id ? res.data : n))
          );
          if (activeNote?.id === note.id) setActiveNote(res.data);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Pin failed");
      }
    },
    [apiFetch, activeNote]
  );

  const moveNoteToFolder = useCallback(
    async (noteId: string, notebookId: string | null) => {
      try {
        await apiFetch(`/api/notes/${noteId}`, {
          method: "PATCH",
          body: JSON.stringify({ notebookId }),
        });
        void fetchNotes(debouncedSearch);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Move failed");
      }
    },
    [apiFetch, debouncedSearch, fetchNotes]
  );

  const updateActiveNote = useCallback((updater: (n: NoteWithTags) => NoteWithTags) => {
    setActiveNote((prev: any) => (prev ? updater(prev) : prev));
  }, []);

  useEffect(() => {
    return () => {
      flushPending();
    };
  }, [flushPending]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && !autoSaveEnabled && activeNote) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges, autoSaveEnabled, activeNote]);

  return {
    notes,
    loading,
    activeNote,
    search,
    setSearch,
    autoSaveEnabled,
    setAutoSaveEnabled,
    saving,
    hasUnsavedChanges,
    createNote,
    switchNote,
    closeActiveNote,
    deleteNote,
    togglePin,
    moveNoteToFolder,
    autoSave,
    handleManualSave,
    updateActiveNote,
    fetchNotes,
  };
}