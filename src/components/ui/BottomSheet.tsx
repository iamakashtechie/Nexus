"use client";

/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useCallback, useState, useRef } from "react";

export type SheetItem = {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
};

type BottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  items: SheetItem[];
};

export function BottomSheet({ isOpen, onClose, title, items }: BottomSheetProps) {
  const [isClosing, setIsClosing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Handle open/close - using a single effect with clear transitions
  useEffect(() => {
    if (isOpen) {
      // Opening: first make visible, then animate in
      setIsVisible(true);
      // Small delay to ensure DOM is ready before animating
      timeoutRef.current = setTimeout(() => {
        setIsClosing(false);
        setDragY(0);
      }, 10);
    } else if (!isOpen && isVisible) {
      // Closing: animate out first
      setIsClosing(true);
      timeoutRef.current = setTimeout(() => {
        setIsVisible(false);
        setDragY(0);
      }, 200);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  // Touch/drag handlers for swipe to dismiss
  const handleTouchStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    startYRef.current = clientY;
    currentYRef.current = clientY;
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging) return;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    currentYRef.current = clientY;
    const deltaY = Math.max(0, clientY - startYRef.current);
    setDragY(deltaY);
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    const deltaY = currentYRef.current - startYRef.current;
    // If dragged down more than 100px, close
    if (deltaY > 100) {
      onClose();
    } else {
      setDragY(0);
    }
  }, [onClose]);

  if (!isVisible && !isOpen) return null;

  const transform = isClosing
    ? "translateY(100%)"
    : `translateY(${dragY}px)`;

  return (
    <div
      className="fixed inset-0 z-[150] md:hidden"
      style={{ opacity: isClosing ? 0 : 1, transition: isDragging ? undefined : "opacity 0.2s ease" }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        style={{ opacity: isDragging ? Math.max(0.3, 1 - dragY / 400) : undefined }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-2xl shadow-2xl"
        style={{
          transform,
          transition: isDragging ? undefined : "transform 0.2s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseMove={handleTouchMove}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
          <div className="w-10 h-1.5 bg-border rounded-full" />
        </div>

        {/* Title */}
        {title && (
          <div className="px-4 pb-3 border-b border-border">
            <h3 className="text-sm font-semibold text-text">{title}</h3>
          </div>
        )}

        {/* Items */}
        <div className="py-2">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => {
                item.onClick();
                onClose();
              }}
              className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm transition-colors ${
                item.danger
                  ? "text-red-500 active:bg-red-500/10"
                  : "text-text active:bg-surface-hover"
              }`}
              style={{ minHeight: "56px" }}
            >
              {item.icon && (
                <span className="w-5 h-5 flex items-center justify-center opacity-70">
                  {item.icon}
                </span>
              )}
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Cancel button at bottom */}
        <div className="p-2 border-t border-border">
          <button
            onClick={onClose}
            className="w-full py-3.5 text-sm font-medium text-text bg-surface-hover/50 rounded-xl active:bg-surface-hover transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
