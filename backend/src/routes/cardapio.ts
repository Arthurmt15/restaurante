import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { z } from 'zod'

const router = Router()

// Lista todas as categorias do tenant com seus itens ativos
router.get('/', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const categorias = await prisma.categoria.findMany({
    where: { tenantId },
    include: {
      itens: {
        where: { ativo: true, tenantId },
        orderBy: { nome: 'asc' },
      },
    },
    orderBy: { nome: 'asc' },
  })
  res.json(categorias)
})

// Cria uma nova categoria no tenant
router.post('/categoria', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const schema = z.object({ nome: z.string().min(1) })
  const { nome } = schema.parse(req.body)

  const existente = await prisma.categoria.findUnique({ where: { nome_tenantId: { nome, tenantId } } })
  if (existente) return res.status(409).json({ error: `Categoria "${nome}" já existe neste ambiente` })

  const categoria = await prisma.categoria.create({ data: { nome, tenantId } })
  res.status(201).json(categoria)
})

// Busca um item do cardápio pelo ID (verifica que pertence ao tenant)
router.get('/:id', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const item = await prisma.itemCardapio.findFirst({
    where: { id: req.params.id, tenantId },
    include: { categoria: true },
  })
  if (!item) return res.status(404).json({ error: 'Item não encontrado' })
  res.json(item)
})

// Cria um novo item no cardápio do tenant
router.post('/', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const schema = z.object({
    nome: z.string().min(1),
    nomeEn: z.string().optional(),
    descricao: z.string().optional(),
    preco: z.number().positive(),
    porcaoTamanho: z.string().optional(),
    observacao: z.string().optional(),
    categoriaId: z.string().uuid(),
    estoqueAtual: z.number().int().min(0).optional(),
    estoqueMinimo: z.number().int().min(0).optional(),
  })
  const data = schema.parse(req.body)

  // Garantir que a categoria pertence ao mesmo tenant
  const categoria = await prisma.categoria.findFirst({
    where: { id: data.categoriaId, tenantId },
  })
  if (!categoria) return res.status(400).json({ error: 'Categoria não encontrada neste ambiente' })

  const item = await prisma.itemCardapio.create({ data: { ...data, tenantId } })
  res.status(201).json(item)
})

// Atualiza parcialmente um item do cardápio do tenant
router.put('/:id', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const existing = await prisma.itemCardapio.findFirst({ where: { id: req.params.id, tenantId } })
  if (!existing) return res.status(404).json({ error: 'Item não encontrado' })

  const schema = z.object({
    nome: z.string().min(1).optional(),
    nomeEn: z.string().optional(),
    descricao: z.string().optional(),
    preco: z.number().positive().optional(),
    porcaoTamanho: z.string().optional(),
    observacao: z.string().optional(),
    ativo: z.boolean().optional(),
    categoriaId: z.string().uuid().optional(),
  })
  const data = schema.parse(req.body)

  // Se estiver mudando a categoria, verificar que ela pertence ao tenant
  if (data.categoriaId) {
    const categoria = await prisma.categoria.findFirst({ where: { id: data.categoriaId, tenantId } })
    if (!categoria) return res.status(400).json({ error: 'Categoria não encontrada neste ambiente' })
  }

  const item = await prisma.itemCardapio.update({ where: { id: req.params.id }, data })
  res.json(item)
})

// Remove (desativa) um item do cardápio do tenant
router.delete('/:id', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const existing = await prisma.itemCardapio.findFirst({ where: { id: req.params.id, tenantId } })
  if (!existing) return res.status(404).json({ error: 'Item não encontrado' })

  await prisma.itemCardapio.update({ where: { id: req.params.id }, data: { ativo: false } })
  res.status(204).send()
})

export default router
