const DEFAULT_FILE_TYPE = ".md";
const DEFAULT_BASE_NAME = "Untitled";

const FILE_TYPE_PATTERN = /^\.[a-z0-9][a-z0-9+\-]*$/i;

export function normalizeFileType(fileType?: string | null): string {
  if (!fileType) return DEFAULT_FILE_TYPE;

  const trimmed = fileType.trim().toLowerCase();
  if (!trimmed) return DEFAULT_FILE_TYPE;

  const withDot = trimmed.startsWith(".") ? trimmed : `.${trimmed}`;
  return FILE_TYPE_PATTERN.test(withDot) ? withDot : DEFAULT_FILE_TYPE;
}

export function detectFileTypeFromTitle(title?: string | null): string | null {
  if (!title) return null;

  const trimmed = title.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/\.([a-z0-9][a-z0-9+\-]*)$/i);
  if (!match) return null;

  return normalizeFileType(`.${match[1]}`);
}

export function resolveNoteFileType(input: { title?: string | null; fileType?: string | null }): string {
  return detectFileTypeFromTitle(input.title) ?? normalizeFileType(input.fileType);
}

export function replaceTitleExtension(title: string, fileType: string): string {
  const normalizedFileType = normalizeFileType(fileType);
  const trimmed = title.trim();
  const withoutExtension = trimmed.replace(/\.[a-z0-9][a-z0-9+\-]*$/i, "");

  return `${withoutExtension}${normalizedFileType}`;
}

export function normalizeNoteTitle(
  title?: string | null,
  fallbackFileType = DEFAULT_FILE_TYPE,
  fallbackBaseName = DEFAULT_BASE_NAME
): string {
  const raw = title?.trim() ?? "";
  const base = raw || fallbackBaseName;
  const fileType = detectFileTypeFromTitle(base) ?? normalizeFileType(fallbackFileType);

  if (detectFileTypeFromTitle(base)) return base;

  return `${base}${fileType}`;
}
