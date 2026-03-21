import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  buildNotebookZipName,
  buildNoteDownloadBody,
  buildNoteDownloadName,
} from "@/lib/backup";
import { createZip } from "@/lib/zip";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const notebook = await prisma.notebook.findUnique({
      where: { id },
      include: {
        notes: {
          orderBy: { updatedAt: "desc" },
        },
      },
    });

    if (!notebook) {
      return NextResponse.json(
        { success: false, error: "Folder not found" },
        { status: 404 }
      );
    }

    const usedNames = new Map<string, number>();
    const zipEntries = notebook.notes.map((note) => {
      const noteRecord = note as Record<string, unknown>;
      const fileType =
        typeof noteRecord.fileType === "string" ? noteRecord.fileType : null;
      const markdownContent =
        typeof noteRecord.markdownContent === "string"
          ? noteRecord.markdownContent
          : null;
      const baseName = buildNoteDownloadName({
        title: note.title,
        fileType,
        content: note.content,
        markdownContent,
      });
      const seen = usedNames.get(baseName) ?? 0;
      usedNames.set(baseName, seen + 1);

      const extMatch = baseName.match(/(\.[^.]+)$/u);
      const ext = extMatch?.[1] ?? "";
      const stem = ext ? baseName.slice(0, -ext.length) : baseName;
      const entryName =
        seen === 0
          ? baseName
          : `${stem}-${seen + 1}${ext}`;

      return {
        name: entryName,
        content: new TextEncoder().encode(
          buildNoteDownloadBody({
            title: note.title,
            fileType,
            content: note.content,
            markdownContent,
          })
        ),
      };
    });

    const zip = createZip(zipEntries);
    const zipBody = new Uint8Array(zip.length);
    zipBody.set(zip);
    const zipName = buildNotebookZipName(notebook.name);

    return new NextResponse(new Blob([zipBody], { type: "application/zip" }), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to download folder" },
      { status: 500 }
    );
  }
}
