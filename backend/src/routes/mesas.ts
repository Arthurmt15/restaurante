import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { z } from 'zod'

const router = Router()

// Lista todas as mesas com status e quantidade de comandas
router.get('/', async (_req: Request, res: Response) => {
  const mesas = await prisma.mesa.findMany({
    include: { _count: { select: { comandas: true } } },
    orderBy: { numero: 'asc' },
  })
  res.json(mesas)
})

// Cadastra uma nova mesa
router.post('/', async (req: Request, res: Response) => {
  const schema = z.object({ numero: z.number().int().positive() })
  const { numero } = schema.parse(req.body)
  const mesa = await prisma.mesa.create({ data: { numero } })
  res.status(201).json(mesa)
})

// Alterna o status de uma mesa (LIVRE / OCUPADA)
router.patch('/:id/status', async (req: Request, res: Response) => {
  const mesa = await prisma.mesa.findUnique({ where: { id: req.params.id } })
  if (!mesa) return res.status(404).json({ error: 'Mesa não encontrada' })

  const novoStatus = mesa.status === 'LIVRE' ? 'OCUPADA' : 'LIVRE'
  const updated = await prisma.mesa.update({
    where: { id: req.params.id },
    data: { status: novoStatus },
  })
  res.json(updated)
})

// Remove permanentemente uma mesa
router.delete('/:id', async (req: Request, res: Response) => {
  const mesa = await prisma.mesa.findUnique({ where: { id: req.params.id } })
  if (!mesa) return res.status(404).json({ error: 'Mesa não encontrada' })
  if (mesa.status === 'OCUPADA') return res.status(400).json({ error: 'Não é possível excluir uma mesa ocupada' })
  await prisma.mesa.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

export default router
