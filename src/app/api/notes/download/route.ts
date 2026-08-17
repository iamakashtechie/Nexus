import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildNoteDownloadBody, buildNoteDownloadName } from "@/lib/backup";
import { createZip } from "@/lib/zip";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  try {
    const notes = await prisma.note.findMany({
      include: {
        notebook: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    const usedNames = new Map<string, number>();
    const zipEntries = notes.map((note) => {
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

      const directoryPath = note.notebook ? `${note.notebook.name}/` : "";
      const fullPathBase = `${directoryPath}${baseName}`;

      const seen = usedNames.get(fullPathBase) ?? 0;
      usedNames.set(fullPathBase, seen + 1);

      const extMatch = baseName.match(/(\.[^.]+)$/u);
      const ext = extMatch?.[1] ?? "";
      const stem = ext ? baseName.slice(0, -ext.length) : baseName;
      
      const entryName =
        seen === 0
          ? fullPathBase
          : `${directoryPath}${stem}-${seen + 1}${ext}`;

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
    
    const dateStr = new Date().toISOString().split('T')[0];
    const zipName = `nexus-backup-${dateStr}.zip`;

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
      { success: false, error: "Failed to download backup" },
      { status: 500 }
    );
  }
}
