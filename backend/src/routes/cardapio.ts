import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { z } from 'zod'

const router = Router()

// Lista todas as categorias com seus itens ativos
router.get('/', async (_req: Request, res: Response) => {
  const categorias = await prisma.categoria.findMany({
    include: { itens: { where: { ativo: true }, orderBy: { nome: 'asc' } } },
    orderBy: { nome: 'asc' },
  })
  res.json(categorias)
})

// Busca um item do cardápio pelo ID
router.get('/:id', async (req: Request, res: Response) => {
  const item = await prisma.itemCardapio.findUnique({
    where: { id: req.params.id },
    include: { categoria: true },
  })
  if (!item) return res.status(404).json({ error: 'Item não encontrado' })
  res.json(item)
})

// Cria um novo item no cardápio
router.post('/', async (req: Request, res: Response) => {
  const schema = z.object({
    nome: z.string().min(1),
    descricao: z.string().optional(),
    preco: z.number().positive(),
    categoriaId: z.string().uuid(),
  })
  const data = schema.parse(req.body)
  const item = await prisma.itemCardapio.create({ data })
  res.status(201).json(item)
})

// Atualiza parcialmente um item do cardápio
router.put('/:id', async (req: Request, res: Response) => {
  const schema = z.object({
    nome: z.string().min(1).optional(),
    descricao: z.string().optional(),
    preco: z.number().positive().optional(),
    ativo: z.boolean().optional(),
    categoriaId: z.string().uuid().optional(),
  })
  const data = schema.parse(req.body)
  const item = await prisma.itemCardapio.update({
    where: { id: req.params.id },
    data,
  })
  res.json(item)
})

// Remove (desativa) um item do cardápio
router.delete('/:id', async (req: Request, res: Response) => {
  await prisma.itemCardapio.update({
    where: { id: req.params.id },
    data: { ativo: false },
  })
  res.status(204).send()
})

export default router
