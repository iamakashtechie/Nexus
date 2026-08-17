"use client";

import React, { useEffect, useState, useMemo } from "react";
import { List, ChevronRight } from "lucide-react";

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

type HeadingNode = {
  id: string;
  text: string;
  level: number;
};

type TableOfContentsProps = {
  isMarkdown: boolean;
  markdownContent: string;
  richContent: object | null;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
};

export function TableOfContents({
  isMarkdown,
  markdownContent,
  richContent,
  scrollContainerRef
}: TableOfContentsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const headings = useMemo(() => {
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
          
          // Basic stripping of bold/italic/links for the TOC display text
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
  }, [isMarkdown, markdownContent, richContent]);

  useEffect(() => {
    if (headings.length === 0) return;
    
    const container = scrollContainerRef.current;
    if (!container) return;
    
    let observer: IntersectionObserver | null = null;
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
            // Calculate distance to the top third of the scroll container
            const offsetTop = element.offsetTop;
            const distance = Math.abs(offsetTop - scrollY - (containerHeight / 3));
            
            // Allow a reasonably close heading to be active
            if (offsetTop <= scrollY + containerHeight / 2) {
              if (distance < minDistance) {
                minDistance = distance;
                currentActiveId = heading.id;
              }
            }
          }
        }
        
        // Fallback: If we didn't find one, maybe we scrolled very far down and the last active heading is way above
        if (!currentActiveId) {
          for (let i = headings.length - 1; i >= 0; i--) {
            const element = document.getElementById(headings[i].id);
            if (element && element.offsetTop <= scrollY + containerHeight) {
              currentActiveId = headings[i].id;
              break;
            }
          }
        }
        
        // One more fallback: just pick the first heading if it's the only one or at the top
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
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed right-4 top-24 z-40 p-2 rounded-lg bg-surface shadow-md border border-border/60 text-muted hover:text-text hover:bg-surface-hover transition-all flex items-center justify-center max-lg:flex ${isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'} lg:hidden`}
        title="Table of Contents"
      >
        <List size={18} />
      </button>
      
      <div 
        className={`absolute top-0 right-0 h-full z-30 transition-transform duration-300 lg:translate-x-0 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="sticky top-0 h-full max-h-full w-60 bg-surface/80 backdrop-blur-sm border-l border-border/60 flex flex-col pt-6 pb-20 shadow-xl lg:shadow-none">
          <div className="px-5 mb-4 flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider uppercase text-muted">On this page</span>
            <button 
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md text-muted hover:text-text hover:bg-surface-hover lg:hidden"
            >
              <ChevronRight size={14} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-1.5 scrollbar-hide">
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
                className={`block text-[12px] py-0.5 transition-colors relative border-l-2 pl-3 ${
                  activeId === heading.id 
                    ? 'text-text font-medium border-accent' 
                    : 'text-muted hover:text-text border-transparent hover:border-border/60'
                }`}
                style={{
                  marginLeft: `${Math.max(0, (heading.level - 1) * 12)}px`
                }}
              >
                {heading.text}
              </a>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
