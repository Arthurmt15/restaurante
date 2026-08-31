import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { Usuario, RefreshToken, Garcom } from '../models'
import { generateAccessToken, TokenPayload } from '../middlewares/auth'
import { getJwtSecret } from '../lib/config'
import { errorHandler } from '../middlewares/errorHandler'

const router = Router()
router.use(errorHandler)

async function buscarGarcomId(usuarioId: string): Promise<string | null> {
  const garcom = await Garcom.findOne({ usuarioId })
  return garcom ? String(garcom._id) : null
}

const REFRESH_TOKEN_EXPIRES_DAYS = 15

// ─── Helper: gerar e salvar Refresh Token ────────────────────────────────────

async function createRefreshToken(usuarioId: string): Promise<string> {
  // Limpar refresh tokens expirados deste usuário
  await RefreshToken.deleteMany({
    usuarioId,
    expiresAt: { $lt: new Date() },
  })

  const token = crypto.randomBytes(64).toString('hex')
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_DAYS)

  await RefreshToken.create({ token, usuarioId, expiresAt })

  return token
}

/**
 * POST /api/auth/login
 * Autentica o usuário com email e senha.
 * Retorna access token e configura refresh token em cookie HTTP-Only.
 * Verifica status da conta (ATIVO, SUSPENSO, INADIMPLENTE).
 * Rate limiting: 5 tentativas por 15 min por IP.
 */
router.post('/login', async (req: Request, res: Response) => {
  const { email, senha } = req.body

  if (!email || !senha) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' })
  }

  const usuario = await Usuario.findOne({
    email: String(email).toLowerCase().trim(),
  })

  const senhaValida = usuario
    ? await bcrypt.compare(String(senha), usuario.senhaHash)
    : await bcrypt.compare(String(senha), '$2a$12$invalido.hash.para.timing.constante')

  if (!usuario || !senhaValida) {
    return res.status(401).json({ error: 'Credenciais inválidas' })
  }

  if (usuario.status === 'SUSPENSO') {
    return res.status(403).json({ error: 'Conta suspensa. Entre em contato com o suporte.' })
  }
  if (usuario.status === 'INADIMPLENTE') {
    return res.status(403).json({ error: 'Conta com pagamento pendente. Entre em contato com o suporte.' })
  }

  await Usuario.findByIdAndUpdate(usuario.id, { ultimoLogin: new Date() }, { new: true })

  const garcomId = usuario.role === 'GARCOM' ? await buscarGarcomId(usuario.id) ?? undefined : undefined

  const accessTokenPayload: TokenPayload = {
    sub: usuario.id,
    email: usuario.email,
    nome: usuario.nome,
    role: usuario.role as 'SUPERADMIN' | 'CLIENTE' | 'GARCOM',
    status: usuario.status,
    tenantId: usuario.tenantId || usuario.id,
    garcomId,
  }

  const accessToken = generateAccessToken(accessTokenPayload)
  const refreshToken = await createRefreshToken(usuario.id)

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    maxAge: REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  })

  return res.json({
    accessToken,
    usuario: {
      id: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      role: usuario.role,
      status: usuario.status,
      garcomId,
    },
  })
})

/**
 * POST /api/auth/refresh
 * Renova o access token usando o refresh token armazenado em cookie.
 * Realiza rotação do refresh token (emite novo e invalida o anterior).
 */
router.post('/refresh', async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken

  if (!token) {
    return res.status(401).json({ error: 'Refresh token não encontrado', code: 'NO_REFRESH_TOKEN' })
  }

  const refreshTokenRecord = await RefreshToken.findOne({ token }).populate('usuarioId')

  if (!refreshTokenRecord) {
    return res.status(401).json({ error: 'Refresh token inválido', code: 'INVALID_REFRESH_TOKEN' })
  }

  if (refreshTokenRecord.expiresAt < new Date()) {
    await RefreshToken.findOneAndDelete({ token })
    res.clearCookie('refreshToken', {
      path: '/api/auth',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      secure: process.env.NODE_ENV === 'production',
    })
    return res.status(401).json({ error: 'Refresh token expirado', code: 'REFRESH_TOKEN_EXPIRED' })
  }

  const usuario = refreshTokenRecord.usuarioId as any

  if (usuario.status !== 'ATIVO') {
    return res.status(403).json({ error: 'Conta inativa' })
  }

  await RefreshToken.deleteMany({ token })
  const newRefreshToken = await createRefreshToken(usuario.id)

  const garcomId = usuario.role === 'GARCOM' ? await buscarGarcomId(usuario.id) ?? undefined : undefined

  const accessTokenPayload: TokenPayload = {
    sub: usuario.id,
    email: usuario.email,
    nome: usuario.nome,
    role: usuario.role as 'SUPERADMIN' | 'CLIENTE' | 'GARCOM',
    status: usuario.status,
    tenantId: usuario.tenantId || usuario.id,
    garcomId,
  }


  const accessToken = generateAccessToken(accessTokenPayload)

  res.cookie('refreshToken', newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    maxAge: REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  })

  return res.json({ accessToken })
})

/**
 * POST /api/auth/logout
 * Encerra a sessão do usuário.
 * Invalida o refresh token no banco e remove o cookie.
 */
router.post('/logout', async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken

  if (token) {
    await RefreshToken.deleteMany({ token })
  }

  res.clearCookie('refreshToken', {
    path: '/api/auth',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    secure: process.env.NODE_ENV === 'production',
  })
  return res.json({ message: 'Logout realizado com sucesso' })
})

/**
 * GET /api/auth/me
 * Retorna os dados do usuário logado.
 * Requer um access token válido no header Authorization.
 */
router.get('/me', async (req: Request, res: Response) => {
  const authHeader = req.headers['authorization']
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return res.status(401).json({ error: 'Não autenticado' })
  }

  const payload = jwt.verify(token, getJwtSecret()) as TokenPayload
  const usuario = await Usuario.findById(payload.sub)
    .select('email nome role status ultimoLogin')
    .lean()

  if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado' })

  const garcomId = usuario.role === 'GARCOM' ? await buscarGarcomId(String(usuario._id)) ?? undefined : undefined

  return res.json({ usuario: { id: String(usuario._id), ...usuario, garcomId }, impersonatedBy: payload.impersonatedBy })
})

export default router
