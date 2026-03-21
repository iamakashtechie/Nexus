import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildNoteDownloadBody, buildNoteDownloadName } from "@/lib/backup";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const note = await prisma.note.findUnique({ where: { id } });

    if (!note) {
      return NextResponse.json(
        { success: false, error: "Note not found" },
        { status: 404 }
      );
    }

    const fileName = buildNoteDownloadName({
      title: note.title,
      fileType: (note as { fileType?: string | null }).fileType,
      content: note.content,
      markdownContent: (note as { markdownContent?: string | null }).markdownContent,
    });
    const body = buildNoteDownloadBody({
      title: note.title,
      fileType: (note as { fileType?: string | null }).fileType,
      content: note.content,
      markdownContent: (note as { markdownContent?: string | null }).markdownContent,
    });

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to download note" },
      { status: 500 }
    );
  }
}
