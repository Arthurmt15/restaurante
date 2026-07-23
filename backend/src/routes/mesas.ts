import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { z } from 'zod'
import { authorizeRoles } from '../middlewares/authorize'

const router = Router()

// Lista todas as mesas do tenant com status e quantidade de comandas
router.get('/', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const mesas = await prisma.mesa.findMany({
    where: { tenantId },
    include: { _count: { select: { comandas: true } } },
    orderBy: { numero: 'asc' },
  })
  res.json(mesas)
})

// Cadastra uma nova mesa no tenant
router.post('/', authorizeRoles('SUPERADMIN', 'CLIENTE'), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const schema = z.object({ numero: z.number().int().positive() })
  const { numero } = schema.parse(req.body)

  // Verificar se o número já existe neste tenant
  const existente = await prisma.mesa.findUnique({ where: { numero_tenantId: { numero, tenantId } } })
  if (existente) return res.status(409).json({ error: `Mesa ${numero} já existe neste ambiente` })

  const mesa = await prisma.mesa.create({ data: { numero, tenantId } })
  res.status(201).json(mesa)
})

// Alterna o status de uma mesa do tenant (LIVRE / OCUPADA)
router.patch('/:id/status', authorizeRoles('SUPERADMIN', 'CLIENTE'), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const mesa = await prisma.mesa.findFirst({ where: { id: req.params.id, tenantId } })
  if (!mesa) return res.status(404).json({ error: 'Mesa não encontrada' })

  const novoStatus = mesa.status === 'LIVRE' ? 'OCUPADA' : 'LIVRE'
  const updated = await prisma.mesa.update({
    where: { id: req.params.id },
    data: { status: novoStatus },
  })
  res.json(updated)
})

// Remove permanentemente uma mesa do tenant
router.delete('/:id', authorizeRoles('SUPERADMIN', 'CLIENTE'), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const mesa = await prisma.mesa.findFirst({ where: { id: req.params.id, tenantId } })
  if (!mesa) return res.status(404).json({ error: 'Mesa não encontrada' })
  if (mesa.status === 'OCUPADA') return res.status(400).json({ error: 'Não é possível excluir uma mesa ocupada' })
  await prisma.mesa.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

export default router
