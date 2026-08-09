"use client";

import { useEffect, useRef } from "react";
import { Link as LinkIcon, Image as ImageIcon, X } from "lucide-react";

type CommonProps = {
  isOpen: boolean;
  onClose: () => void;
};

type LinkPickerProps = CommonProps & {
  initialValue?: string;
  onSubmit: (url: string) => void;
};

export function LinkPickerDialog({ isOpen, onClose, initialValue, onSubmit }: LinkPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        if (inputRef.current) {
          inputRef.current.value = initialValue ?? "";
          inputRef.current.focus();
        }
      });
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = (inputRef.current?.value ?? "").trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-bg/70 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Add link"
    >
      <div
        className="w-full max-w-sm bg-surface border border-border rounded-xl shadow-2xl p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-text">
            <LinkIcon size={15} />
            <span className="text-sm font-medium">Add link</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-text p-1 rounded-md hover:bg-surface-hover"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <input
            key={isOpen ? "open" : "closed"}
            ref={inputRef}
            type="text"
            defaultValue={initialValue ?? ""}
            placeholder="https://example.com or [[Note Title]]"
            className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-md outline-none focus:border-accent text-text placeholder:text-muted/50"
          />
          <div className="flex justify-end gap-2 mt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-muted hover:text-text rounded-md hover:bg-surface-hover"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 text-xs font-medium bg-text text-bg rounded-md hover:opacity-90"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type ImagePickerProps = CommonProps & {
  onSubmit: (url: string, alt: string) => void;
};

export function ImagePickerDialog({ isOpen, onClose, onSubmit }: ImagePickerProps) {
  const urlRef = useRef<HTMLInputElement>(null);
  const altRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => urlRef.current?.focus());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = (urlRef.current?.value ?? "").trim();
    if (!trimmed) return;
    onSubmit(trimmed, (altRef.current?.value ?? "").trim());
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-bg/70 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Add image"
    >
      <div
        className="w-full max-w-sm bg-surface border border-border rounded-xl shadow-2xl p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-text">
            <ImageIcon size={15} />
            <span className="text-sm font-medium">Add image</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-text p-1 rounded-md hover:bg-surface-hover"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <input
            ref={urlRef}
            type="text"
            placeholder="https://example.com/image.png"
            className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-md outline-none focus:border-accent text-text placeholder:text-muted/50"
          />
          <input
            ref={altRef}
            type="text"
            placeholder="Alt text (optional)"
            className="w-full mt-2 px-3 py-2 text-sm bg-bg border border-border rounded-md outline-none focus:border-accent text-text placeholder:text-muted/50"
          />
          <div className="flex justify-end gap-2 mt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-muted hover:text-text rounded-md hover:bg-surface-hover"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 text-xs font-medium bg-text text-bg rounded-md hover:opacity-90"
            >
              Insert
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
