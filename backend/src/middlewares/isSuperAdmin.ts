import { Request, Response, NextFunction } from 'express'

/**
 * Middleware de autorização que restringe acesso exclusivamente ao perfil SUPERADMIN.
 *
 * Deve ser encadeado **após** o middleware `authenticateToken`, pois depende
 * de `req.user` estar preenchido.
 *
 * - Retorna 401 se o usuário não estiver autenticado.
 * - Retorna 403 se o papel do usuário não for `SUPERADMIN`.
 *
 * @param req - Requisição Express com `req.user` preenchido pelo middleware de autenticação.
 * @param res - Resposta HTTP.
 * @param next - Próximo middleware na cadeia.
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
