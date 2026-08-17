"use client";

import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { normalizeFileType, normalizeNoteTitle, resolveNoteFileType } from "@/lib/fileType";
import { EditorSkeleton } from "@/components/ui/Skeleton";
import { FindInNote } from "@/components/editor/FindInNote";
import { WordCountFooter } from "@/components/editor/WordCountFooter";
import { BacklinksPanel } from "@/components/editor/BacklinksPanel";
import { FrontmatterPanel } from "@/components/editor/FrontmatterPanel";
import {
  LinkPickerDialog,
  ImagePickerDialog,
} from "@/components/editor/MediaPickers";
import {
  filterSlashItems,
  SLASH_ITEMS,
  type LinkMatchItem,
  type SlashItem,
} from "@/components/editor/SuggestionMenus";
import { useApi } from "@/hooks/useApi";
import { TableOfContents } from "@/components/editor/TableOfContents";
import type { NoteWithTags } from "@/types";
import type { Editor as TiptapEditor } from "@tiptap/core";
import { FileText, CornerDownLeft, Copy, Check } from "lucide-react";
import { MermaidDiagram } from "@/components/editor/MermaidBlock";
import { CodeBlock } from "@/components/editor/CodeBlock";

const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code || []), "className"],
    span: [...(defaultSchema.attributes?.span || []), "className"],
    div: [...(defaultSchema.attributes?.div || []), "className"],
  },
};

const Editor = dynamic(() => import("@/components/editor/Editor"), {
  ssr: false,
  loading: () => <EditorSkeleton />,
});

function extractTextFromRichContent(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const data = node as {
    type?: string;
    text?: string;
    attrs?: Record<string, unknown>;
    content?: unknown[];
  };
  const children = Array.isArray(data.content) ? data.content : [];
  const childText = children.map(extractTextFromRichContent).join("");

  if (data.type === "text") return data.text ?? "";
  if (data.type === "heading") {
    const level = Number(data.attrs?.level ?? 1);
    const hashes = "#".repeat(Math.min(6, Math.max(1, level)));
    return `${hashes} ${childText.trim()}\n\n`;
  }
  if (data.type === "blockquote") {
    return `> ${childText.trim().replace(/\n/g, "\n> ")}\n\n`;
  }
  if (data.type === "codeBlock") {
    const lang = String(data.attrs?.language ?? "");
    return `\`\`\`${lang}\n${childText}\n\`\`\`\n\n`;
  }
  if (data.type === "bulletList" || data.type === "orderedList") {
    return `${childText}\n`;
  }
  if (data.type === "listItem") {
    return `- ${childText.trim()}\n`;
  }
  if (data.type === "paragraph") {
    return `${childText}\n\n`;
  }
  return childText;
}

function getMarkdownValue(note: NoteWithTags): string {
  const hasMd =
    note.markdownContent && note.markdownContent.trim().length > 0;
  return hasMd
    ? note.markdownContent!
    : extractTextFromRichContent(note.content).trim();
}

function renderWikiLinks(
  children: React.ReactNode,
  onWikiLinkClick?: (title: string) => void
): React.ReactNode {
  if (typeof children === "string") {
    const parts = children.split(/(\[\[[^\]\n]+\]\])/g);
    if (parts.length === 1) return children;
    return parts.map((part, i) => {
      const match = part.match(/^\[\[([^\]\n]+)\]\]$/);
      if (match) {
        const title = match[1].trim();
        return (
          <button
            key={i}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onWikiLinkClick?.(title);
            }}
            className="text-accent underline underline-offset-2 cursor-pointer hover:opacity-80 font-medium inline-block mx-0.5"
          >
            [[{title}]]
          </button>
        );
      }
      return part;
    });
  }

  if (Array.isArray(children)) {
    return children.map((child, index) => (
      <React.Fragment key={index}>
        {renderWikiLinks(child, onWikiLinkClick)}
      </React.Fragment>
    ));
  }

  return children;
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '');
}

