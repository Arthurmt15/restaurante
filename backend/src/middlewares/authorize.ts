import { Request, Response, NextFunction } from 'express'

/**
 * Middleware de autorização baseado em papéis (roles).
 *
 * Retorna uma função middleware que verifica se o papel do usuário
 * autenticado está na lista de papéis permitidos.
 *
 * Deve ser encadeado **após** o middleware `authenticateToken`.
 *
 * @param allowedRoles - Lista de papéis (roles) autorizados a acessar a rota.
 * @returns Uma função middleware que valida o papel do usuário.
 *
 * @example
 * ```typescript
 * router.get('/admin', authenticateToken, authorizeRoles('SUPERADMIN', 'GERENTE'), handler);
 * ```
 */
export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Usuário não autenticado' })
      return
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Acesso negado para o seu perfil' })
      return
    }

    next()
  }
}
