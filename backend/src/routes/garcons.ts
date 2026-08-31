import { Router, Request, Response } from 'express'
import { Garcom, Comanda, Usuario, ItemComanda } from '../models'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { authorizeRoles } from '../middlewares/authorize'

const router = Router()

/**
 * GET /api/garcons
 * Lista todos os garçons do tenant. Por padrão retorna apenas ativos.
 * Use ?inativos=true para incluir inativos.
 */
router.get('/', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const where: Record<string, unknown> = req.query.inativos === 'true'
    ? { tenantId }
    : { ativo: true, tenantId }

  const garcons = await Garcom.find(where).sort({ nome: 1 })
  res.json(garcons)
})

/**
 * GET /api/garcons/vendas
 * Relatório de vendas por garçom. Retorna total de vendas, valor e taxa de serviço.
 * Use ?hoje=true para filtrar apenas vendas do dia atual.
 * Requer role SUPERADMIN ou CLIENTE.
 */
router.get('/vendas', authorizeRoles('SUPERADMIN', 'CLIENTE'), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const whereComanda: Record<string, unknown> = { status: 'FECHADA', tenantId }

  if (req.query.hoje === 'true') {
    const inicioDoDia = new Date()
    inicioDoDia.setHours(0, 0, 0, 0)
    whereComanda.createdAt = { $gte: inicioDoDia }
  }

  const garcons = await Garcom.find({ ativo: true, tenantId }).sort({ nome: 1 }).lean()

  const relatorio = await Promise.all(garcons.map(async (g) => {
    const comandas = await Comanda.find({ garcomId: g._id, ...whereComanda })
      .select({ total: 1, taxaServico: 1, createdAt: 1 })
      .lean()

    const vendas = comandas.length
    const totalVendido = comandas.reduce((acc, c) => acc + c.total, 0)
    const totalTaxa = comandas.reduce((acc, c) => acc + c.taxaServico, 0)
    return {
      id: g._id,
      nome: g.nome,
      vendas,
      totalVendido: Math.round(totalVendido * 100) / 100,
      totalTaxa: Math.round(totalTaxa * 100) / 100,
    }
  }))

  res.json(relatorio)
})

/**
 * GET /api/garcons/:id/comandas
 * Lista comandas fechadas de um garçom específico com seus itens.
 * Use ?hoje=true para filtrar apenas comandas do dia atual.
 */
router.get('/:id/comandas', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const where: Record<string, unknown> = {
    garcomId: req.params.id,
    status: 'FECHADA',
    tenantId,
  }

  if (req.query.hoje === 'true') {
    const inicioDoDia = new Date()
    inicioDoDia.setHours(0, 0, 0, 0)
    where.createdAt = { $gte: inicioDoDia }
  }

  const comandas = await Comanda.find(where).sort({ createdAt: -1 }).populate('mesa').lean()

  const comandasComItens = await Promise.all(comandas.map(async (c) => {
    const itens = await ItemComanda.find({ comandaId: c._id })
      .populate({ path: 'itemId', populate: { path: 'categoriaId' } })
      .lean()
    return { ...c, itens }
  }))

  res.json(comandasComItens)
})

/**
 * POST /api/garcons
 * Cria um novo garçom no tenant.
 * Requer role SUPERADMIN ou CLIENTE.
 */
router.post('/', authorizeRoles('SUPERADMIN', 'CLIENTE'), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const schema = z.object({ nome: z.string().min(1), telefone: z.string().optional() })
  const data = schema.parse(req.body)
  const garcom = await Garcom.create({ ...data, tenantId })
  res.status(201).json(garcom)
})

/**
 * PUT /api/garcons/:id
 * Atualiza os dados de um garçom do tenant (nome e telefone).
 * Requer role SUPERADMIN ou CLIENTE.
 */
router.put('/:id', authorizeRoles('SUPERADMIN', 'CLIENTE'), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const existing = await Garcom.findOne({ _id: req.params.id, tenantId })
  if (!existing) return res.status(404).json({ error: 'Garçom não encontrado' })

  const schema = z.object({ nome: z.string().min(1).optional(), telefone: z.string().optional() })
  const data = schema.parse(req.body)
  const garcom = await Garcom.findByIdAndUpdate(req.params.id, data, { new: true })
  res.json(garcom)
})

/**
 * DELETE /api/garcons/:id
 * Desativa um garçom do tenant (soft delete).
 * Requer role SUPERADMIN ou CLIENTE.
 */
