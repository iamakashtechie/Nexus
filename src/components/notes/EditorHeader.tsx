"use client";

import {
  ArrowLeft,
  ChevronDown,
  Download,
  Eye,
  Pencil,
  X,
  FileText,
} from "lucide-react";
import { normalizeNoteTitle } from "@/lib/fileType";

type SaveStatus = "saved" | "saving" | "unsaved";

type EditorHeaderProps = {
  notebookName: string;
  noteTitle: string;
  isEditing: boolean;
  onToggleEdit: () => void;
  onClose: () => void;
  autoSaveEnabled: boolean;
  onToggleAutoSave: (next: boolean) => void;
  saveStatus: SaveStatus;
  canManualSave: boolean;
  onManualSave: () => void;
  onExportMarkdown: () => void;
  onExportPdf: () => void;
};

export function EditorHeader({
  notebookName,
  noteTitle,
  isEditing,
  onToggleEdit,
  onClose,
  autoSaveEnabled,
  onToggleAutoSave,
  saveStatus,
  canManualSave,
  onManualSave,
  onExportMarkdown,
  onExportPdf,
}: EditorHeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 md:px-8 py-3 md:py-5 shrink-0 border-b border-border/50 md:border-none">
      <div className="flex items-center gap-1.5 md:gap-2 text-xs text-muted">
        <button
          onClick={onClose}
          className="md:hidden flex items-center justify-center text-muted hover:text-text p-2 -ml-2 rounded-md transition-colors font-medium"
          title="Back"
          aria-label="Back"
        >
          <ArrowLeft size={22} />
        </button>
        <span className="truncate max-w-[80px] md:max-w-[200px]">
          {notebookName}
        </span>
        <span className="text-border">/</span>
        <span className="text-text font-medium truncate max-w-[100px] md:max-w-xs">
          {normalizeNoteTitle(noteTitle)}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <label
          className="hidden md:flex items-center gap-1.5 cursor-pointer text-xs text-muted hover:text-text transition-colors"
          title="Toggle Auto-Save"
        >
          <input
            type="checkbox"
            checked={autoSaveEnabled}
            onChange={(e) => onToggleAutoSave(e.target.checked)}
            className="accent-accent w-3 h-3 cursor-pointer"
          />
          Auto-Save
        </label>

        <div className="w-px h-3 bg-border mx-1" />

        <span className="text-[11px] text-muted flex items-center gap-1.5 justify-end w-auto md:min-w-[60px]">
          {saveStatus === "saving" ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <span className="hidden md:inline">Saving...</span>
            </>
          ) : saveStatus === "unsaved" ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
              <span className="hidden md:inline">Unsaved</span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="hidden md:inline">Saved</span>
            </>
          )}
        </span>

        {!autoSaveEnabled && (
          <button
            onClick={onManualSave}
            disabled={!canManualSave}
            className="text-xs font-medium px-3 py-1.5 rounded-md bg-text text-bg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Save
          </button>
        )}

        <button
          onClick={onToggleEdit}
          className={`flex items-center justify-center text-xs font-medium px-2 sm:px-3 py-1.5 rounded-md hover:bg-surface-hover transition-colors border ${
            isEditing
              ? "border-border/50 text-text"
              : "border-transparent text-muted"
          }`}
          title={isEditing ? "View Mode" : "Edit Mode"}
        >
          <span className="hidden sm:inline">
            {isEditing ? "View Mode" : "Edit Mode"}
          </span>
          <span className="sm:hidden">
            {isEditing ? <Eye size={16} /> : <Pencil size={16} />}
          </span>
        </button>

        <ExportDropdown
          onExportMarkdown={onExportMarkdown}
          onExportPdf={onExportPdf}
        />

        <button
          onClick={onClose}
          className="text-muted hover:text-text p-1.5 ml-1 rounded-md transition-colors hidden md:flex items-center justify-center bg-surface-hover/50 hover:bg-surface-hover border border-border/50"
          title="Close Note"
          aria-label="Close note"
        >
          <X size={16} />
        </button>
      </div>
    </header>
  );
}

function ExportDropdown({
  onExportMarkdown,
  onExportPdf,
}: {
  onExportMarkdown: () => void;
  onExportPdf: () => void;
}) {
  return (
    <details className="relative hidden sm:block">
      <summary
        className="list-none text-xs font-medium px-3 py-1.5 rounded-md text-text hover:bg-surface-hover transition-colors border border-transparent cursor-pointer flex items-center gap-1"
        title="Export"
      >
        Export
        <ChevronDown size={12} />
      </summary>
      <div className="absolute right-0 top-full mt-1 min-w-[200px] py-1 bg-surface border border-border rounded-lg shadow-lg z-50">
        <button
          onClick={onExportMarkdown}
          className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs text-text hover:bg-surface-hover transition-colors"
        >
          <FileText size={14} className="opacity-70" />
          Export as Markdown (.md)
        </button>
        <button
          onClick={onExportPdf}
          className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs text-text hover:bg-surface-hover transition-colors"
        >
          <Download size={14} className="opacity-70" />
          Export as PDF
        </button>
      </div>
    </details>
  );
}