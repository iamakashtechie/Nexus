import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const source = await prisma.note.findUnique({
      where: { id },
      select: { id: true, title: true },
    });
    if (!source) {
      return NextResponse.json(
        { success: false, error: "Note not found" },
        { status: 404 }
      );
    }

    const sourceTitle = source.title.replace(/\.[^.]+$/, "").trim().toLowerCase();

    const candidates = await prisma.note.findMany({
      where: { NOT: { id } },
      include: {
        tags: { include: { tag: true } },
        notebook: true,
      },
    });

    const backlinks: typeof candidates = [];
    for (const candidate of candidates) {
      let hits = false;
      if (candidate.markdownContent) {
        const matches = candidate.markdownContent.match(/\[\[([^\]\n]+)\]\]/g);
        if (matches) {
          hits = matches.some(
            (m) =>
              m.slice(2, -2).trim().toLowerCase() === sourceTitle
          );
        }
      }
      if (!hits && searchContent(candidate.content, sourceTitle)) {
        hits = true;
      }
      if (hits) backlinks.push(candidate);
    }

    return NextResponse.json({ success: true, data: backlinks });
  } catch (error) {
    console.error("[GET /api/notes/:id/backlinks]", error);
    return NextResponse.json(
      {
        success: false,
        error:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.message
            : "Failed to fetch backlinks",
      },
      { status: 500 }
    );
  }
}

function searchContent(node: unknown, sourceTitle: string): boolean {
  if (!node || typeof node !== "object") return false;
  const data = node as {
    type?: string;
    text?: string;
    content?: unknown[];
  };
  if (data.type === "text" && typeof data.text === "string") {
    const matches = data.text.match(/\[\[([^\]\n]+)\]\]/g);
    if (matches) {
      return matches.some((m) => m.slice(2, -2).trim().toLowerCase() === sourceTitle);
    }
  }
  if (Array.isArray(data.content)) {
    return data.content.some((c) => searchContent(c, sourceTitle));
  }
  return false;
}
