import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

// Tipo do payload decodificado do JWT
export interface TokenPayload {
  sub: string          // ID do usuário
  email: string
  nome: string
  role: 'SUPERADMIN' | 'CLIENTE' | 'GARCOM'
  status: string
  tenantId: string     // ID do ambiente isolado (pode ser o próprio id ou o id de outro usuário)
  garcomId?: string    // ID do garçom atrelado (apenas para role GARCOM)
  impersonatedBy?: string  // ID do superadmin quando em modo impersonation
  iat?: number
  exp?: number
}

// Extensão do tipo Request para incluir o usuário autenticado
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_THIS_SECRET_IN_PRODUCTION'

/**
 * Middleware de autenticação via JWT.
 * Lê o token do header Authorization: Bearer <token>
 * Injeta req.user com o payload decodificado (inclui tenantId).
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization']
  let token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null
    
  if (!token && req.query.token) {
    token = String(req.query.token)
  }

  if (!token) {
    res.status(401).json({ error: 'Token de autenticação não fornecido' })
    return
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as TokenPayload
    req.user = payload
    next()
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expirado', code: 'TOKEN_EXPIRED' })
    } else {
      res.status(401).json({ error: 'Token inválido' })
    }
  }
}

/**
 * Gera um Access Token JWT de curta duração (15 minutos).
 */
export function generateAccessToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '15m',
  })
}
