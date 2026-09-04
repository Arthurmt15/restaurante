/**
 * Script de seeds para criar/verificar o superadmin master.
 *
 * Este script é executado durante a inicialização do sistema (docker-start)
 * e garante que o administrador master existe no banco de dados.
 *
 * O email padrão é arthurknf@gmail.com (admin master do sistema).
 * Usuários com este email sempre terão role SUPERADMIN.
 *
 * Variáveis de ambiente suportadas:
 * - ADMIN_EMAIL: Email do admin (padrão: arthurknf@gmail.com)
 * - ADMIN_NAME: Nome do admin (padrão: Administrador Master)
 */
import { connectDatabase, disconnectDatabase } from './lib/mongoose'
import { Usuario } from './models'

/** Email do admin master do sistema */
const ADMIN_MASTER_EMAIL = 'arthurknf@gmail.com'

/**
 * Função principal que cria ou verifica o superadmin master.
 *
 * Fluxo:
 * 1. Conecta ao banco de dados
 * 2. Busca usuário pelo email do admin master
 * 3. Se existe: corrige tenantId se necessário
 * 4. Se não existe: cria novo superadmin sem senhaHash (login via Google)
 */
async function seedAdmin() {
  await connectDatabase()

  const EMAIL = process.env.ADMIN_EMAIL || ADMIN_MASTER_EMAIL
  const NOME = process.env.ADMIN_NAME || 'Administrador Master'

  console.log(`\n🔧 Verificando superadmin (${EMAIL})...`)

  const existente = await Usuario.findOne({ email: EMAIL })

  if (existente) {
    // Corrigir tenantId se estiver vazio ou diferente do ID do usuário
    if (!existente.tenantId || existente.tenantId !== String(existente._id)) {
      await Usuario.findByIdAndUpdate(existente._id, { tenantId: String(existente._id) })
      console.log(`✅ TenantId do superadmin corrigido para: ${existente._id}`)
    }

    // Garantir que o role é SUPERADMIN
    if (existente.role !== 'SUPERADMIN') {
      await Usuario.findByIdAndUpdate(existente._id, { role: 'SUPERADMIN' })
      console.log(`✅ Role do superadmin corrigido para: SUPERADMIN`)
    }

    console.log(`✅ Superadmin já existe: ${existente.email} (role: ${existente.role})`)
    return
  }

  // Criar novo superadmin (senhaHash é opcional - login via Google)
  const admin = await Usuario.create({
    email: EMAIL,
    nome: NOME,
    role: 'SUPERADMIN',
    status: 'ATIVO',
    tenantId: '',
  })

  // Definir tenantId como o próprio ID do usuário
  await Usuario.findByIdAndUpdate(admin._id, { tenantId: String(admin._id) })

  console.log(`\n✅ Superadmin criado com sucesso!`)
  console.log(`   ID:       ${admin._id}`)
  console.log(`   TenantId: ${admin._id}`)
  console.log(`   Email:    ${admin.email}`)
  console.log(`   Role:     ${admin.role}`)
  console.log(`\n🔑 Login via Google OAuth (email: ${EMAIL})\n`)
}

seedAdmin()
  .catch((e) => {
    console.error('❌ Erro ao criar superadmin:', e)
    process.exit(1)
  })
  .finally(() => disconnectDatabase())
