import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { z } from 'zod'

const router = Router()

// Lista garçons do tenant, com opção de incluir inativos
router.get('/', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const where = req.query.inativos === 'true'
    ? { tenantId }
    : { ativo: true, tenantId }

  const garcons = await prisma.garcom.findMany({
    where,
    orderBy: { nome: 'asc' },
  })
  res.json(garcons)
})

// Ranking de vendas por garçom (total vendido e taxa) — filtrado por tenant
router.get('/vendas', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const whereComanda: Record<string, unknown> = { status: 'FECHADA', tenantId }

  if (req.query.hoje === 'true') {
    const inicioDoDia = new Date()
    inicioDoDia.setHours(0, 0, 0, 0)
    whereComanda.createdAt = { gte: inicioDoDia }
  }

  const garcons = await prisma.garcom.findMany({
    where: { ativo: true, tenantId },
    include: {
      comandas: {
        where: whereComanda as Parameters<typeof prisma.comanda.findMany>[0]['where'],
        select: { total: true, taxaServico: true, createdAt: true },
      },
    },
  })

  const relatorio = garcons.map((g) => {
    const vendas = g.comandas.length
    const totalVendido = g.comandas.reduce((acc, c) => acc + c.total, 0)
    const totalTaxa = g.comandas.reduce((acc, c) => acc + c.taxaServico, 0)
    return {
      id: g.id,
      nome: g.nome,
      vendas,
      totalVendido: Math.round(totalVendido * 100) / 100,
      totalTaxa: Math.round(totalTaxa * 100) / 100,
    }
  })

  res.json(relatorio)
})

// Lista comandas fechadas de um garçom específico — filtrado por tenant
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
    where.createdAt = { gte: inicioDoDia }
  }

  const comandas = await prisma.comanda.findMany({
    where: where as Parameters<typeof prisma.comanda.findMany>[0]['where'],
    include: {
      mesa: true,
      itens: {
        include: { item: { include: { categoria: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
  res.json(comandas)
})

// Cadastra um novo garçom no tenant
router.post('/', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const schema = z.object({ nome: z.string().min(1), telefone: z.string().optional() })
  const data = schema.parse(req.body)
  const garcom = await prisma.garcom.create({ data: { ...data, tenantId } })
  res.status(201).json(garcom)
})

// Atualiza dados de um garçom (verifica que pertence ao tenant)
router.put('/:id', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const existing = await prisma.garcom.findFirst({ where: { id: req.params.id, tenantId } })
  if (!existing) return res.status(404).json({ error: 'Garçom não encontrado' })

  const schema = z.object({ nome: z.string().min(1).optional(), telefone: z.string().optional() })
  const data = schema.parse(req.body)
  const garcom = await prisma.garcom.update({ where: { id: req.params.id }, data })
  res.json(garcom)
})

// Desativa (soft-delete) um garçom do tenant
router.delete('/:id', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const existing = await prisma.garcom.findFirst({ where: { id: req.params.id, tenantId } })
  if (!existing) return res.status(404).json({ error: 'Garçom não encontrado' })

  await prisma.garcom.update({ where: { id: req.params.id }, data: { ativo: false } })
  res.status(204).send()
})

// Reativa um garçom desativado do tenant
router.patch('/:id/reativar', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const existing = await prisma.garcom.findFirst({ where: { id: req.params.id, tenantId } })
  if (!existing) return res.status(404).json({ error: 'Garçom não encontrado' })

  const garcom = await prisma.garcom.update({ where: { id: req.params.id }, data: { ativo: true } })
  res.json(garcom)
})

export default router
