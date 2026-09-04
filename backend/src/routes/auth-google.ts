/**
 * Rota de autenticação via Google OAuth.
 *
 * Este endpoint sincroniza o usuário autenticado via Google com o banco
 * de dados do sistema. Se o usuário já existe, retorna seus dados;
 * caso contrário, cria um novo registro.
 *
 * Fluxo:
 * 1. Recebe dados do perfil Google do NextAuth
 * 2. Busca usuário existente por email
 * 3. Se não existe, cria novo usuário com role CLIENTE
 * 4. Se email é do admin master, força role SUPERADMIN
 * 5. Retorna JWT do sistema + dados do usuário
 *
 * Rota: POST /api/auth/google-sync
 * Body: { email, nome, googleId, imagem }
 * Response: { accessToken, usuario: { id, email, nome, role, status } }
 */
import { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { Usuario } from '../models'
import { generateAccessToken, TokenPayload } from '../middlewares/auth'
import { errorHandler } from '../middlewares/errorHandler'

const router = Router()
router.use(errorHandler)

/** Email do admin master com acesso total ao sistema */
const ADMIN_MASTER_EMAIL = 'arthurknf@gmail.com'

/** Tempo de expiração do refresh token em dias */
const REFRESH_TOKEN_EXPIRES_DAYS = 15

/**
 * Interface que define os dados esperados na requisição de sincronização.
 * Contém informações do perfil Google necessárias para criar/buscar usuário.
 */
interface GoogleSyncBody {
  email: string
  nome: string
  googleId: string
  imagem?: string
}

/**
 * POST /api/auth/google-sync
 *
 * Sincroniza o usuário Google com o MongoDB e retorna JWT do sistema.
 *
 * Lógica:
 * - Se usuário com o email já existe: atualiza googleId se necessário
 * - Se é o email do admin master: garante role SUPERADMIN
 * - Se é um novo usuário: cria com role CLIENTE e status ATIVO
 * - Retorna accessToken no mesmo formato do login tradicional
 *
 * @param req - Requisição com dados do perfil Google
 * @param res - Resposta com accessToken e dados do usuário
 */
router.post('/', async (req: Request, res: Response) => {
  const { email, nome, googleId, imagem } = req.body as GoogleSyncBody

  // Validar dados obrigatórios
  if (!email || !nome || !googleId) {
    return res.status(400).json({
      error: 'Email, nome e googleId são obrigatórios',
    })
  }

  const emailNormalizado = email.toLowerCase().trim()

  // Buscar usuário existente por email
  let usuario = await Usuario.findOne({ email: emailNormalizado })

  if (usuario) {
    // Usuário já existe - atualizar googleId se necessário
    if (!usuario.googleId) {
      await Usuario.findByIdAndUpdate(usuario._id, { googleId })
    }

    // Se é o admin master, garantir que tem role SUPERADMIN
    if (emailNormalizado === ADMIN_MASTER_EMAIL && usuario.role !== 'SUPERADMIN') {
      await Usuario.findByIdAndUpdate(usuario._id, { role: 'SUPERADMIN' })
      usuario.role = 'SUPERADMIN'
    }

    // Atualizar último login
    await Usuario.findByIdAndUpdate(usuario._id, { ultimoLogin: new Date() })
  } else {
    // Determinar role baseado no email
    const role = emailNormalizado === ADMIN_MASTER_EMAIL ? 'SUPERADMIN' : 'CLIENTE'

    // Criar novo usuário
    usuario = await Usuario.create({
      email: emailNormalizado,
      nome: nome.trim(),
      googleId,
      role,
      status: 'ATIVO',
      tenantId: '', // Será definido posteriormente se necessário
      ultimoLogin: new Date(),
    })

    // Definir tenantId como o próprio ID do usuário
    await Usuario.findByIdAndUpdate(usuario._id, { tenantId: String(usuario._id) })
  }

  // Montar payload do JWT no mesmo formato do login tradicional
  const accessTokenPayload: TokenPayload = {
    sub: String(usuario._id),
    email: usuario.email,
    nome: usuario.nome,
    role: usuario.role as 'SUPERADMIN' | 'CLIENTE' | 'GARCOM',
    status: usuario.status,
    tenantId: usuario.tenantId || String(usuario._id),
  }

  // Gerar access token JWT
  const accessToken = generateAccessToken(accessTokenPayload)

  // Retornar dados no mesmo formato do endpoint /api/auth/login
  return res.json({
    accessToken,
    usuario: {
      id: String(usuario._id),
      email: usuario.email,
      nome: usuario.nome,
      role: usuario.role,
      status: usuario.status,
    },
  })
})

export default router
