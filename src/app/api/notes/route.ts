import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createNoteSchema } from "@/lib/validations";
import { normalizeFileType, normalizeNoteTitle, resolveNoteFileType } from "@/lib/fileType";

// Prevent Next.js from caching GET responses in production
export const dynamic = "force-dynamic";

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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");
    const notebookId = searchParams.get("notebookId");
    const tag = searchParams.get("tag");
    const idsParam = searchParams.get("ids");
    const titlesParam = searchParams.get("titles");
    const linkPrefix = searchParams.get("linkPrefix");

    const parsedIds = idsParam
      ? idsParam.split(",").map((s) => s.trim()).filter(Boolean)
      : null;
    const parsedTitles = titlesParam
      ? titlesParam.split(",").map((s) => s.trim()).filter(Boolean)
      : null;

    const notes = await prisma.note.findMany({
      where: {
        ...(parsedIds ? { id: { in: parsedIds } } : {}),
        ...(parsedTitles
          ? {
              OR: parsedTitles.map((t) => ({
                title: { contains: t, mode: "insensitive" },
              })),
            }
          : {}),
        ...(notebookId ? { notebookId } : {}),
        ...(query
          ? { title: { contains: query, mode: "insensitive" } }
          : {}),
        ...(tag
          ? { tags: { some: { tag: { name: tag } } } }
          : {}),
        ...(linkPrefix
          ? {
              OR: [
                { title: { contains: linkPrefix, mode: "insensitive" } },
                { markdownContent: { contains: `[[${linkPrefix}` } },
              ],
            }
          : {}),
      },
      include: {
        tags: { include: { tag: true } },
        notebook: true,
      },
      orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    });

    return NextResponse.json({ success: true, data: notes });
  } catch (error) {
    console.error("[GET /api/notes]", error);
    return NextResponse.json(
      {
        success: false,
        error:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.message
            : "Failed to fetch notes",
      },
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

    const { title, content, fileType, markdownContent, notebookId, tags } = parsed.data;
    const resolvedFileType = resolveNoteFileType({ title, fileType });
    const normalizedTitle = normalizeNoteTitle(title, resolvedFileType);
    const normalizedContent = JSON.parse(JSON.stringify(content));

    let note;
    try {
      note = await (prisma as any).note.create({
        data: {
          title: normalizedTitle,
          fileType: normalizeFileType(resolvedFileType),
          content: normalizedContent,
          markdownContent:
            normalizeFileType(resolvedFileType) === ".md"
              ? markdownContent ?? ""
              : null,
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
    } catch (error) {
      if (!isLegacyPrismaClientError(error)) throw error;
      note = await prisma.note.create({
        data: {
          title: normalizedTitle,
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
    }

    return NextResponse.json({ success: true, data: note }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/notes]", error);
    return NextResponse.json(
      {
        success: false,
        error:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.message
            : "Failed to create note",
      },
      { status: 500 }
    );
  }
}
