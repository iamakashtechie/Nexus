"use client";

import { useEffect, useRef, useCallback } from "react";

export type MenuItem = {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  divider?: boolean;
  submenu?: MenuItem[];
};

type ContextMenuProps = {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
};

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("contextmenu", handleClickOutside);
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("contextmenu", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [handleClickOutside, onClose]);

  // Adjust position to keep menu inside viewport
  const style: React.CSSProperties = {
    position: "fixed",
    top: y,
    left: x,
    zIndex: 1000,
  };

  return (
    <div ref={ref} style={style} className="min-w-[160px] py-1 bg-surface border border-border rounded-lg shadow-lg animate-in fade-in zoom-in-95 duration-100">
      {items.map((item, i) => (
        <div key={i}>
          {item.divider && <div className="h-px bg-border my-1 mx-2" />}
          <button
            onClick={() => {
              item.onClick();
              onClose();
            }}
            className={`w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
              item.danger
                ? "text-red-500 hover:bg-red-500/10"
                : "text-text hover:bg-surface-hover"
            }`}
          >
            {item.icon && <span className="w-4 h-4 flex items-center justify-center opacity-70">{item.icon}</span>}
            {item.label}
          </button>
        </div>
      ))}
    </div>
  );
}
