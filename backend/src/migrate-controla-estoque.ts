import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Backfill: marca itens da categoria "Bebidas" com controlaEstoque = true,
// substituindo a verificação antiga por nome de categoria
async function main() {
  const result = await prisma.itemCardapio.updateMany({
    where: { controlaEstoque: false, categoria: { nome: 'Bebidas' } },
    data: { controlaEstoque: true },
  })
  console.log(`Backfill controlaEstoque concluído: ${result.count} item(ns) atualizado(s).`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
