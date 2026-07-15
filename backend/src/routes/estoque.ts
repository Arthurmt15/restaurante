import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { z } from 'zod'

const router = Router()

router.get('/', async (_req: Request, res: Response) => {
  const itens = await prisma.itemCardapio.findMany({
    where: { ativo: true },
    include: { categoria: true },
    orderBy: { categoria: { nome: 'asc' } },
  })
  res.json(itens)
})

router.get('/movimentos', async (req: Request, res: Response) => {
  const { itemId } = req.query
  const where = itemId ? { itemId: String(itemId) } : {}
  const movimentos = await prisma.movimentoEstoque.findMany({
    where,
    include: { item: { include: { categoria: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  res.json(movimentos)
})

router.get('/baixo', async (_req: Request, res: Response) => {
  const itens = await prisma.itemCardapio.findMany({
    where: {
      ativo: true,
      estoqueAtual: { lte: prisma.itemCardapio.fields.estoqueMinimo },
    },
    include: { categoria: true },
    orderBy: { categoria: { nome: 'asc' } },
  })
  res.json(itens)
})

router.put('/:id', async (req: Request, res: Response) => {
  const schema = z.object({
    estoqueAtual: z.number().int().min(0).optional(),
    estoqueMinimo: z.number().int().min(0).optional(),
  })
  const data = schema.parse(req.body)
  const item = await prisma.itemCardapio.update({
    where: { id: req.params.id },
    data,
    include: { categoria: true },
  })
  res.json(item)
})

router.post('/movimento', async (req: Request, res: Response) => {
  const schema = z.object({
    itemId: z.string().uuid(),
    tipo: z.enum(['ENTRADA', 'SAIDA']),
    quantidade: z.number().int().positive(),
    motivo: z.string().optional(),
  })
  const { itemId, tipo, quantidade, motivo } = schema.parse(req.body)

  const item = await prisma.itemCardapio.findUnique({ where: { id: itemId } })
  if (!item) return res.status(404).json({ error: 'Item não encontrado' })

  const movimento = await prisma.movimentoEstoque.create({
    data: { itemId, tipo, quantidade, motivo },
    include: { item: { include: { categoria: true } } },
  })

  const delta = tipo === 'ENTRADA' ? quantidade : -quantidade
  await prisma.itemCardapio.update({
    where: { id: itemId },
    data: { estoqueAtual: item.estoqueAtual + delta },
  })

  res.status(201).json(movimento)
})

export default router
