import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { z } from 'zod'

const router = Router()

// Lista todos os itens ativos do tenant com informações de estoque
router.get('/', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const itens = await prisma.itemCardapio.findMany({
    where: { ativo: true, tenantId },
    include: { categoria: true },
    orderBy: { categoria: { nome: 'asc' } },
  })
  res.json(itens)
})

// Lista os últimos 100 movimentos de estoque do tenant, com filtro opcional por item
router.get('/movimentos', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const { itemId } = req.query
  const where = itemId
    ? { itemId: String(itemId), tenantId }
    : { tenantId }

  const movimentos = await prisma.movimentoEstoque.findMany({
    where,
    include: { item: { include: { categoria: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  res.json(movimentos)
})

// Lista itens com estoque atual abaixo ou igual ao mínimo (do tenant)
router.get('/baixo', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const itens = await prisma.itemCardapio.findMany({
    where: {
      ativo: true,
      tenantId,
      estoqueAtual: { lte: prisma.itemCardapio.fields.estoqueMinimo },
    },
    include: { categoria: true },
    orderBy: { categoria: { nome: 'asc' } },
  })
  res.json(itens)
})

// Atualiza estoqueAtual e/ou estoqueMinimo de um item do tenant
router.put('/:id', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const existing = await prisma.itemCardapio.findFirst({ where: { id: req.params.id, tenantId } })
  if (!existing) return res.status(404).json({ error: 'Item não encontrado' })

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

// Registra um movimento de entrada ou saída e ajusta o estoque (do tenant)
router.post('/movimento', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const schema = z.object({
    itemId: z.string().uuid(),
    tipo: z.enum(['ENTRADA', 'SAIDA']),
    quantidade: z.number().int().positive(),
    motivo: z.string().optional(),
  })
  const { itemId, tipo, quantidade, motivo } = schema.parse(req.body)

  const item = await prisma.itemCardapio.findFirst({ where: { id: itemId, tenantId } })
  if (!item) return res.status(404).json({ error: 'Item não encontrado neste ambiente' })

  const movimento = await prisma.movimentoEstoque.create({
    data: { itemId, tipo, quantidade, motivo, tenantId },
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
