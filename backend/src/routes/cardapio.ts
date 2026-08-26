import { Router, Request, Response } from 'express'
import { Categoria, ItemCardapio } from '../models'
import { z } from 'zod'
import { authorizeRoles } from '../middlewares/authorize'

const router = Router()

// Lista todas as categorias do tenant com seus itens ativos
router.get('/', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const categorias = await Categoria.find({ tenantId }).sort({ nome: 1 }).lean()
  for (const cat of categorias) {
    ;(cat as any).itens = await ItemCardapio.find({ categoriaId: cat._id, ativo: true, tenantId }).sort({ nome: 1 }).lean()
  }
  res.json(categorias)
})

// Cria uma nova categoria no tenant
router.post('/categoria', authorizeRoles('SUPERADMIN', 'CLIENTE'), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const schema = z.object({ nome: z.string().min(1) })
  const { nome } = schema.parse(req.body)

  const existente = await Categoria.findOne({ nome, tenantId })
  if (existente) return res.status(409).json({ error: `Categoria "${nome}" já existe neste ambiente` })

  try {
    const categoria = await Categoria.create({ nome, tenantId })
    res.status(201).json(categoria)
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(409).json({ error: `Categoria "${nome}" já existe neste ambiente` })
    }
    throw err
  }
})

// Busca um item do cardápio pelo ID (verifica que pertence ao tenant)
router.get('/:id', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const item = await ItemCardapio.findOne({ _id: req.params.id, tenantId }).populate('categoria').lean()
  if (!item) return res.status(404).json({ error: 'Item não encontrado' })
  res.json(item)
})

// Cria um novo item no cardápio do tenant
router.post('/', authorizeRoles('SUPERADMIN', 'CLIENTE'), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const schema = z.object({
    nome: z.string().min(1),
    nomeEn: z.string().optional(),
    descricao: z.string().optional(),
    preco: z.number().positive(),
    porcaoTamanho: z.string().optional(),
    observacao: z.string().optional(),
    categoriaId: z.string(),
    controlaEstoque: z.boolean().optional(),
    estoqueAtual: z.number().int().min(0).optional(),
    estoqueMinimo: z.number().int().min(0).optional(),
  })
  const data = schema.parse(req.body)

  // Garantir que a categoria pertence ao mesmo tenant
  const categoria = await Categoria.findOne({ _id: data.categoriaId, tenantId })
  if (!categoria) return res.status(400).json({ error: 'Categoria não encontrada neste ambiente' })

  const item = await ItemCardapio.create({ ...data, tenantId })
  res.status(201).json(item)
})

// Atualiza parcialmente um item do cardápio do tenant
router.put('/:id', authorizeRoles('SUPERADMIN', 'CLIENTE'), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const existing = await ItemCardapio.findOne({ _id: req.params.id, tenantId })
  if (!existing) return res.status(404).json({ error: 'Item não encontrado' })

  const schema = z.object({
    nome: z.string().min(1).optional(),
    nomeEn: z.string().optional(),
    descricao: z.string().optional(),
    preco: z.number().positive().optional(),
    porcaoTamanho: z.string().optional(),
    observacao: z.string().optional(),
    ativo: z.boolean().optional(),
    controlaEstoque: z.boolean().optional(),
    categoriaId: z.string().optional(),
  })
  const data = schema.parse(req.body)

  // Se estiver mudando a categoria, verificar que ela pertence ao tenant
  if (data.categoriaId) {
    const categoria = await Categoria.findOne({ _id: data.categoriaId, tenantId })
    if (!categoria) return res.status(400).json({ error: 'Categoria não encontrada neste ambiente' })
  }

  const item = await ItemCardapio.findByIdAndUpdate(req.params.id, data, { new: true })
  res.json(item)
})

// Remove (desativa) um item do cardápio do tenant
router.delete('/:id', authorizeRoles('SUPERADMIN', 'CLIENTE'), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const existing = await ItemCardapio.findOne({ _id: req.params.id, tenantId })
  if (!existing) return res.status(404).json({ error: 'Item não encontrado' })

  await ItemCardapio.findByIdAndUpdate(req.params.id, { ativo: false })
  res.status(204).send()
})

export default router