router.delete('/:id', authorizeRoles('SUPERADMIN', 'CLIENTE'), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const existing = await Garcom.findOne({ _id: req.params.id, tenantId })
  if (!existing) return res.status(404).json({ error: 'Garçom não encontrado' })

  await Garcom.findByIdAndUpdate(req.params.id, { ativo: false })
  res.status(204).send()
})

/**
 * PATCH /api/garcons/:id/reativar
 * Reativa um garçom que foi desativado.
 * Requer role SUPERADMIN ou CLIENTE.
 */
router.patch('/:id/reativar', authorizeRoles('SUPERADMIN', 'CLIENTE'), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const existing = await Garcom.findOne({ _id: req.params.id, tenantId })
  if (!existing) return res.status(404).json({ error: 'Garçom não encontrado' })

  const garcom = await Garcom.findByIdAndUpdate(req.params.id, { ativo: true }, { new: true })
  res.json(garcom)
})

/**
 * POST /api/garcons/:id/criar-acesso
 * Cria uma conta de acesso (usuário) para um garçom.
 * Gera hash da senha e vincula ao garçom.
 * Requer role SUPERADMIN ou CLIENTE.
 */
router.post('/:id/criar-acesso', authorizeRoles('SUPERADMIN', 'CLIENTE'), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const garcomId = req.params.id

  const garcom = await Garcom.findOne({ _id: garcomId, tenantId })
  if (!garcom) return res.status(404).json({ error: 'Garçom não encontrado' })
  if (garcom.usuarioId) return res.status(400).json({ error: 'Este garçom já possui um acesso' })

  const schema = z.object({
    email: z.string().min(3),
    senha: z.string().min(8)
  })

  const parseResult = schema.safeParse(req.body)
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Dados inválidos', details: parseResult.error.errors })
  }

  const { senha } = parseResult.data
  const email = parseResult.data.email.toLowerCase().trim()

  const existingUser = await Usuario.findOne({ email })
  if (existingUser) return res.status(400).json({ error: 'Usuário já está em uso' })

  const senhaHash = await bcrypt.hash(senha, 12)

  const novoUsuario = await Usuario.create({
    email,
    senhaHash,
    nome: garcom.nome,
    role: 'GARCOM',
    tenantId
  })

  await Garcom.findByIdAndUpdate(garcom._id, { usuarioId: novoUsuario._id })

  res.status(201).json({ message: 'Acesso criado com sucesso', usuarioId: novoUsuario._id })
})

/**
 * POST /api/garcons/:id/vincular-usuario
 * Vincula um usuário existente a um garçom.
 * Valida que o usuário não está vinculado a outro garçom e pertence ao mesmo tenant.
 * Requer role SUPERADMIN ou CLIENTE.
 */
router.post('/:id/vincular-usuario', authorizeRoles('SUPERADMIN', 'CLIENTE'), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const garcomId = req.params.id

  const garcom = await Garcom.findOne({ _id: garcomId, tenantId })
  if (!garcom) return res.status(404).json({ error: 'Garçom não encontrado' })
  if (garcom.usuarioId) return res.status(400).json({ error: 'Este garçom já possui um acesso vinculado' })

  const schema = z.object({
    email: z.string().min(3)
  })

  const parseResult = schema.safeParse(req.body)
  if (!parseResult.success) {
    return res.status(400).json({ error: 'E-mail inválido', details: parseResult.error.errors })
  }

  const email = parseResult.data.email.toLowerCase().trim()

  const existingUser = await Usuario.findOne({ email })
  if (!existingUser) return res.status(404).json({ error: 'Usuário não encontrado com este e-mail' })

  const outroGarcom = await Garcom.findOne({ usuarioId: existingUser._id })
  if (outroGarcom) {
    return res.status(400).json({ error: 'Este usuário já está vinculado a outro garçom' })
  }

  if (existingUser.tenantId && existingUser.tenantId !== tenantId) {
    return res.status(403).json({ error: 'Este usuário pertence a outro restaurante' })
  }

  if (existingUser.role !== 'GARCOM') {
    await Usuario.findByIdAndUpdate(existingUser._id, { role: 'GARCOM', tenantId })
  }

  await Garcom.findByIdAndUpdate(garcom._id, { usuarioId: existingUser._id })

  res.json({ message: 'Usuário vinculado com sucesso ao garçom' })
})

export default router
