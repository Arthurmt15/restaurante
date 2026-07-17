import { Request, Response, NextFunction } from 'express'

/**
 * Middleware de proteção de rotas administrativas.
 * Deve ser usado APÓS o middleware authenticateToken.
 * Bloqueia o acesso caso o usuário não seja SUPERADMIN.
 */
export function isSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Não autenticado' })
    return
  }

  if (req.user.role !== 'SUPERADMIN') {
    res.status(403).json({ error: 'Acesso restrito a administradores' })
    return
  }

  next()
}
