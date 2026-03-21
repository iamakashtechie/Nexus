import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createNotebookSchema } from "@/lib/validations";

export async function GET() {
  try {
    const notebooks = await prisma.notebook.findMany({
      include: { _count: { select: { notes: true } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ success: true, data: notebooks });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch notebooks" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createNotebookSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const notebook = await prisma.notebook.create({
      data: { name: parsed.data.name },
      include: { _count: { select: { notes: true } } },
    });

    return NextResponse.json(
      { success: true, data: notebook },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to create notebook" },
      { status: 500 }
    );
  }
}
