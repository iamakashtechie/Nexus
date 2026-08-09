"use client";

import {
  LogOut,
  Menu,
  Plus,
  RefreshCw,
  X,
  FileText,
  MoreVertical,
} from "lucide-react";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { normalizeNoteTitle } from "@/lib/fileType";
import type { MenuItem } from "@/components/ui/ContextMenu";
import type { NoteWithTags } from "@/types";
import type { NotebookWithCount } from "@/hooks/useNotebooks";
import { SearchBar } from "./SearchBar";
import { NotebookSection } from "./NotebookSection";

type SidebarProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  search: string;
  onSearchChange: (s: string) => void;
  notebooks: NotebookWithCount[];
  activeNotebookId: string | null;
  onSelectNotebook: (id: string | null) => void;
  onCreateNotebook: (name: string) => Promise<boolean>;
  onRenameNotebook: (id: string, name: string) => Promise<void>;
  onDeleteNotebook: (nb: NotebookWithCount) => void;
  onDownloadNotebookZip: (nb: NotebookWithCount) => void;
  onNotebookContextMenu: (e: React.MouseEvent, items: MenuItem[]) => void;
  onOpenNotebookActionsSheet: (nb: NotebookWithCount) => void;
  notes: NoteWithTags[];
  loadingNotes: boolean;
  activeNoteId: string | null;
  onSelectNote: (note: NoteWithTags) => void;
  onCreateNote: () => void;
  onLogout: () => void;
  onRefresh: () => void;
  onNoteContextMenu: (
    e: React.MouseEvent,
    note: NoteWithTags,
    rect?: DOMRect
  ) => void;
  onOpenNoteActionsSheet: (note: NoteWithTags) => void;
  onTogglePin: (note: NoteWithTags) => void;
};

