import type { Note, Notebook, Tag } from "@prisma/client";

export type NoteWithTags = Note & {
  fileType?: string;
  markdownContent?: string | null;
  tags: Array<{ tag: Tag }>;
  notebook: Notebook | null;
};

export type NotebookWithNotes = Notebook & {
  notes: Note[];
};

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type AuthPayload = {
  auth: boolean;
  iat: number;
  exp: number;
};

export type CreateNoteInput = {
  title: string;
  content: object;
  fileType?: string;
  markdownContent?: string;
  notebookId?: string;
  tags?: string[];
};

export type UpdateNoteInput = Partial<CreateNoteInput> & {
  pinned?: boolean;
};
