import { Router, Request, Response } from 'express'
import { AtividadeGarcom } from '../models'
import { authorizeRoles } from '../middlewares/authorize'

const router = Router()

/**
 * GET /api/atividades
 * Lista atividades registradas dos garçons no tenant.
 * Suporta filtro por garcomId via query param.
 * Retorna até 200 registros ordenados por data de criação (mais recentes primeiro).
 * Requer role SUPERADMIN ou CLIENTE.
 */
router.get('/', authorizeRoles('SUPERADMIN', 'CLIENTE'), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const { garcomId } = req.query

  const where: any = { tenantId }
  if (garcomId) {
    where.garcomId = String(garcomId)
  }

  const atividades = await AtividadeGarcom.find(where)
    .sort({ createdAt: -1 })
    .limit(200)
  
  res.json(atividades)
})

export default router