export function Sidebar({
  isOpen,
  onOpenChange,
  search,
  onSearchChange,
  notebooks,
  activeNotebookId,
  onSelectNotebook,
  onCreateNotebook,
  onRenameNotebook,
  onDeleteNotebook,
  onDownloadNotebookZip,
  onNotebookContextMenu,
  onOpenNotebookActionsSheet,
  notes,
  loadingNotes,
  activeNoteId,
  onSelectNote,
  onCreateNote,
  onLogout,
  onRefresh,
  onNoteContextMenu,
  onOpenNoteActionsSheet,
  onTogglePin,
}: SidebarProps) {
  return (
    <aside
      className={`flex-col w-full md:w-72 shrink-0 border-r border-border bg-surface relative ${isOpen || !activeNoteId ? "flex" : "hidden md:flex"}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border/50 shrink-0 z-10 bg-surface">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-[4px] bg-text text-bg flex items-center justify-center font-bold text-[11px] tracking-tighter">
            N
          </div>
          <span className="font-semibold text-base md:text-sm tracking-tight text-text">
            Nexus
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="hidden md:flex items-center gap-1">
            <ThemeSwitcher />
            <button
              data-testid="new-note-btn"
              onClick={onCreateNote}
              className="p-1.5 rounded-md text-muted hover:text-text hover:bg-surface-hover transition-colors"
              title="New Note"
            >
              <Plus size={16} />
            </button>
            <button
              onClick={onLogout}
              className="p-1.5 rounded-md text-muted hover:text-text hover:bg-surface-hover transition-colors"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
          <button
            className="md:hidden p-1.5 -mr-1.5 text-muted hover:text-text transition-colors rounded-md"
            onClick={() => onOpenChange(true)}
            aria-label="Open menu"
          >
            <Menu size={24} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-bg/80 backdrop-blur-sm z-[100]"
          onClick={() => onOpenChange(false)}
        />
      )}

      {/* Mobile drawer wrapper */}
      <div
        className={`fixed inset-y-0 right-0 z-[110] w-64 bg-surface border-l border-border transform transition-transform duration-300 md:static md:w-auto md:z-auto md:border-none md:transform-none md:transition-none flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"
        }`}
      >
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border/50 shrink-0">
          <span className="font-semibold text-sm">Menu</span>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1.5 -mr-1.5 rounded-md text-muted hover:text-text bg-surface-hover transition-colors"
            aria-label="Close menu"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <SearchBar value={search} onChange={onSearchChange} />
          <NotebookSection
            notebooks={notebooks}
            activeNotebookId={activeNotebookId}
            onSelect={(id) => {
              onSelectNotebook(id);
              onOpenChange(false);
            }}
            onCreate={onCreateNotebook}
            onRename={onRenameNotebook}
            onDelete={onDeleteNotebook}
            onDownloadZip={onDownloadNotebookZip}
            onContextMenu={onNotebookContextMenu}
            onOpenActionsSheet={onOpenNotebookActionsSheet}
          />
        </div>

        <div className="md:hidden p-4 border-t border-border/50 flex items-center justify-between shrink-0">
          <button
            onClick={onLogout}
            className="text-[13px] text-muted flex items-center gap-2"
          >
            <LogOut size={16} />
            Logout
          </button>
          <ThemeSwitcher />
        </div>
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto px-2 pb-24 md:pb-4 pt-2 bg-surface">
        <div className="px-2 pb-1 flex items-center justify-between">
          <h3 className="text-[11px] font-semibold text-muted uppercase tracking-wider">
            Notes
          </h3>
          <button
            onClick={onRefresh}
            className="p-2 rounded-lg text-muted hover:text-text hover:bg-surface-hover transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
            title="Refresh notes"
            aria-label="Refresh notes"
          >
            <RefreshCw
              size={14}
              className={loadingNotes ? "animate-spin" : ""}
            />
          </button>
        </div>

        {loadingNotes ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted">
            <RefreshCw
              size={24}
              strokeWidth={1.5}
              className="mb-2 animate-spin"
            />
            <p className="text-xs mt-1">Fetching notes...</p>
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted">
            <FileText
              size={24}
              strokeWidth={1.5}
              className="mb-2 opacity-50"
            />
            <p className="text-xs">No notes found</p>
          </div>
        ) : null}

        {notes.map((note) => (
          <NoteListItem
            key={note.id}
            note={note}
            isActive={activeNoteId === note.id}
            onSelect={onSelectNote}
            onContextMenu={onNoteContextMenu}
            onOpenActionsSheet={onOpenNoteActionsSheet}
            onTogglePin={onTogglePin}
          />
        ))}
      </div>

      {/* Mobile FAB */}
      <button
        onClick={onCreateNote}
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 rounded-full bg-accent text-bg shadow-lg flex items-center justify-center active:scale-95 transition-transform z-40"
        title="New Note"
        aria-label="New note"
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>
    </aside>
  );
}

type NoteListItemProps = {
  note: NoteWithTags;
  isActive: boolean;
  onSelect: (note: NoteWithTags) => void;
  onContextMenu: (
    e: React.MouseEvent,
    note: NoteWithTags,
    rect?: DOMRect
  ) => void;
  onOpenActionsSheet: (note: NoteWithTags) => void;
  onTogglePin: (note: NoteWithTags) => void;
};

function NoteListItem({
  note,
  isActive,
  onSelect,
  onContextMenu,
  onOpenActionsSheet,
  onTogglePin,
}: NoteListItemProps) {
  return (
    <div
      onClick={() => onSelect(note)}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu(e, note);
      }}
      className={`group relative flex items-center gap-2.5 px-3 py-3 rounded-lg cursor-pointer transition-all mb-1 min-h-[56px] ${
        isActive
          ? "bg-surface-hover/80 text-text"
          : "hover:bg-surface-hover/50 text-text/80"
      }`}
    >
      <div className="flex-1 min-w-0 py-1">
        <p
          className={`text-[15px] md:text-[13px] truncate ${
            isActive ? "font-medium text-text" : "font-normal"
          }`}
        >
          {normalizeNoteTitle(note.title)}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-[11px] text-muted/70">
            {new Date(note.updatedAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </p>
          {note.pinned && <span className="w-1.5 h-1.5 rounded-full bg-text/30" />}
        </div>
      </div>
      <button
        className="md:hidden p-2 -mr-1.5 text-muted min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-surface-hover transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          onOpenActionsSheet(note);
        }}
        aria-label="Note actions"
      >
        <MoreVertical size={18} />
      </button>
      <div className="hidden md:group-hover:flex items-center gap-0.5 shrink-0 bg-gradient-to-l from-surface-hover via-surface-hover to-transparent pl-6 pr-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin(note);
          }}
          className="text-muted hover:text-accent p-2 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
          title={note.pinned ? "Unpin" : "Pin"}
        >
          <PinIcon filled={!!note.pinned} size={16} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            onContextMenu(e, note, rect);
          }}
          className="text-muted hover:text-text p-2 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
          title="More"
        >
          <MoreVertical size={16} />
        </button>
      </div>
    </div>
  );
}

function PinIcon({ filled, size = 16 }: { filled: boolean; size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 17v5" />
      <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
    </svg>
  );
}