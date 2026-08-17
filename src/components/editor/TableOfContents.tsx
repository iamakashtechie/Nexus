"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { List, X } from "lucide-react";

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '');
}

export function extractTextFromRichContentNode(node: any): string {
  if (!node || typeof node !== "object") return "";
  const children = Array.isArray(node.content) ? node.content : [];
  const childText = children.map(extractTextFromRichContentNode).join("");
  if (node.type === "text") return node.text ?? "";
  return childText;
}

export type HeadingNode = {
  id: string;
  text: string;
  level: number;
};

export function extractHeadings(
  isMarkdown: boolean,
  markdownContent: string,
  richContent: object | null
): HeadingNode[] {
  const results: HeadingNode[] = [];
  if (isMarkdown) {
    if (!markdownContent) return results;
    const lines = markdownContent.split('\n');
    let inCodeBlock = false;
    
    lines.forEach(line => {
      if (line.trim().startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        return;
      }
      if (inCodeBlock) return;
      
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        let text = match[2].trim();
        
        // Strip basic markdown formatting for the TOC label
        text = text.replace(/\*\*(.*?)\*\*/g, '$1');
        text = text.replace(/\*(.*?)\*/g, '$1');
        text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
        text = text.replace(/\[\[(.*?)\]\]/g, '$1');

        results.push({
          id: slugify(text),
          text,
          level
        });
      }
    });
  } else {
    if (!richContent || typeof richContent !== 'object') return results;
    
    const traverse = (node: any) => {
      if (!node || typeof node !== 'object') return;
      if (node.type === 'heading') {
        const level = Number(node.attrs?.level || 1);
        const text = extractTextFromRichContentNode(node);
        if (text.trim()) {
          results.push({
            id: slugify(text.trim()),
            text: text.trim(),
            level
          });
        }
      } else if (Array.isArray(node.content)) {
        node.content.forEach(traverse);
      }
    };
    traverse(richContent);
  }
  return results;
}

type TableOfContentsProps = {
  isMarkdown: boolean;
  markdownContent: string;
  richContent: object | null;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  isOpen?: boolean;
  onClose?: () => void;
  onOpen?: () => void;
};

export function TableOfContents({
  isMarkdown,
  markdownContent,
  richContent,
  scrollContainerRef,
  isOpen: controlledIsOpen,
  onClose,
  onOpen,
}: TableOfContentsProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [activeId, setActiveId] = useState<string>("");
  const panelRef = useRef<HTMLDivElement | null>(null);

  const isControlled = typeof controlledIsOpen === "boolean";
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const handleClose = () => {
    if (isControlled && onClose) {
      onClose();
    } else {
      setInternalIsOpen(false);
    }
  };

  const handleOpen = () => {
    if (isControlled && onOpen) {
      onOpen();
    } else {
      setInternalIsOpen(true);
    }
  };

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isControlled]);

  const headings = useMemo(() => {
    return extractHeadings(isMarkdown, markdownContent, richContent);
  }, [isMarkdown, markdownContent, richContent]);

  useEffect(() => {
    if (headings.length === 0) return;
    
    const container = scrollContainerRef.current;
    if (!container) return;
    
    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      
      scrollTimeout = setTimeout(() => {
        const scrollY = container.scrollTop;
        const containerHeight = container.clientHeight;
        
        let currentActiveId = "";
        let minDistance = Infinity;
        
        for (const heading of headings) {
          const element = document.getElementById(heading.id);
          if (element) {
            const offsetTop = element.offsetTop;
            const distance = Math.abs(offsetTop - scrollY - (containerHeight / 3));
            
            if (offsetTop <= scrollY + containerHeight / 2) {
              if (distance < minDistance) {
                minDistance = distance;
                currentActiveId = heading.id;
              }
            }
          }
        }
        
        if (!currentActiveId) {
          for (let i = headings.length - 1; i >= 0; i--) {
            const element = document.getElementById(headings[i].id);
            if (element && element.offsetTop <= scrollY + containerHeight) {
              currentActiveId = headings[i].id;
              break;
            }
          }
        }
        
        if (!currentActiveId && headings.length > 0) {
          currentActiveId = headings[0].id;
        }

        if (currentActiveId && currentActiveId !== activeId) {
          setActiveId(currentActiveId);
        }
      }, 50);
    };
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeout) clearTimeout(scrollTimeout);
    };
  }, [headings, scrollContainerRef, activeId]);

  if (headings.length === 0) return null;

  return (
    <>
      {/* Uncontrolled floating button (only rendered if component is not externally controlled) */}
      {!isControlled && !isOpen && (
        <button
          type="button"
          onClick={handleOpen}
          className="fixed right-4 top-24 z-40 p-2.5 rounded-xl bg-surface/90 backdrop-blur-md shadow-lg border border-border text-muted hover:text-text hover:bg-surface-hover hover:border-border/80 transition-all flex items-center justify-center cursor-pointer active:scale-95"
          title="Table of Contents"
          aria-label="Table of Contents"
        >
          <List size={18} />
        </button>
      )}
      
      {/* Floating Drawer / Card */}
      {isOpen && (
        <div 
          ref={panelRef}
          className="fixed right-4 top-24 z-40 w-72 sm:w-80 max-w-[calc(100vw-2rem)] max-h-[50vh] flex flex-col bg-surface/95 backdrop-blur-md rounded-xl border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="px-4 py-2.5 border-b border-border/50 flex items-center justify-between shrink-0 bg-surface/60">
            <div className="flex items-center gap-2">
              <List size={14} className="text-muted" />
              <span className="text-[10px] font-bold tracking-wider uppercase text-muted">
                On this page ({headings.length})
              </span>
            </div>
            <button 
              type="button"
              onClick={handleClose}
              className="p-1 rounded-md text-muted hover:text-text hover:bg-surface-hover transition-colors cursor-pointer"
              title="Close Table of Contents"
              aria-label="Close Table of Contents"
            >
              <X size={15} />
            </button>
          </div>
          
          {/* Hierarchically Indented Scrollable List */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5 scrollbar-thin">
            {headings.map((heading, i) => (
              <a
                key={`${heading.id}-${i}`}
                href={`#${heading.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById(heading.id);
                  if (el && scrollContainerRef.current) {
                    const topPos = el.offsetTop - 20; 
                    scrollContainerRef.current.scrollTo({
                      top: Math.max(0, topPos),
                      behavior: 'smooth'
                    });
                    setActiveId(heading.id);
                  }
                }}
                className={`block text-[12px] py-1 transition-colors relative border-l-2 pl-3 ${
                  activeId === heading.id 
                    ? 'text-text font-medium border-accent' 
                    : 'text-muted hover:text-text border-transparent hover:border-border/60'
                }`}
                style={{
                  marginLeft: `${Math.max(0, (heading.level - 1) * 14)}px`
                }}
              >
                <span className="line-clamp-2 leading-relaxed">{heading.text}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
