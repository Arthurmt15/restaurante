import bcrypt from 'bcryptjs'
import { connectDatabase, disconnectDatabase } from './lib/mongoose'
import { Usuario } from './models'

async function seedAdmin() {
  await connectDatabase()

  const EMAIL = process.env.ADMIN_EMAIL || 'admin@restaurante.com'
  const SENHA = process.env.ADMIN_PASSWORD || 'Admin@2025!'
  const NOME = process.env.ADMIN_NAME || 'Administrador'

  console.log(`\n🔧 Verificando superadmin (${EMAIL})...`)

  const existente = await Usuario.findOne({ email: EMAIL })

  if (existente) {
    if (!existente.tenantId || existente.tenantId !== String(existente._id)) {
      await Usuario.findByIdAndUpdate(existente._id, { tenantId: String(existente._id) })
      console.log(`✅ TenantId do superadmin corrigido para: ${existente._id}`)
    } else {
      console.log(`✅ Superadmin já existe: ${existente.email} (role: ${existente.role}, tenantId: ${existente.tenantId})`)
    }
    return
  }

  const senhaHash = await bcrypt.hash(SENHA, 12)

  const admin = await Usuario.create({
    email: EMAIL,
    senhaHash,
    nome: NOME,
    role: 'SUPERADMIN',
    status: 'ATIVO',
    tenantId: '',
  })

  await Usuario.findByIdAndUpdate(admin._id, { tenantId: String(admin._id) })

  console.log(`\n✅ Superadmin criado com sucesso!`)
  console.log(`   ID:       ${admin._id}`)
  console.log(`   TenantId: ${admin._id}`)
  console.log(`   Email:    ${admin.email}`)
  console.log(`   Role:     ${admin.role}`)
  console.log(`\n⚠️  IMPORTANTE: Troque a senha "${SENHA}" após o primeiro login!\n`)
}

seedAdmin()
  .catch((e) => {
    console.error('❌ Erro ao criar superadmin:', e)
    process.exit(1)
  })
  .finally(() => disconnectDatabase())
