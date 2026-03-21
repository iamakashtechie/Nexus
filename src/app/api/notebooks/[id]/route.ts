import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createNotebookSchema } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const parsed = createNotebookSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const notebook = await prisma.notebook.update({
      where: { id },
      data: { name: parsed.data.name },
      include: { _count: { select: { notes: true } } },
    });

    return NextResponse.json({ success: true, data: notebook });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to update notebook" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    // Unassign all notes from this notebook first
    await prisma.note.updateMany({
      where: { notebookId: id },
      data: { notebookId: null },
    });

    await prisma.notebook.delete({ where: { id } });
    return NextResponse.json({ success: true, data: null });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to delete notebook" },
      { status: 500 }
    );
  }
}
