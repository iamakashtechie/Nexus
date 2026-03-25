const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const noteId = 'cmn0b5vff0002l204txd4kqkt';
  const note = await prisma.note.findUnique({
    where: { id: noteId }
  });
  console.log(JSON.stringify(note, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
