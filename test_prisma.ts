import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  try {
    const note = await prisma.note.findFirst();
    if (!note) { console.log('No notes'); return; }
    
    // Attempt the exact update that is failing
    const res = await (prisma as any).note.update({
      where: { id: note.id },
      data: {
        title: note.title,
        fileType: ".md",
        markdownContent: "test update",
      }
    });
    console.log("Success:", res);
  } catch (e: any) {
    console.error("Prisma Error:", e.name, e.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
