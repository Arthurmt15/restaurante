import { Router, Request, Response } from 'express'
import { Usuario } from '../../models'
import { errorHandler } from '../../middlewares/errorHandler'

const router = Router()
router.use(errorHandler)

/**
 * GET /api/admin/usuarios/stats/resumo
 * Retorna resumo dos usuários: total, ativos, suspensos e inadimplentes.
 */
router.get('/stats/resumo', async (_req: Request, res: Response) => {
  const [total, ativos, suspensos, inadimplentes] = await Promise.all([
    Usuario.countDocuments(),
    Usuario.countDocuments({ status: 'ATIVO' }),
    Usuario.countDocuments({ status: 'SUSPENSO' }),
    Usuario.countDocuments({ status: 'INADIMPLENTE' }),
  ])

  return res.json({ total, ativos, suspensos, inadimplentes })
})

/**
 * GET /api/admin/usuarios/:id
 * Busca um usuário pelo ID.
 */
router.get('/:id', async (req: Request, res: Response) => {
  const usuario = await Usuario.findById(req.params.id)
    .select('email nome role status ultimoLogin createdAt updatedAt tenantId')

  if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado' })

  return res.json(usuario)
})

export default router
