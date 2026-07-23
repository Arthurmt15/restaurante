import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authorizeRoles } from '../middlewares/authorize'

const router = Router()

// Lista todas as atividades dos garçons no tenant, com filtro opcional por garcomId
router.get('/', authorizeRoles('SUPERADMIN', 'CLIENTE'), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const { garcomId } = req.query

  const where: any = { tenantId }
  if (garcomId) {
    where.garcomId = String(garcomId)
  }

  const atividades = await prisma.atividadeGarcom.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200 // Limite razoável para o feed
  })
  
  res.json(atividades)
})

export default router
