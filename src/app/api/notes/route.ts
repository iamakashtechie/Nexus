import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createNoteSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");
    const notebookId = searchParams.get("notebookId");
    const tag = searchParams.get("tag");

    const notes = await prisma.note.findMany({
      where: {
        ...(notebookId ? { notebookId } : {}),
        ...(query
          ? { title: { contains: query, mode: "insensitive" } }
          : {}),
        ...(tag
          ? { tags: { some: { tag: { name: tag } } } }
          : {}),
      },
      include: {
        tags: { include: { tag: true } },
        notebook: true,
      },
      orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    });

    return NextResponse.json({ success: true, data: notes });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch notes" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createNoteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { title, content, notebookId, tags } = parsed.data;
    const normalizedContent = JSON.parse(JSON.stringify(content));

    const note = await prisma.note.create({
      data: {
        title,
        content: normalizedContent,
        ...(notebookId ? { notebook: { connect: { id: notebookId } } } : {}),
        ...(tags?.length
          ? {
              tags: {
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

    return NextResponse.json({ success: true, data: note }, { status: 201 });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to create note" },
      { status: 500 }
    );
  }
}
