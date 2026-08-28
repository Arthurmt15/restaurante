import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { HistoricoPreco, ItemCardapio } from '../models'

const router = Router()

// Lista histórico de preços de um item
router.get('/', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const { itemId } = req.query

  if (!itemId) {
    return res.status(400).json({ error: 'itemId é obrigatório' })
  }

  const historico = await HistoricoPreco.find({ itemId: String(itemId), tenantId })
    .populate('itemId', 'nome')
    .sort({ createdAt: -1 })

  res.json(historico)
})

// Registra uma alteração de preço
router.post('/', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const schema = z.object({
    itemId: z.string(),
    precoNovo: z.number().min(0),
  })
  const { itemId, precoNovo } = schema.parse(req.body)

  const item = await ItemCardapio.findOne({ _id: itemId, tenantId })
  if (!item) return res.status(404).json({ error: 'Item não encontrado' })

  const precoAnterior = item.preco
  if (precoAnterior === precoNovo) {
    return res.status(400).json({ error: 'O preço novo é igual ao preço atual' })
  }

  await HistoricoPreco.create({
    itemId,
    precoAnterior,
    precoNovo,
    tenantId,
    alteradoPor: req.user!.email,
  })

  await ItemCardapio.findByIdAndUpdate(itemId, { preco: precoNovo })

  res.status(201).json({ message: 'Preço atualizado e histórico registrado' })
})

export default router
