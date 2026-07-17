import { PrismaClient } from '@prisma/client'

const p = new PrismaClient()

async function test() {
  const u = await p.usuario.findFirst()
  console.log('DB OK:', JSON.stringify(u, null, 2))
  await p.$disconnect()
}

test().catch(e => {
  console.error('DB ERROR:', e.message)
  p.$disconnect()
})
