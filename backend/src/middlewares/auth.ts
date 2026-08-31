import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { getJwtSecret } from '../lib/config'

/**
 * Payload decodificado do token JWT.
 *
 * Contém as informações do usuário autenticado, incluindo identificadores
 * de tenant e dados de impersonation quando aplicável.
 */
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

/**
 * Middleware de autenticação via JWT.
 *
 * Lê o token do header `Authorization: Bearer <token>` ou do query parameter `token`.
 * Decodifica o token e injeta o payload em `req.user`.
 *
 * Retorna 401 se o token não for fornecido, estiver expirado ou for inválido.
 *
 * @param req - Requisição Express.
 * @param res - Resposta HTTP.
 * @param next - Próximo middleware na cadeia (chamado se o token for válido).
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
    const payload = jwt.verify(token, getJwtSecret()) as TokenPayload
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
 * Gera um Access Token JWT com validade de 15 dias.
 *
 * @param payload - Dados do usuário a serem codificados no token (sem `iat` e `exp`).
 * @returns O token JWT assinado.
 */
export function generateAccessToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: '15d',
  })
}
