"use client";

import { useState } from "react";
import { Folder, FolderPlus, MoreVertical, Edit3, FileDown, Trash2 } from "lucide-react";
import type { MenuItem } from "@/components/ui/ContextMenu";
import type { NotebookWithCount } from "@/hooks/useNotebooks";

type NotebookSectionProps = {
  notebooks: NotebookWithCount[];
  activeNotebookId: string | null;
  onSelect: (id: string | null) => void;
  onCreate: (name: string) => Promise<boolean>;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (nb: NotebookWithCount) => void;
  onDownloadZip: (nb: NotebookWithCount) => void;
  onContextMenu: (
    e: React.MouseEvent,
    items: MenuItem[]
  ) => void;
  onOpenActionsSheet: (nb: NotebookWithCount) => void;
};

export function NotebookSection({
  notebooks,
  activeNotebookId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  onDownloadZip,
  onContextMenu,
  onOpenActionsSheet,
}: NotebookSectionProps) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const submitNew = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    void onCreate(trimmed).then((ok) => {
      if (ok) {
        setCreating(false);
        setNewName("");
      }
    });
  };

  const submitRename = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = renameValue.trim();
    if (!trimmed || !renamingId) return;
    void onRename(renamingId, trimmed);
    setRenamingId(null);
    setRenameValue("");
  };

  return (
    <div className="px-2 pt-2 pb-1 flex flex-col md:max-h-[35vh]">
      <div className="px-2 pb-1 shrink-0">
        <h3 className="text-[11px] font-semibold text-muted uppercase tracking-wider">
          Folders
        </h3>
      </div>
      <div className="overflow-y-auto overflow-x-auto pr-1 pb-1">
        <button
          onClick={() => onSelect(null)}
          className={`w-full flex items-center gap-2.5 px-3 py-3 text-[15px] md:text-[13px] rounded-lg transition-colors min-h-[44px] md:min-h-[40px] ${
            activeNotebookId === null
              ? "bg-surface-hover/80 text-text font-medium"
              : "text-muted hover:bg-surface-hover/50 hover:text-text"
          }`}
        >
          <Folder size={16} />
          All Notes
        </button>
        {notebooks.map((nb) => (
          <div key={nb.id} className="group">
            {renamingId === nb.id ? (
              <form
                className="flex items-center gap-1 px-3 py-1"
                onSubmit={submitRename}
              >
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => {
                    setRenamingId(null);
                    setRenameValue("");
                  }}
                  className="flex-1 text-xs bg-transparent outline-none border-b border-border text-text py-0.5"
                />
              </form>
            ) : (
              <div
                onClick={() => onSelect(nb.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onContextMenu(e, [
                    {
                      label: "Download Folder (.zip)",
                      icon: <FileDown size={14} />,
                      onClick: () => onDownloadZip(nb),
                    },
                    {
                      label: "Rename",
                      icon: <Edit3 size={14} />,
                      onClick: () => {
                        setRenamingId(nb.id);
                        setRenameValue(nb.name);
                      },
                    },
                    {
                      label: "Delete Folder",
                      icon: <Trash2 size={14} />,
                      onClick: () => onDelete(nb),
                      danger: true,
                      divider: true,
                    },
                  ]);
                }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-3 text-[15px] md:text-[13px] rounded-lg cursor-pointer transition-colors min-h-[44px] md:min-h-[40px] ${
                  activeNotebookId === nb.id
                    ? "bg-surface-hover/80 text-text font-medium"
                    : "text-muted hover:bg-surface-hover/50 hover:text-text"
                }`}
              >
                <span className="flex items-center gap-2.5 truncate">
                  <Folder size={16} />
                  {nb.name}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] md:text-[10px] text-muted/50 tabular-nums px-1.5 py-0.5 bg-surface-hover/50 rounded-md">
                    {nb._count.notes}
                  </span>
                  <button
                    className="md:hidden p-1.5 -mr-1.5 text-muted hover:text-text rounded-md transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenActionsSheet(nb);
                    }}
                    aria-label="Folder actions"
                  >
                    <MoreVertical size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {creating ? (
          <form className="flex items-center gap-1 px-3 py-1" onSubmit={submitNew}>
            <input
              autoFocus
              placeholder="Folder name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={() => {
                setCreating(false);
                setNewName("");
              }}
              className="flex-1 text-xs bg-transparent outline-none border-b border-border text-text py-0.5 placeholder:text-muted/50"
            />
          </form>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="w-full flex items-center gap-2.5 px-3 py-3 text-[15px] md:text-[13px] text-muted/50 hover:text-muted hover:bg-surface-hover/50 rounded-lg transition-colors min-h-[44px] md:min-h-[40px]"
          >
            <FolderPlus size={16} />
            New Folder
          </button>
        )}
      </div>
    </div>
  );
}