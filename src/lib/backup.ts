import { detectFileTypeFromTitle, normalizeFileType } from "@/lib/fileType";

const INVALID_FILE_CHARS = /[<>:"/\\|?*\x00-\x1F]/g;

type DownloadableNote = {
  title: string;
  fileType?: string | null;
  content: unknown;
  markdownContent?: string | null;
};

function extractTextFromRichContent(node: unknown): string {
  if (typeof node === "string") return node;
  if (typeof node === "number" || typeof node === "boolean") return String(node);
  if (Array.isArray(node)) return node.map(extractTextFromRichContent).join("\n");
  if (!node || typeof node !== "object") return "";

  const data = node as { type?: string; text?: string; content?: unknown[] };
  const children = Array.isArray(data.content) ? data.content : [];

  if (data.type === "text") return data.text ?? "";

  const childText = children.map(extractTextFromRichContent).join("");

  if (["paragraph", "heading", "codeBlock", "blockquote", "listItem"].includes(data.type ?? "")) {
    return `${childText}\n`;
  }

  return childText;
}

function sanitizeFileSegment(value: string, fallback: string): string {
  const sanitized = value
    .replace(INVALID_FILE_CHARS, "_")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[. ]+|[. ]+$/g, "");

  return sanitized || fallback;
}

export function buildNoteDownloadName(note: DownloadableNote): string {
  const normalizedType = detectFileTypeFromTitle(note.title) ?? normalizeFileType(note.fileType);
  const baseTitle = note.title.trim().replace(/\.[a-z0-9][a-z0-9+\-]*$/i, "") || "Untitled";

  return `${sanitizeFileSegment(baseTitle, "Untitled")}${normalizedType}`;
}

export function buildNotebookZipName(notebookName: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const safeNotebookName = sanitizeFileSegment(notebookName, "Notebook");

  return `${safeNotebookName}-${date}.zip`;
}

export function buildNoteDownloadBody(note: DownloadableNote): string {
  if (typeof note.markdownContent === "string" && note.markdownContent.trim().length > 0) {
    return note.markdownContent;
  }

  const plainText = extractTextFromRichContent(note.content).trim();
  if (plainText.length > 0) return plainText;

  return "";
}
