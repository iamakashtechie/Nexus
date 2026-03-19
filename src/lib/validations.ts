import { z } from "zod";

export const loginSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

export const createNoteSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  content: z.record(z.string(), z.unknown()),
  notebookId: z.string().cuid().optional(),
  tags: z.array(z.string().min(1).max(50)).optional(),
});

export const updateNoteSchema = createNoteSchema.partial().extend({
  pinned: z.boolean().optional(),
});

export const createNotebookSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});

export const noteIdSchema = z.object({
  id: z.string().cuid("Invalid note ID"),
});