function extractText(children: React.ReactNode): string {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(extractText).join('');
  if (React.isValidElement(children)) {
    const props = children.props as { children?: React.ReactNode };
    if (props.children) return extractText(props.children);
  }
  return '';
}

type NoteEditorProps = {
  note: NoteWithTags;
  isEditing: boolean;
  onChangeTitle: (title: string) => void;
  onChangeContent: (content: object) => void;
  onChangeMarkdown: (md: string) => void;
  onChangeFileType: (ft: string) => void;
  onTogglePin: () => void;
  onChangeTags: (tags: string[]) => void;
  onSelectBacklink: (id: string) => void;
  /** Called when the user clicks a [[wiki-link]] in the editor or preview. */
  onWikiLinkClick?: (title: string) => void;
};

export function NoteEditor({
  note,
  isEditing,
  onChangeTitle,
  onChangeContent,
  onChangeMarkdown,
  onChangeFileType,
  onTogglePin,
  onChangeTags,
  onSelectBacklink,
  onWikiLinkClick,
}: NoteEditorProps) {
  const isMarkdownNote =
    resolveNoteFileType({ title: note.title, fileType: note.fileType }) === ".md";
  const markdownValue = getMarkdownValue(note);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { apiFetch } = useApi();
  const [linkPickerOpen, setLinkPickerOpen] = useState(false);
  const [linkPickerInitial, setLinkPickerInitial] = useState<string>("");
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [editorInstance, setEditorInstance] = useState<TiptapEditor | null>(null);
  const [copied, setCopied] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleCopy = useCallback(async () => {
    const textToCopy = isMarkdownNote
      ? markdownValue
      : (editorInstance?.getText() ?? extractTextFromRichContent(note.content));
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  }, [isMarkdownNote, markdownValue, editorInstance, note.content]);

  // Textarea autocomplete states for Markdown mode
  const [mdLinkMenu, setMdLinkMenu] = useState<{
    open: boolean;
    query: string;
    items: LinkMatchItem[];
    activeIndex: number;
    triggerPos: number;
  }>({ open: false, query: "", items: [], activeIndex: 0, triggerPos: 0 });

  const [mdSlashMenu, setMdSlashMenu] = useState<{
    open: boolean;
    query: string;
    items: SlashItem[];
    activeIndex: number;
    triggerPos: number;
  }>({ open: false, query: "", items: [], activeIndex: 0, triggerPos: 0 });

  useEffect(() => {
    const openLink = () => {
      setLinkPickerInitial("");
      setLinkPickerOpen(true);
    };
    const openImage = () => setImagePickerOpen(true);
    window.addEventListener("nexus:open-link-picker", openLink as EventListener);
    window.addEventListener("nexus:open-image-picker", openImage);
    return () => {
      window.removeEventListener("nexus:open-link-picker", openLink as EventListener);
      window.removeEventListener("nexus:open-image-picker", openImage);
    };
  }, []);

  const fetchLinkCandidates = useCallback(
    async (query: string): Promise<LinkMatchItem[]> => {
      try {
        const url = query.trim()
          ? `/api/notes?linkPrefix=${encodeURIComponent(query.trim())}`
          : `/api/notes`;
        const res = await apiFetch<{
          success: boolean;
          data: Array<{ id: string; title: string }>;
        }>(url);
        if (!res.success) return [];
        return res.data
          .filter((n) => n.id !== note.id)
          .map((n) => ({
            id: n.id,
            title: normalizeNoteTitle(n.title),
          }));
      } catch {
        return [];
      }
    },
    [apiFetch, note.id]
  );

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    onChangeMarkdown(val);
    const cursor = e.target.selectionStart;
    const before = val.slice(0, cursor);

    // 1. Check for [[ wiki-link
    const linkMatch = before.match(/\[\[([^\[\]\n]*)$/);
    if (linkMatch) {
      const q = linkMatch[1];
      const triggerPos = before.lastIndexOf("[[");
      void fetchLinkCandidates(q).then((items) => {
        setMdLinkMenu({
          open: true,
          query: q,
          items,
          activeIndex: 0,
          triggerPos,
        });
      });
      setMdSlashMenu((s) => ({ ...s, open: false }));
      return;
    } else {
      setMdLinkMenu((s) => ({ ...s, open: false }));
    }

    // 2. Check for / slash command at start of line
    const slashMatch = before.match(/(?:^|\n)\/(\S*)$/);
    if (slashMatch) {
      const q = slashMatch[1];
      const triggerPos = before.lastIndexOf("/");
      const items = filterSlashItems(q);
      setMdSlashMenu({
        open: true,
        query: q,
        items,
        activeIndex: 0,
        triggerPos,
      });
      return;
    } else {
      setMdSlashMenu((s) => ({ ...s, open: false }));
    }
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mdLinkMenu.open && mdLinkMenu.items.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMdLinkMenu((s) => ({ ...s, activeIndex: (s.activeIndex + 1) % s.items.length }));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMdLinkMenu((s) => ({
          ...s,
          activeIndex: (s.activeIndex - 1 + s.items.length) % s.items.length,
        }));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const selected = mdLinkMenu.items[mdLinkMenu.activeIndex];
        if (selected) insertWikiLinkToTextarea(selected.title);
        return;
      }
      if (e.key === "Escape") {
        setMdLinkMenu((s) => ({ ...s, open: false }));
        return;
      }
    }

    if (mdSlashMenu.open && mdSlashMenu.items.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMdSlashMenu((s) => ({ ...s, activeIndex: (s.activeIndex + 1) % s.items.length }));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMdSlashMenu((s) => ({
          ...s,
          activeIndex: (s.activeIndex - 1 + s.items.length) % s.items.length,
        }));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const selected = mdSlashMenu.items[mdSlashMenu.activeIndex];
        if (selected) executeSlashItemInTextarea(selected);
        return;
      }
      if (e.key === "Escape") {
        setMdSlashMenu((s) => ({ ...s, open: false }));
        return;
      }
    }

    if (e.key === "Tab") {
      e.preventDefault();
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const val = ta.value;
      const next = val.slice(0, start) + "  " + val.slice(end);
      onChangeMarkdown(next);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
    }
  };

  const insertWikiLinkToTextarea = (title: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const before = markdownValue.slice(0, mdLinkMenu.triggerPos);
    const after = markdownValue.slice(ta.selectionEnd);
    const next = `${before}[[${title}]]${after}`;
    onChangeMarkdown(next);
    setMdLinkMenu((s) => ({ ...s, open: false }));
    requestAnimationFrame(() => {
      ta.focus();
      const newPos = before.length + title.length + 4;
      ta.selectionStart = ta.selectionEnd = newPos;
    });
  };

  const executeSlashItemInTextarea = (item: SlashItem) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const before = markdownValue.slice(0, mdSlashMenu.triggerPos);
    const after = markdownValue.slice(ta.selectionEnd);

    let snippet = "";
    if (item.id === "h1") snippet = "# ";
    else if (item.id === "h2") snippet = "## ";
    else if (item.id === "h3") snippet = "### ";
    else if (item.id === "ul") snippet = "- ";
    else if (item.id === "ol") snippet = "1. ";
    else if (item.id === "quote") snippet = "> ";
    else if (item.id === "code") snippet = "\n```\n\n```\n";
    else if (item.id === "mermaid") snippet = "\n```mermaid\n\n```\n";
    else if (item.id === "divider") snippet = "\n---\n";
    else if (item.id === "link") {
      setMdSlashMenu((s) => ({ ...s, open: false }));
      window.dispatchEvent(new CustomEvent("nexus:open-link-picker"));
      return;
    } else if (item.id === "image") {
      setMdSlashMenu((s) => ({ ...s, open: false }));
      window.dispatchEvent(new CustomEvent("nexus:open-image-picker"));
      return;
    }

    const next = before + snippet + after;
    onChangeMarkdown(next);
    setMdSlashMenu((s) => ({ ...s, open: false }));
    requestAnimationFrame(() => {
      ta.focus();
      const newPos = before.length + snippet.length;
      ta.selectionStart = ta.selectionEnd = newPos;
    });
  };

  const handleLinkSubmit = useCallback((url: string) => {
    const ta = textareaRef.current;
    if (ta) {
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const before = markdownValue.slice(0, start);
      const after = markdownValue.slice(end);
      const insert = `[${markdownValue.slice(start, end) || "text"}](${url})`;
      const next = before + insert + after;
      onChangeMarkdown(next);
      return;
    }
    onChangeMarkdown(`${markdownValue}\n[link](${url})\n`);
  }, [markdownValue, onChangeMarkdown]);

  const handleImageSubmit = useCallback((url: string, alt: string) => {
    onChangeMarkdown(`${markdownValue}\n![${alt}](${url})\n`);
  }, [markdownValue, onChangeMarkdown]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      <div className="flex-1 overflow-y-auto relative" ref={scrollContainerRef}>
        <div className="sticky top-3 right-4 z-30 float-right mr-4 mt-2 pointer-events-none">
          <button
            type="button"
            onClick={handleCopy}
            title={copied ? "Copied to clipboard!" : "Copy note content"}
            className="pointer-events-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface/90 backdrop-blur border border-border/80 text-muted hover:text-text hover:bg-surface-hover hover:border-border shadow-md transition-all text-xs font-medium cursor-pointer active:scale-95"
          >
            {copied ? (
              <>
                <Check size={14} className="text-emerald-500 shrink-0" />
                <span className="text-[11px] text-emerald-500 font-medium">Copied</span>
              </>
            ) : (
              <>
                <Copy size={14} className="shrink-0" />
                <span className="text-[11px] font-medium hidden sm:inline">Copy</span>
              </>
            )}
          </button>
        </div>
        <div className="max-w-5xl mx-auto w-full pt-4 min-h-full flex flex-col">
          <div className="px-5 md:px-8 w-full">
            <input
              data-testid="note-title"
              type="text"
              value={note.title}
              readOnly={!isEditing}
              onChange={(e) => onChangeTitle(e.target.value)}
              onBlur={() => {
                const resolvedFileType = resolveNoteFileType({
                  title: note.title,
                  fileType: note.fileType,
                });
                const normalizedTitle = normalizeNoteTitle(
                  note.title,
                  resolvedFileType
                );
                const titleChanged = normalizedTitle !== note.title;
                const fileTypeChanged =
                  normalizeFileType(note.fileType) !== resolvedFileType;

                if (titleChanged || fileTypeChanged) {
                  if (titleChanged) onChangeTitle(normalizedTitle);
                  if (fileTypeChanged) onChangeFileType(resolvedFileType);
                }
              }}
              className={`w-full text-3xl md:text-4xl font-bold bg-transparent outline-none text-text placeholder:text-muted/30 mb-2 tracking-tight ${
                !isEditing ? "cursor-default" : ""
              }`}
              placeholder="Untitled.md"
            />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted/50 mb-6 md:mb-8 px-1">
              <span>
                Created:{" "}
                {new Date(note.createdAt).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
              <span>
                Updated:{" "}
                {new Date(note.updatedAt).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>

          <div
            className={`flex-1 flex flex-col mt-2 relative ${
              isEditing ? "cursor-text" : "cursor-default"
            }`}
          >
            {isMarkdownNote ? (
              isEditing ? (
                <div className="flex-1 flex flex-col relative">
                  <textarea
                    ref={textareaRef}
                    value={markdownValue}
                    onChange={handleTextareaChange}
                    onKeyDown={handleTextareaKeyDown}
                    className="flex-1 min-h-[500px] w-full rounded-xl border border-border/40 bg-surface/30 px-5 md:px-8 py-4 md:py-6 text-sm leading-6 text-text outline-none transition-all hover:border-border/60 focus:border-border resize-none font-mono"
                    spellCheck={false}
                  />
                  {mdLinkMenu.open && (
                    <div className="absolute top-12 left-8 z-[220] w-[260px] max-h-[240px] overflow-y-auto bg-bg border border-border rounded-lg shadow-2xl p-1">
                      <div className="text-[10px] uppercase tracking-wider text-muted/70 px-2 py-1">
                        Link to note
                      </div>
                      {mdLinkMenu.items.length === 0 ? (
                        <div className="px-2 py-3 text-[12px] text-muted/70">
                          {mdLinkMenu.query.trim()
                            ? `No matches for "${mdLinkMenu.query}"`
                            : "Type a note title…"}
                        </div>
                      ) : (
                        mdLinkMenu.items.map((item, i) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => insertWikiLinkToTextarea(item.title)}
                            className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-left text-[12px] truncate ${
                              i === mdLinkMenu.activeIndex
                                ? "bg-surface-hover text-text"
                                : "text-text/80 hover:bg-surface-hover/60"
                            }`}
                          >
                            <FileText size={12} className="text-muted shrink-0" />
                            <span className="truncate">{item.title}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                  {mdSlashMenu.open && (
                    <div className="absolute top-12 left-8 z-[220] w-[240px] max-h-[260px] overflow-y-auto bg-bg border border-border rounded-lg shadow-2xl p-1">
                      <div className="text-[10px] uppercase tracking-wider text-muted/70 px-2 py-1">
                        Blocks
                      </div>
                      {mdSlashMenu.items.map((item, i) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => executeSlashItemInTextarea(item)}
                          className={`flex items-center gap-2.5 w-full px-2 py-1.5 rounded-md text-left text-[12px] ${
                            i === mdSlashMenu.activeIndex
                              ? "bg-surface-hover text-text"
                              : "text-text/80 hover:bg-surface-hover/60"
                          }`}
                        >
                          <span className="text-muted shrink-0">{item.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="truncate">{item.label}</div>
                            <div className="text-[10px] text-muted/70 truncate">
                              {item.description}
                            </div>
                          </div>
                          {i === mdSlashMenu.activeIndex && (
                            <CornerDownLeft size={11} className="text-muted/70 shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="min-h-[500px] rounded-xl border border-border/40 bg-surface/30 px-5 md:px-8 py-4 md:py-6">
                  <article className="markdown-preview prose prose-sm max-w-none prose-headings:text-text prose-p:text-text prose-strong:text-text prose-a:text-accent prose-code:text-text prose-pre:bg-surface-hover">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[[rehypeSanitize, sanitizeSchema]]}
                      components={{
                        p: ({ children }) => <p>{renderWikiLinks(children, onWikiLinkClick)}</p>,
                        li: ({ children }) => <li>{renderWikiLinks(children, onWikiLinkClick)}</li>,
                        blockquote: ({ children }) => <blockquote>{renderWikiLinks(children, onWikiLinkClick)}</blockquote>,
                        h1: ({ children }) => { const id = slugify(extractText(children)); return <h1 id={id}>{renderWikiLinks(children, onWikiLinkClick)}</h1>; },
                        h2: ({ children }) => { const id = slugify(extractText(children)); return <h2 id={id}>{renderWikiLinks(children, onWikiLinkClick)}</h2>; },
                        h3: ({ children }) => { const id = slugify(extractText(children)); return <h3 id={id}>{renderWikiLinks(children, onWikiLinkClick)}</h3>; },
                        h4: ({ children }) => { const id = slugify(extractText(children)); return <h4 id={id}>{renderWikiLinks(children, onWikiLinkClick)}</h4>; },
                        h5: ({ children }) => { const id = slugify(extractText(children)); return <h5 id={id}>{renderWikiLinks(children, onWikiLinkClick)}</h5>; },
                        h6: ({ children }) => { const id = slugify(extractText(children)); return <h6 id={id}>{renderWikiLinks(children, onWikiLinkClick)}</h6>; },
                        table: ({ children }) => (
                          <div className="my-5 w-full overflow-x-auto rounded-xl border border-border/60 bg-surface/40 shadow-sm">
                            <table className="w-full min-w-max text-left border-collapse text-sm">{children}</table>
                          </div>
                        ),
                        th: ({ children }) => (
                          <th className="px-4 py-2.5 font-semibold text-text bg-surface-hover/70 border-b border-r border-border/40 last:border-r-0 text-xs uppercase tracking-wider">
                            {renderWikiLinks(children, onWikiLinkClick)}
                          </th>
                        ),
                        td: ({ children }) => (
                          <td className="px-4 py-2.5 border-b border-r border-border/40 last:border-r-0 whitespace-nowrap text-text/90">
                            {renderWikiLinks(children, onWikiLinkClick)}
                          </td>
                        ),
                        code: ({ className, children, ...props }) => {
                          const match = /language-(\w+)/.exec(className || "");
                          const lang = match ? match[1] : "";
                          if (lang === "mermaid") {
                            return <MermaidDiagram code={String(children).replace(/\n$/, "")} />;
                          }
                          return (
                            <code className={className} {...props}>
                              {children}
                            </code>
                          );
                        },
                        pre: ({ children, ...props }) => {
                          const childArray = Array.isArray(children) ? children : [children];
                          const codeEl = childArray.find(
                            (c): c is React.ReactElement<{ className?: string; children?: React.ReactNode }> => {
                              if (!React.isValidElement(c)) return false;
                              const cn = (c.props as { className?: string }).className;
                              return Boolean(cn && cn.includes("language-"));
                            }
                          );
                          if (codeEl) {
                            const className = (codeEl.props.className ?? "") as string;
                            const langMatch = /language-(\w+)/.exec(className);
                            const lang = langMatch ? langMatch[1] : "";
                            const raw = (codeEl.props.children ?? "") as React.ReactNode;
                            const code = React.Children.toArray(raw)
                              .map((c) => (typeof c === "string" ? c : ""))
                              .join("")
                              .replace(/\n$/, "");
                            if (lang === "mermaid") {
                              return <MermaidDiagram code={code} />;
                            }
                            return <CodeBlock language={lang} code={code} />;
                          }
                          return <pre {...props}>{children}</pre>;
                        },
                      }}
                    >
                      {markdownValue}
                    </ReactMarkdown>
                  </article>
                </div>
              )
            ) : (
              <Editor
                key={note.id}
                content={note.content as object}
                editable={isEditing}
                onChange={onChangeContent}
                onLinkAutocomplete={fetchLinkCandidates}
                onEditorReady={setEditorInstance}
                onWikiLinkClick={onWikiLinkClick}
              />
            )}
          </div>
        </div>
      </div>

      <TableOfContents 
        isMarkdown={isMarkdownNote}
        markdownContent={markdownValue}
        richContent={note.content as object}
        scrollContainerRef={scrollContainerRef}
      />

      <BacklinksPanel activeNote={note} onSelect={onSelectBacklink} />
      <FrontmatterPanel
        note={note}
        onTogglePin={onTogglePin}
        onChangeTags={onChangeTags}
      />
      <WordCountFooter
        isMarkdown={isMarkdownNote}
        isEditing={isEditing}
        content={note.content}
        markdown={markdownValue}
      />
      <FindInNote
        editor={isMarkdownNote ? null : editorInstance}
        isMarkdown={isMarkdownNote}
        textareaRef={textareaRef}
        textareaValue={markdownValue}
      />

      {isMarkdownNote && (
        <>
          <LinkPickerDialog
            isOpen={linkPickerOpen}
            onClose={() => setLinkPickerOpen(false)}
            initialValue={linkPickerInitial}
            onSubmit={handleLinkSubmit}
          />
          <ImagePickerDialog
            isOpen={imagePickerOpen}
            onClose={() => setImagePickerOpen(false)}
            onSubmit={handleImageSubmit}
          />
        </>
      )}
    </div>
  );
}
