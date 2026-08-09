"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FilePlus } from "lucide-react";
import { ContextMenu, type MenuItem } from "@/components/ui/ContextMenu";
import { BottomSheet, type SheetItem } from "@/components/ui/BottomSheet";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { Sidebar } from "@/components/notes/Sidebar";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { EditorHeader } from "@/components/notes/EditorHeader";
import { FloatingCreateButton } from "@/components/notes/FloatingCreateButton";
import { TemplateManager, applyTemplatePlaceholders, type NoteTemplate } from "@/components/editor/Templates";
import { toast } from "sonner";
import { useNotes } from "@/hooks/useNotes";
import { useNotebooks } from "@/hooks/useNotebooks";
import { useDownload } from "@/hooks/useDownload";
import type { NoteWithTags } from "@/types";
import type { NotebookWithCount } from "@/hooks/useNotebooks";
import { normalizeNoteTitle } from "@/lib/fileType";

export default function NotesPage() {
  const router = useRouter();
  const notes = useNotes();
  const { notebooks, createNotebook, renameNotebook, deleteNotebook, fetchNotebooks } =
    useNotebooks();
  const { downloadFile } = useDownload();

  const [activeNotebookId, setActiveNotebookId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [ctxMenu, setCtxMenu] = useState<{
    x: number;
    y: number;
    items: MenuItem[];
    placement?: "right" | "left";
  } | null>(null);

  const [bottomSheet, setBottomSheet] = useState<{
    open: boolean;
    title: string;
    items: SheetItem[];
  }>({ open: false, title: "", items: [] });

  const [confirm, setConfirm] = useState<{
    open: boolean;
    title: string;
    description?: string;
    confirmLabel?: string;
    destructive?: boolean;
    onConfirm: () => void;
  }>({ open: false, title: "", onConfirm: () => {} });

  const [templatesOpen, setTemplatesOpen] = useState(false);

  const lastEscRef = useRef<number>(0);

  const filteredNotes = notes.notes.filter((n) =>
    activeNotebookId === null ? true : n.notebookId === activeNotebookId
  );

  useEffect(() => {
    if (!notes.activeNote) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const now = Date.now();
      if (now - lastEscRef.current < 400) {
        handleCloseWithConfirm();
        lastEscRef.current = 0;
      } else {
        lastEscRef.current = now;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes.activeNote]);

  const handleCloseWithConfirm = useCallback(async () => {
    if (
      notes.hasUnsavedChanges &&
      !notes.autoSaveEnabled &&
      notes.activeNote
    ) {
      setConfirm({
        open: true,
        title: `Save changes to "${notes.activeNote.title}"?`,
        description:
          "You have unsaved changes. Do you want to save them before closing?",
        onConfirm: async () => {
          await notes.handleManualSave();
        },
      });
      return;
    }
    notes.closeActiveNote();
  }, [notes]);

  const handleLogout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      localStorage.removeItem("nexus_token");
      router.push("/login");
    }
  }, [router]);

  const handleCreateNote = useCallback(async () => {
    const created = await notes.createNote(activeNotebookId);
    if (created) setIsEditing(true);
  }, [notes, activeNotebookId]);

  const handleCreateFromTemplate = useCallback(
    async (template: NoteTemplate) => {
      const title = applyTemplatePlaceholders(template.title || "Untitled");
      const md = applyTemplatePlaceholders(template.markdownContent ?? "");
      const created = await notes.createNote(activeNotebookId, {
        title,
        markdownContent: md,
        fileType: ".md",
      });
      if (!created) return;
      setIsEditing(true);
      toast.success(`Created from "${template.name}"`);
    },
    [notes, activeNotebookId]
  );

  const handleCreateFolder = useCallback(async () => {
    const name = window.prompt("Folder name");
    if (!name || !name.trim()) return;
    await createNotebook(name.trim());
  }, [createNotebook]);

  const handleDownloadNote = useCallback(
    (note: NoteWithTags) => {
      void downloadFile(
        `/api/notes/${note.id}/download`,
        note.title,
        "Note downloaded."
      );
    },
    [downloadFile]
  );

  const handleDownloadZip = useCallback(
    (nb: NotebookWithCount) => {
      void downloadFile(
        `/api/notebooks/${nb.id}/download`,
        `${nb.name}.zip`,
        "Folder download started."
      );
    },
    [downloadFile]
  );

  const buildNoteContextMenu = useCallback(
    (note: NoteWithTags, rect?: DOMRect): MenuItem[] => [
      {
        label: note.pinned ? "Unpin" : "Pin",
        onClick: () => notes.togglePin(note),
      },
      {
        label: "Download File",
        onClick: () => handleDownloadNote(note),
      },
      { label: "Move to Folder", onClick: () => {}, divider: true },
      ...notebooks.map((nb) => ({
        label: `  📁 ${nb.name}`,
        onClick: () => notes.moveNoteToFolder(note.id, nb.id),
      })),
      {
        label: "Delete",
        onClick: () => {
          setConfirm({
            open: true,
            title: "Delete note?",
            description: `"${note.title}" will be permanently deleted.`,
            destructive: true,
            confirmLabel: "Delete",
            onConfirm: () => notes.deleteNote(note.id),
          });
        },
        danger: true,
        divider: true,
      } as MenuItem,
    ],
    [notebooks, notes, handleDownloadNote]
  );

  const openNoteActionsSheet = useCallback(
    (note: NoteWithTags) => {
      setBottomSheet({
        open: true,
        title: "Note Actions",
        items: [
          {
            label: note.pinned ? "Unpin Note" : "Pin Note",
            onClick: () => notes.togglePin(note),
          },
          {
            label: "Download",
            onClick: () => handleDownloadNote(note),
          },
          {
            label: "Delete Note",
            danger: true,
            onClick: () => {
              setConfirm({
                open: true,
                title: "Delete note?",
                description: `"${note.title}" will be permanently deleted.`,
                destructive: true,
                confirmLabel: "Delete",
                onConfirm: () => notes.deleteNote(note.id),
              });
            },
          },
        ],
      });
    },
    [notes, handleDownloadNote]
  );

  const openFolderActionsSheet = useCallback(
    (nb: NotebookWithCount) => {
      setBottomSheet({
        open: true,
        title: "Folder Actions",
        items: [
          {
            label: "Download (.zip)",
            onClick: () => handleDownloadZip(nb),
          },
          {
            label: "Delete Folder",
            danger: true,
            onClick: () => {
              setConfirm({
                open: true,
                title: "Delete folder?",
                description: `"${nb.name}" will be deleted. Notes inside will become unfiled.`,
                destructive: true,
                confirmLabel: "Delete",
                onConfirm: () => deleteNotebook(nb.id),
              });
            },
          },
        ],
      });
    },
    [deleteNotebook, handleDownloadZip]
  );

  const handleDeleteNotebook = useCallback(
    (nb: NotebookWithCount) => {
      setConfirm({
        open: true,
        title: "Delete folder?",
        description: `"${nb.name}" will be deleted. Notes inside will become unfiled.`,
        destructive: true,
        confirmLabel: "Delete",
        onConfirm: () => deleteNotebook(nb.id),
      });
    },
    [deleteNotebook]
  );

  const handleNoteContextMenu = useCallback(
    (e: React.MouseEvent, note: NoteWithTags, rect?: DOMRect) => {
      const x = rect?.left ?? e.clientX;
      const y = rect?.bottom ?? e.clientY;
      setCtxMenu({
        x,
        y,
        items: buildNoteContextMenu(note, rect),
        placement: rect ? "left" : "right",
      });
    },
    [buildNoteContextMenu]
  );

  const handleNotebookContextMenu = useCallback(
    (e: React.MouseEvent, items: MenuItem[]) => {
      e.preventDefault();
      setCtxMenu({ x: e.clientX, y: e.clientY, items });
    },
    []
  );

  const handleSelectNote = useCallback(
    (note: NoteWithTags) => {
      if (notes.activeNote?.id === note.id) {
        setIsEditing(false);
        return;
      }
      if (
        notes.hasUnsavedChanges &&
        !notes.autoSaveEnabled &&
        notes.activeNote
      ) {
        setConfirm({
          open: true,
          title: `Save changes to "${notes.activeNote.title}"?`,
          description:
            "You have unsaved changes. Do you want to save them before switching?",
          onConfirm: async () => {
            await notes.handleManualSave();
            notes.switchNote(note);
          },
        });
        return;
      }
      notes.switchNote(note);
      setIsEditing(false);
    },
    [notes]
  );

  const handleRefresh = useCallback(() => {
    void notes.fetchNotes(notes.search);
    void fetchNotebooks();
  }, [notes, fetchNotebooks]);

  const exportMarkdown = useCallback(() => {
    if (!notes.activeNote) return;
    const content =
      notes.activeNote.fileType === ".md"
        ? notes.activeNote.markdownContent
        : "(Raw JSON content not suitable for Markdown export)";
    const blob = new Blob([content ?? ""], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${notes.activeNote.title || "Untitled"}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [notes.activeNote]);

  const exportPdf = useCallback(() => {
    window.print();
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-bg text-text selection:bg-accent/20 selection:text-text">
      <Sidebar
        isOpen={sidebarOpen}
        onOpenChange={setSidebarOpen}
        search={notes.search}
        onSearchChange={notes.setSearch}
        notebooks={notebooks}
        activeNotebookId={activeNotebookId}
        onSelectNotebook={setActiveNotebookId}
        onCreateNotebook={createNotebook}
        onRenameNotebook={renameNotebook}
        onDeleteNotebook={handleDeleteNotebook}
        onDownloadNotebookZip={handleDownloadZip}
        onNotebookContextMenu={handleNotebookContextMenu}
        onOpenNotebookActionsSheet={openFolderActionsSheet}
        notes={filteredNotes}
        loadingNotes={notes.loading}
        activeNoteId={notes.activeNote?.id ?? null}
        onSelectNote={handleSelectNote}
        onCreateNote={handleCreateNote}
        onLogout={handleLogout}
        onRefresh={handleRefresh}
        onNoteContextMenu={handleNoteContextMenu}
        onOpenNoteActionsSheet={openNoteActionsSheet}
        onTogglePin={notes.togglePin}
      />

      <main
        className={`flex-1 flex-col overflow-hidden bg-bg relative w-full ${
          notes.activeNote ? "flex" : "hidden md:flex"
        }`}
      >
        {notes.activeNote ? (
          <>
            <EditorHeader
              notebookName={notes.activeNote.notebook?.name ?? "All Notes"}
              noteTitle={notes.activeNote.title}
              isEditing={isEditing}
              onToggleEdit={() => setIsEditing((v) => !v)}
              onClose={handleCloseWithConfirm}
              autoSaveEnabled={notes.autoSaveEnabled}
              onToggleAutoSave={(next) => {
                notes.setAutoSaveEnabled(next);
              }}
              saveStatus={
                notes.saving
                  ? "saving"
                  : notes.hasUnsavedChanges
                    ? "unsaved"
                    : "saved"
              }
              canManualSave={notes.hasUnsavedChanges && !notes.saving}
              onManualSave={() => void notes.handleManualSave()}
              onExportMarkdown={exportMarkdown}
              onExportPdf={exportPdf}
            />
            <NoteEditor
              note={notes.activeNote}
              isEditing={isEditing}
              onChangeTitle={(title) => {
                notes.updateActiveNote((n) => ({ ...n, title }));
                notes.autoSave(notes.activeNote!.id, "title", title);
              }}
              onChangeContent={(content) => {
                notes.updateActiveNote((n) => ({ ...n, content }));
                notes.autoSave(notes.activeNote!.id, "content", content);
              }}
              onChangeMarkdown={(md) => {
                notes.updateActiveNote((n) => ({ ...n, markdownContent: md }));
                notes.autoSave(
                  notes.activeNote!.id,
                  "markdownContent",
                  md
                );
              }}
              onChangeFileType={(ft) => {
                notes.updateActiveNote((n) => ({ ...n, fileType: ft }));
                notes.autoSave(notes.activeNote!.id, "fileType", ft);
              }}
              onTogglePin={() => {
                if (!notes.activeNote) return;
                const next = !notes.activeNote.pinned;
                notes.updateActiveNote((n) => ({ ...n, pinned: next }));
                notes.autoSave(notes.activeNote.id, "pinned", next);
              }}
              onChangeTags={(tags) => {
                if (!notes.activeNote) return;
                notes.updateActiveNote((n) => ({
                  ...n,
                  tags: tags.map((name) => ({ tag: { id: name, name } })),
                }));
                notes.autoSave(notes.activeNote.id, "tags", tags);
              }}
              onSelectBacklink={(id) => {
                const target = notes.notes.find((n) => n.id === id);
                if (target) {
                  if (
                    notes.hasUnsavedChanges &&
                    !notes.autoSaveEnabled &&
                    notes.activeNote
                  ) {
                    setConfirm({
                      open: true,
                      title: `Save changes to "${notes.activeNote.title}"?`,
                      description:
                        "You have unsaved changes. Do you want to save them before switching?",
                      onConfirm: async () => {
                        await notes.handleManualSave();
                        notes.switchNote(target);
                      },
                    });
                  } else {
                    notes.switchNote(target);
                  }
                  setIsEditing(false);
                }
              }}
              onWikiLinkClick={(title) => {
                // Find the note by title (case-insensitive, strip extension)
                const target = notes.notes.find(
                  (n) =>
                    normalizeNoteTitle(n.title).toLowerCase() ===
                    title.toLowerCase()
                );
                if (!target) {
                  toast.error(`Note "${title}" not found`);
                  return;
                }
                if (
                  notes.hasUnsavedChanges &&
                  !notes.autoSaveEnabled &&
                  notes.activeNote
                ) {
                  setConfirm({
                    open: true,
                    title: `Save changes to "${notes.activeNote.title}"?`,
                    description:
                      "You have unsaved changes. Do you want to save them before switching?",
                    onConfirm: async () => {
                      await notes.handleManualSave();
                      notes.switchNote(target);
                    },
                  });
                } else {
                  notes.switchNote(target);
                }
                setIsEditing(false);
              }}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted max-w-xs mx-auto text-center px-4">
            <div className="w-12 h-12 rounded-xl bg-surface-hover/30 flex items-center justify-center mb-2">
              <FilePlus size={22} strokeWidth={1.5} className="text-muted/80" />
            </div>
            <div>
              <h2 className="text-[15px] font-medium text-text mb-1 tracking-tight">
                Select a note
              </h2>
              <p className="text-[13px] text-muted mb-6">
                Choose a note from the sidebar or create a new one.
              </p>
            </div>
            <button
              onClick={handleCreateNote}
              className="px-4 py-2 rounded-md transition-all hover:bg-surface-hover text-text font-medium flex items-center gap-2 text-[13px]"
            >
              <FilePlus size={14} />
              Create Note
            </button>
          </div>
        )}
      </main>

      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={ctxMenu.items}
          placement={ctxMenu.placement}
          onClose={() => setCtxMenu(null)}
        />
      )}

      <BottomSheet
        isOpen={bottomSheet.open}
        onClose={() => setBottomSheet((s) => ({ ...s, open: false }))}
        title={bottomSheet.title}
        items={bottomSheet.items}
      />

      <ConfirmDialog
        isOpen={confirm.open}
        onClose={() => setConfirm({ ...confirm, open: false })}
        onConfirm={confirm.onConfirm}
        title={confirm.title}
        description={confirm.description}
        destructive={confirm.destructive}
        confirmLabel={confirm.confirmLabel ?? "Confirm"}
      />

      {templatesOpen && (
        <TemplateManager
          onClose={() => setTemplatesOpen(false)}
          onSelectTemplate={(t) => {
            void handleCreateFromTemplate(t);
          }}
        />
      )}

      <FloatingCreateButton
        onCreateBlank={() => void handleCreateNote()}
        onCreateFromTemplate={() => setTemplatesOpen(true)}
        onCreateFolder={() => void handleCreateFolder()}
        hasNotebooks={notebooks.length > 0}
      />
    </div>
  );
}