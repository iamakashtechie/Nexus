"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

type DialogProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
};

export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dialog-title"
        >
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />
          <motion.div
            ref={dialogRef}
            tabIndex={-1}
            className="relative w-full max-w-md rounded-xl border border-border bg-surface shadow-2xl outline-none"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.15, ease: [0.32, 0.72, 0, 1] }}
          >
            <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-2">
              <div className="flex-1 min-w-0">
                <h2
                  id="dialog-title"
                  className="text-[15px] font-semibold text-text tracking-tight"
                >
                  {title}
                </h2>
                {description && (
                  <p className="text-[13px] text-muted mt-1.5 leading-relaxed">
                    {description}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                aria-label="Close dialog"
                className="p-1 -mr-1 -mt-1 rounded-md text-muted hover:text-text hover:bg-surface-hover transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            {children && <div className="px-5 py-3">{children}</div>}
            {footer && (
              <div className="flex items-center justify-end gap-2 px-5 pb-5 pt-2">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

type ConfirmDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
}: ConfirmDialogProps) {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-md text-[13px] font-medium text-text hover:bg-surface-hover transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-3 py-1.5 rounded-md text-[13px] font-medium text-white transition-colors ${
              destructive
                ? "bg-red-500 hover:bg-red-600"
                : "bg-accent hover:bg-accent-hover"
            }`}
          >
            {confirmLabel}
          </button>
        </>
      }
    />
  );
}