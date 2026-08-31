import { Router, Request, Response } from 'express'
import mongoose from 'mongoose'
import { ItemCardapio, MovimentoEstoque } from '../models'
import { z } from 'zod'

const router = Router()

/**
 * GET /api/estoque
 * Lista todos os itens ativos do cardápio com seus dados de estoque.
 */
router.get('/', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const itens = await ItemCardapio.find({ ativo: true, tenantId })
    .populate('categoria')
    .sort({ nome: 1 })
  res.json(itens)
})

/**
 * GET /api/estoque/movimentos
 * Lista movimentações de estoque (entradas e saídas).
 * Suporta filtro por itemId via query param.
 * Retorna os 100 registros mais recentes.
 */
router.get('/movimentos', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const { itemId } = req.query
  const where: Record<string, unknown> = itemId
    ? { itemId: String(itemId), tenantId }
    : { tenantId }

  const movimentos = await MovimentoEstoque.find(where)
    .populate({ path: 'itemId', populate: { path: 'categoriaId' } })
    .sort({ createdAt: -1 })
    .limit(100)
  res.json(movimentos)
})

/**
 * GET /api/estoque/baixo
 * Lista itens com estoque abaixo ou igual ao mínimo configurado.
 */
router.get('/baixo', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const itens = await ItemCardapio.find({
    ativo: true,
    tenantId,
    $expr: { $lte: ['$estoqueAtual', '$estoqueMinimo'] },
  })
    .populate('categoria')
    .sort({ nome: 1 })
  res.json(itens)
})

/**
 * PUT /api/estoque/:id
 * Atualiza o estoque atual e/ou estoque mínimo de um item do cardápio.
 */
router.put('/:id', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const existing = await ItemCardapio.findOne({ _id: req.params.id, tenantId })
  if (!existing) return res.status(404).json({ error: 'Item não encontrado' })

  const schema = z.object({
    estoqueAtual: z.number().int().min(0).optional(),
    estoqueMinimo: z.number().int().min(0).optional(),
  })
  const data = schema.parse(req.body)
  const item = await ItemCardapio.findByIdAndUpdate(req.params.id, data, { new: true })
    .populate('categoria')
  res.json(item)
})

/**
 * POST /api/estoque/movimento
 * Registra uma movimentação de estoque (entrada ou saída).
 * Atualiza o estoque do item dentro de uma transação.
 */
router.post('/movimento', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const schema = z.object({
    itemId: z.string(),
    tipo: z.enum(['ENTRADA', 'SAIDA']),
    quantidade: z.number().int().positive(),
    motivo: z.string().optional(),
  })
  const { itemId, tipo, quantidade, motivo } = schema.parse(req.body)

  const item = await ItemCardapio.findOne({ _id: itemId, tenantId })
  if (!item) return res.status(404).json({ error: 'Item não encontrado neste ambiente' })

  const session = await mongoose.startSession()
  let movimento
  try {
    const results = await session.withTransaction(async () => {
      const mov = await MovimentoEstoque.create([{
        itemId, tipo, quantidade, motivo, tenantId,
      }], { session })
      await ItemCardapio.findByIdAndUpdate(
        itemId,
        { $inc: { estoqueAtual: tipo === 'ENTRADA' ? quantidade : -quantidade } },
        { session }
      )
      return mov
    })
    movimento = results[0]
  } finally {
    session.endSession()
  }

  const populado = await MovimentoEstoque.findById(movimento._id)
    .populate({ path: 'itemId', populate: { path: 'categoriaId' } })

  res.status(201).json(populado)
})

export default router
