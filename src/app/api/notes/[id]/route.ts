import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { updateNoteSchema } from "@/lib/validations";

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
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch note" },
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

    const { title, content, notebookId, pinned, tags } = parsed.data;
    const normalizedContent =
      content !== undefined ? JSON.parse(JSON.stringify(content)) : undefined;

    const note = await prisma.note.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
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
      },
      include: {
        tags: { include: { tag: true } },
        notebook: true,
      },
    });

    return NextResponse.json({ success: true, data: note });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to update note" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    await prisma.note.delete({ where: { id } });
    return NextResponse.json({ success: true, data: null });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to delete note" },
      { status: 500 }
    );
  }
}
