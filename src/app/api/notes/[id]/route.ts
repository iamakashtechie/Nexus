import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { updateNoteSchema } from "@/lib/validations";
import {
  normalizeFileType,
  normalizeNoteTitle,
  replaceTitleExtension,
  resolveNoteFileType,
} from "@/lib/fileType";

function isLegacyPrismaClientError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.message.includes("Unknown arg `fileType`") ||
    error.message.includes("Unknown argument `fileType`") ||
    error.message.includes("Unknown arg `markdownContent`") ||
    error.message.includes("Unknown argument `markdownContent`") ||
    error.message.includes("column \"fileType\" does not exist") ||
    error.message.includes("column \"markdownContent\" does not exist")
  );
}

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const note = await prisma.note.findUnique({
      where: { id },
      include: {
        tags: { include: { tag: true } },
        notebook: true,
      },
    });

    if (!note) {
      return NextResponse.json(
        { success: false, error: "Note not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: note });
  } catch (error) {
    console.error("[GET /api/notes/:id]", error);
    return NextResponse.json(
      {
        success: false,
        error:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.message
            : "Failed to fetch note",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const parsed = updateNoteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.note.findUnique({
      where: { id },
      select: { title: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Note not found" },
        { status: 404 }
      );
    }

    const { title, content, fileType, markdownContent, notebookId, pinned, tags } = parsed.data;
    const fileTypeFromPayload = fileType !== undefined ? normalizeFileType(fileType) : undefined;
    const existingFileType = resolveNoteFileType({ title: existing.title, fileType: ".md" });

    let resolvedFileType = fileTypeFromPayload ?? existingFileType;
    if (title !== undefined) {
      resolvedFileType = resolveNoteFileType({ title, fileType: resolvedFileType });
    }

    const normalizedTitle =
      title !== undefined
        ? normalizeNoteTitle(title, resolvedFileType)
        : fileTypeFromPayload !== undefined
          ? replaceTitleExtension(existing.title, resolvedFileType)
          : undefined;
    const normalizedContent =
      content !== undefined ? JSON.parse(JSON.stringify(content)) : undefined;

    const commonData = {
      ...(normalizedTitle !== undefined ? { title: normalizedTitle } : {}),
      ...(normalizedContent !== undefined ? { content: normalizedContent } : {}),
      ...(notebookId !== undefined
        ? notebookId
          ? { notebook: { connect: { id: notebookId } } }
          : { notebook: { disconnect: true } }
        : {}),
      ...(pinned !== undefined ? { pinned } : {}),
      ...(tags !== undefined
        ? {
            tags: {
              deleteMany: {},
              create: tags.map((name) => ({
                tag: {
                  connectOrCreate: {
                    where: { name },
                    create: { name },
                  },
                },
              })),
            },
          }
        : {}),
    };

    let note;
    try {
      note = await (prisma as any).note.update({
        where: { id },
        data: {
          ...commonData,
          fileType: resolvedFileType,
          ...(resolvedFileType === ".md"
            ? { markdownContent: markdownContent ?? undefined }
            : { markdownContent: null }),
        },
        include: {
          tags: { include: { tag: true } },
          notebook: true,
        },
      });
    } catch (error) {
      if (!isLegacyPrismaClientError(error)) throw error;
      note = await prisma.note.update({
        where: { id },
        data: commonData,
        include: {
          tags: { include: { tag: true } },
          notebook: true,
        },
      });
    }

    return NextResponse.json({ success: true, data: note });
  } catch (error) {
    console.error("[PATCH /api/notes/:id]", error);
    return NextResponse.json(
      {
        success: false,
        error:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.message
            : "Failed to update note",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    await prisma.note.delete({ where: { id } });
    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    console.error("[DELETE /api/notes/:id]", error);
    return NextResponse.json(
      {
        success: false,
        error:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.message
            : "Failed to delete note",
      },
      { status: 500 }
    );
  }
}
