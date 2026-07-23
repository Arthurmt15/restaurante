const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.usuario.findMany();
  for (const u of users) {
    if (u.email !== u.email.toLowerCase()) {
      console.log('Fixing:', u.email, '->', u.email.toLowerCase());
      await prisma.usuario.update({ where: { id: u.id }, data: { email: u.email.toLowerCase() } });
    }
  }
  console.log('Done');
}
main();
