import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { HistoricoPreco, ItemCardapio } from '../models'

const router = Router()

/**
 * GET /api/historico-preco
 * Lista o histórico de alterações de preço de um item do cardápio.
 * Requer query param itemId.
 */
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

/**
 * POST /api/historico-preco
 * Registra uma alteração de preço de um item e atualiza o preço atual.
 * Cria registro no histórico com preço anterior e novo preço.
 */
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
