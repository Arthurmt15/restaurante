import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { prisma } from '../lib/prisma'
import { generateAccessToken, TokenPayload } from '../middlewares/auth'

const router = Router()

const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_THIS_SECRET_IN_PRODUCTION'
const REFRESH_TOKEN_EXPIRES_DAYS = 7

// ─── Helper: gerar e salvar Refresh Token ────────────────────────────────────

async function createRefreshToken(usuarioId: string): Promise<string> {
  // Limpar refresh tokens expirados deste usuário
  await prisma.refreshToken.deleteMany({
    where: { usuarioId, expiresAt: { lt: new Date() } },
  })

  const token = crypto.randomBytes(64).toString('hex')
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_DAYS)

  await prisma.refreshToken.create({
    data: { token, usuarioId, expiresAt },
  })

  return token
}

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
// Rate limiting aplicado no index.ts (5 tentativas / 15 min por IP)

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, senha } = req.body

    if (!email || !senha) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' })
    }

    // Buscar usuário pelo email (case-insensitive via lowercase)
    const usuario = await prisma.usuario.findUnique({
      where: { email: String(email).toLowerCase().trim() },
    })

    // Verificação de credenciais com timing constante (evita timing attacks)
    const senhaValida = usuario
      ? await bcrypt.compare(String(senha), usuario.senhaHash)
      : await bcrypt.compare(String(senha), '$2a$12$invalido.hash.para.timing.constante')

    if (!usuario || !senhaValida) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }

    // Verificar status da conta
    if (usuario.status === 'SUSPENSO') {
      return res.status(403).json({ error: 'Conta suspensa. Entre em contato com o suporte.' })
    }
    if (usuario.status === 'INADIMPLENTE') {
      return res.status(403).json({ error: 'Conta com pagamento pendente. Entre em contato com o suporte.' })
    }

    // Atualizar timestamp de último login
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimoLogin: new Date() },
    })

    // Buscar garcom se role = GARCOM
    let garcomId: string | undefined
    if (usuario.role === 'GARCOM') {
      const garcom = await prisma.garcom.findUnique({
        where: { usuarioId: usuario.id }
      })
      if (garcom) {
        garcomId = garcom.id
      }
    }

    // Gerar tokens
    const accessTokenPayload: TokenPayload = {
      sub: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      role: usuario.role as 'SUPERADMIN' | 'CLIENTE' | 'GARCOM',
      status: usuario.status,
      tenantId: usuario.tenantId || usuario.id,  // fallback seguro
      garcomId,
    }

    const accessToken = generateAccessToken(accessTokenPayload)
    const refreshToken = await createRefreshToken(usuario.id)

    // Enviar refresh token em HTTP-Only Cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
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
  } catch (err) {
    console.error('[AUTH] Erro no login:', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────

router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.refreshToken

    if (!token) {
      return res.status(401).json({ error: 'Refresh token não encontrado', code: 'NO_REFRESH_TOKEN' })
    }

    // Buscar refresh token no banco
    const refreshTokenRecord = await prisma.refreshToken.findUnique({
      where: { token },
      include: { usuario: true },
    })

    if (!refreshTokenRecord) {
      return res.status(401).json({ error: 'Refresh token inválido', code: 'INVALID_REFRESH_TOKEN' })
    }

    // Verificar expiração
    if (refreshTokenRecord.expiresAt < new Date()) {
      await prisma.refreshToken.delete({ where: { token } })
      res.clearCookie('refreshToken', { path: '/api/auth' })
      return res.status(401).json({ error: 'Refresh token expirado', code: 'REFRESH_TOKEN_EXPIRED' })
    }

    const usuario = refreshTokenRecord.usuario

    // Verificar status da conta
    if (usuario.status !== 'ATIVO') {
      return res.status(403).json({ error: 'Conta inativa' })
    }

    // Rotação de refresh token (invalidar o atual e emitir um novo)
    await prisma.refreshToken.deleteMany({ where: { token } })
    const newRefreshToken = await createRefreshToken(usuario.id)

    let garcomId: string | undefined
    if (usuario.role === 'GARCOM') {
      const garcom = await prisma.garcom.findUnique({
        where: { usuarioId: usuario.id }
      })
      if (garcom) {
        garcomId = garcom.id
      }
    }

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
      sameSite: 'strict',
      maxAge: REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
      path: '/api/auth',
    })

    return res.json({ accessToken })
  } catch (err) {
    console.error('[AUTH] Erro no refresh:', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// ─── POST /api/auth/logout ────────────────────────────────────────────────────

router.post('/logout', async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.refreshToken

    if (token) {
      // Invalidar refresh token no banco
      await prisma.refreshToken.deleteMany({ where: { token } })
    }

    res.clearCookie('refreshToken', { path: '/api/auth' })
    return res.json({ message: 'Logout realizado com sucesso' })
  } catch (err) {
    console.error('[AUTH] Erro no logout:', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
// Retorna dados do usuário logado (requer access token válido)

router.get('/me', async (req: Request, res: Response) => {
  const authHeader = req.headers['authorization']
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return res.status(401).json({ error: 'Não autenticado' })
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as TokenPayload
    const usuario = await prisma.usuario.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, nome: true, role: true, status: true, ultimoLogin: true },
    })

    if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado' })

    let garcomId: string | undefined
    if (usuario.role === 'GARCOM') {
      const garcom = await prisma.garcom.findUnique({
        where: { usuarioId: usuario.id }
      })
      if (garcom) garcomId = garcom.id
    }

    return res.json({ usuario: { ...usuario, garcomId }, impersonatedBy: payload.impersonatedBy })
  } catch {
    return res.status(401).json({ error: 'Token inválido' })
  }
})

export default router
