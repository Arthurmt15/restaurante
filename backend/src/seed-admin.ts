import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function seedAdmin() {
  const EMAIL = process.env.ADMIN_EMAIL || 'admin@restaurante.com'
  const SENHA = process.env.ADMIN_PASSWORD || 'Admin@2025!'
  const NOME = process.env.ADMIN_NAME || 'Administrador'

  console.log(`\n🔧 Verificando superadmin (${EMAIL})...`)

  const existente = await prisma.usuario.findUnique({ where: { email: EMAIL } })

  if (existente) {
    // Garantir que o tenantId está correto (= próprio id)
    if (!existente.tenantId || existente.tenantId !== existente.id) {
      await prisma.usuario.update({
        where: { id: existente.id },
        data: { tenantId: existente.id },
      })
      console.log(`✅ TenantId do superadmin corrigido para: ${existente.id}`)
    } else {
      console.log(`✅ Superadmin já existe: ${existente.email} (role: ${existente.role}, tenantId: ${existente.tenantId})`)
    }
    return
  }

  const senhaHash = await bcrypt.hash(SENHA, 12)

  const admin = await prisma.usuario.create({
    data: {
      email: EMAIL,
      senhaHash,
      nome: NOME,
      role: 'SUPERADMIN',
      status: 'ATIVO',
      tenantId: '', // será atualizado logo abaixo
    },
  })

  // Definir tenantId = próprio id (não pode ser feito no create pois o id é gerado pelo banco)
  await prisma.usuario.update({
    where: { id: admin.id },
    data: { tenantId: admin.id },
  })

  console.log(`\n✅ Superadmin criado com sucesso!`)
  console.log(`   ID:       ${admin.id}`)
  console.log(`   TenantId: ${admin.id}`)
  console.log(`   Email:    ${admin.email}`)
  console.log(`   Role:     ${admin.role}`)
  console.log(`\n⚠️  IMPORTANTE: Troque a senha "${SENHA}" após o primeiro login!\n`)
}

seedAdmin()
  .catch((e) => {
    console.error('❌ Erro ao criar superadmin:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
