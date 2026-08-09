"use client";

import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { normalizeFileType, normalizeNoteTitle, resolveNoteFileType } from "@/lib/fileType";
import { EditorSkeleton } from "@/components/ui/Skeleton";
import type { NoteWithTags } from "@/types";

const Editor = dynamic(() => import("@/components/editor/Editor"), {
  ssr: false,
  loading: () => <EditorSkeleton />,
});

function extractTextFromRichContent(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const data = node as { type?: string; text?: string; content?: unknown[] };
  const children = Array.isArray(data.content) ? data.content : [];
  if (data.type === "text") return data.text ?? "";
  const childText = children.map(extractTextFromRichContent).join("");
  if (
    ["paragraph", "heading", "codeBlock", "blockquote", "listItem"].includes(
      data.type ?? ""
    )
  ) {
    return `${childText}\n`;
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

type NoteEditorProps = {
  note: NoteWithTags;
  isEditing: boolean;
  onChangeTitle: (title: string) => void;
  onChangeContent: (content: object) => void;
  onChangeMarkdown: (md: string) => void;
  onChangeFileType: (ft: string) => void;
};

export function NoteEditor({
  note,
  isEditing,
  onChangeTitle,
  onChangeContent,
  onChangeMarkdown,
  onChangeFileType,
}: NoteEditorProps) {
  const isMarkdownNote =
    resolveNoteFileType({ title: note.title, fileType: note.fileType }) === ".md";
  const markdownValue = getMarkdownValue(note);

  return (
    <div className="flex-1 overflow-y-auto">
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
          className={`flex-1 flex flex-col mt-2 ${
            isEditing ? "cursor-text" : "cursor-default"
          }`}
        >
          {isMarkdownNote ? (
            isEditing ? (
              <textarea
                value={markdownValue}
                onChange={(e) => onChangeMarkdown(e.target.value)}
                className="flex-1 min-h-[500px] w-full rounded-xl border border-border/40 bg-surface/30 px-5 md:px-8 py-4 md:py-6 text-sm leading-6 text-text outline-none transition-all hover:border-border/60 focus:border-border resize-none font-mono"
                spellCheck={false}
              />
            ) : (
              <div className="min-h-[500px] rounded-xl border border-border/40 bg-surface/30 px-5 md:px-8 py-4 md:py-6">
                <article className="prose prose-sm max-w-none prose-invert prose-headings:text-text prose-p:text-text/90 prose-strong:text-text prose-a:text-accent prose-code:text-text prose-pre:bg-surface-hover">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeSanitize]}
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
            />
          )}
        </div>
      </div>
    </div>
  );
}