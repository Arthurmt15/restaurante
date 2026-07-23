import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authorizeRoles } from '../middlewares/authorize'
import { z } from 'zod'

const router = Router()

// Obtém as configurações do restaurante (tenant)
router.get('/', authorizeRoles('SUPERADMIN', 'CLIENTE'), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  
  let config = await prisma.configuracoes.findUnique({
    where: { tenantId }
  })
  
  // Se ainda não existir, criar com valores padrão
  if (!config) {
    config = await prisma.configuracoes.create({
      data: { tenantId, codigoExclusao: '1234' }
    })
  }
  
  res.json(config)
})

// Atualiza as configurações do restaurante
router.put('/', authorizeRoles('SUPERADMIN', 'CLIENTE'), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  
  const schema = z.object({
    codigoExclusao: z.string().min(1)
  })
  
  const { codigoExclusao } = schema.parse(req.body)
  
  const config = await prisma.configuracoes.upsert({
    where: { tenantId },
    update: { codigoExclusao },
    create: { tenantId, codigoExclusao }
  })
  
  res.json(config)
})

export default router
