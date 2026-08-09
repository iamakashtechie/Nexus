"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, FileText, FolderPlus, LayoutTemplate, X } from "lucide-react";

type ActionItem = {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  onSelect: () => void;
};

type FloatingCreateMenuProps = {
  onCreateBlank: () => void;
  onCreateFromTemplate: () => void;
  onCreateFolder: () => void;
  hasNotebooks: boolean;
};

export function FloatingCreateButton({
  onCreateBlank,
  onCreateFromTemplate,
  onCreateFolder,
  hasNotebooks,
}: FloatingCreateMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", escHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", escHandler);
    };
  }, [open]);

  const items: ActionItem[] = [
    {
      id: "blank",
      label: "New note",
      description: "Start with an empty note",
      icon: <FileText size={14} />,
      onSelect: () => {
        onCreateBlank();
        setOpen(false);
      },
    },
    {
      id: "template",
      label: "New from template",
      description: "Use a saved structure",
      icon: <LayoutTemplate size={14} />,
      onSelect: () => {
        onCreateFromTemplate();
        setOpen(false);
      },
    },
    {
      id: "folder",
      label: "New folder",
      description: hasNotebooks ? "Group related notes" : "Create your first folder",
      icon: <FolderPlus size={14} />,
      onSelect: () => {
        onCreateFolder();
        setOpen(false);
      },
    },
  ];

  return (
    <div
      ref={ref}
      className="md:hidden fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2"
    >
      {open && (
        <div className="w-[220px] bg-surface border border-border rounded-xl shadow-2xl p-1 mb-1 animate-in fade-in slide-in-from-bottom-2">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={item.onSelect}
              className="flex items-start gap-2.5 w-full px-3 py-2 rounded-md text-left hover:bg-surface-hover"
            >
              <span className="text-muted mt-0.5 shrink-0">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-text">{item.label}</div>
                <div className="text-[11px] text-muted/80 truncate">
                  {item.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-14 h-14 rounded-full bg-accent text-bg shadow-lg flex items-center justify-center active:scale-95 transition-transform ${
          open ? "rotate-45" : ""
        }`}
        title="Create"
        aria-label="Create"
        aria-expanded={open}
      >
        {open ? <X size={22} /> : <Plus size={22} strokeWidth={2.5} />}
      </button>
    </div>
  );
}
