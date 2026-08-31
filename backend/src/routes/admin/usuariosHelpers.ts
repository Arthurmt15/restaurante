import { Router, Request, Response } from 'express'
import { Usuario } from '../../models'

const router = Router()

/**
 * GET /api/admin/usuarios/stats/resumo
 * Retorna resumo dos usuários: total, ativos, suspensos e inadimplentes.
 */
router.get('/stats/resumo', async (_req: Request, res: Response) => {
  try {
    const [total, ativos, suspensos, inadimplentes] = await Promise.all([
      Usuario.countDocuments(),
      Usuario.countDocuments({ status: 'ATIVO' }),
      Usuario.countDocuments({ status: 'SUSPENSO' }),
      Usuario.countDocuments({ status: 'INADIMPLENTE' }),
    ])

    return res.json({ total, ativos, suspensos, inadimplentes })
  } catch (err) {
    console.error('[ADMIN] Erro ao buscar resumo:', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

/**
 * GET /api/admin/usuarios/:id
 * Busca um usuário pelo ID.
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const usuario = await Usuario.findById(req.params.id)
      .select('email nome role status ultimoLogin createdAt updatedAt tenantId')

    if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado' })

    return res.json(usuario)
  } catch (err) {
    console.error('[ADMIN] Erro ao buscar usuário:', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

export default router
