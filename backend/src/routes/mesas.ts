import { Router, Request, Response } from 'express'
import { Mesa, Comanda } from '../models'
import { z } from 'zod'
import { authorizeRoles } from '../middlewares/authorize'

const router = Router()

router.get('/', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const mesas = await Mesa.aggregate([
    { $match: { tenantId } },
    { $lookup: { from: 'comandas', localField: '_id', foreignField: 'mesaId', as: 'comandasRef' } },
    { $addFields: { _count: { comandas: { $size: '$comandasRef' } } } },
    { $project: { comandasRef: 0 } },
    { $sort: { numero: 1 } },
  ])
  res.json(mesas)
})

router.post('/', authorizeRoles('SUPERADMIN', 'CLIENTE'), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const schema = z.object({ numero: z.number().int().positive() })
  const { numero } = schema.parse(req.body)

  const existente = await Mesa.findOne({ numero, tenantId })
  if (existente) return res.status(409).json({ error: `Mesa ${numero} já existe neste ambiente` })

  const mesa = await Mesa.create({ numero, tenantId })
  res.status(201).json(mesa)
})

router.patch('/:id/status', authorizeRoles('SUPERADMIN', 'CLIENTE'), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const mesa = await Mesa.findOne({ _id: req.params.id, tenantId })
  if (!mesa) return res.status(404).json({ error: 'Mesa não encontrada' })

  const novoStatus = mesa.status === 'LIVRE' ? 'OCUPADA' : 'LIVRE'
  const updated = await Mesa.findByIdAndUpdate(req.params.id, { status: novoStatus }, { new: true })
  res.json(updated)
})

router.delete('/:id', authorizeRoles('SUPERADMIN', 'CLIENTE'), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const mesa = await Mesa.findOne({ _id: req.params.id, tenantId })
  if (!mesa) return res.status(404).json({ error: 'Mesa não encontrada' })
  if (mesa.status === 'OCUPADA') return res.status(400).json({ error: 'Não é possível excluir uma mesa ocupada' })
  await Mesa.findByIdAndDelete(req.params.id)
  res.status(204).send()
})

export default router
