"use client";

import { Clock, Type, Eye } from "lucide-react";

type Stats = { words: number; chars: number; minutes: number };

function extractText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const data = node as { type?: string; text?: string; content?: unknown[] };
  if (data.type === "text") return data.text ?? "";
  const children = Array.isArray(data.content) ? data.content : [];
  const parts = children.map(extractText);
  if (
    ["paragraph", "heading", "codeBlock", "blockquote", "listItem"].includes(
      data.type ?? ""
    )
  ) {
    return parts.join("") + "\n";
  }
  return parts.join("");
}

export function computeStatsFromContent(content: unknown): Stats {
  const text = extractText(content).trim();
  const words = text.length === 0 ? 0 : text.split(/\s+/).filter(Boolean).length;
  const chars = text.length;
  const minutes = Math.max(1, Math.ceil(words / 220));
  return { words, chars, minutes };
}

export function computeStatsFromMarkdown(md: string | null | undefined): Stats {
  const text = (md ?? "").trim();
  const words = text.length === 0 ? 0 : text.split(/\s+/).filter(Boolean).length;
  const chars = text.length;
  const minutes = Math.max(1, Math.ceil(words / 220));
  return { words, chars, minutes };
}

type WordCountFooterProps = {
  isMarkdown: boolean;
  isEditing: boolean;
  content: unknown;
  markdown: string | null | undefined;
};

export function WordCountFooter({
  isMarkdown,
  isEditing,
  content,
  markdown,
}: WordCountFooterProps) {
  const stats = isMarkdown
    ? computeStatsFromMarkdown(markdown)
    : computeStatsFromContent(content);

  return (
    <div
      data-testid="word-count-footer"
      className="px-5 md:px-8 py-2.5 border-t border-border/30 text-[11px] text-muted/70 flex items-center gap-4 shrink-0"
    >
      <span className="flex items-center gap-1.5">
        <Type size={11} />
        <span className="tabular-nums">{stats.words.toLocaleString()}</span> words
      </span>
      <span className="flex items-center gap-1.5">
        <span className="tabular-nums">{stats.chars.toLocaleString()}</span> chars
      </span>
      <span className="flex items-center gap-1.5">
        <Clock size={11} />
        <span className="tabular-nums">{stats.minutes}</span> min read
      </span>
      <span className="ml-auto flex items-center gap-1.5">
        <Eye size={11} />
        {isEditing ? "Editing" : "Reading"}
      </span>
    </div>
  );
}
