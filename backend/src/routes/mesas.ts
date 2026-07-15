import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { z } from 'zod'

const router = Router()

router.get('/', async (_req: Request, res: Response) => {
  const mesas = await prisma.mesa.findMany({
    include: { _count: { select: { comandas: true } } },
    orderBy: { numero: 'asc' },
  })
  res.json(mesas)
})

router.post('/', async (req: Request, res: Response) => {
  const schema = z.object({ numero: z.number().int().positive() })
  const { numero } = schema.parse(req.body)
  const mesa = await prisma.mesa.create({ data: { numero } })
  res.status(201).json(mesa)
})

router.delete('/:id', async (req: Request, res: Response) => {
  await prisma.mesa.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

export default router
