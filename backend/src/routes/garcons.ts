import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { z } from 'zod'

const router = Router()

// Lista garçons, com opção de incluir inativos
router.get('/', async (req: Request, res: Response) => {
  const where = req.query.inativos === 'true' ? {} : { ativo: true }
  const garcons = await prisma.garcom.findMany({
    where,
    orderBy: { nome: 'asc' },
  })
  res.json(garcons)
})

// Ranking de vendas por garçom (total vendido e taxa)
// ?hoje=true  filtra apenas vendas do dia atual
router.get('/vendas', async (req: Request, res: Response) => {
  const whereComanda: any = { status: 'FECHADA' }

  if (req.query.hoje === 'true') {
    const inicioDoDia = new Date()
    inicioDoDia.setHours(0, 0, 0, 0)
    whereComanda.createdAt = { gte: inicioDoDia }
  }

  const garcons = await prisma.garcom.findMany({
    where: { ativo: true },
    include: {
      comandas: {
        where: whereComanda,
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

// Lista comandas fechadas de um garçom específico
// ?hoje=true  filtra apenas vendas do dia atual
router.get('/:id/comandas', async (req: Request, res: Response) => {
  const where: any = {
    garcomId: req.params.id,
    status: 'FECHADA',
  }

  if (req.query.hoje === 'true') {
    const inicioDoDia = new Date()
    inicioDoDia.setHours(0, 0, 0, 0)
    where.createdAt = { gte: inicioDoDia }
  }

  const comandas = await prisma.comanda.findMany({
    where,
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

// Cadastra um novo garçom
router.post('/', async (req: Request, res: Response) => {
  const schema = z.object({ nome: z.string().min(1), telefone: z.string().optional() })
  const data = schema.parse(req.body)
  const garcom = await prisma.garcom.create({ data })
  res.status(201).json(garcom)
})

// Atualiza dados de um garçom
router.put('/:id', async (req: Request, res: Response) => {
  const schema = z.object({ nome: z.string().min(1).optional(), telefone: z.string().optional() })
  const data = schema.parse(req.body)
  const garcom = await prisma.garcom.update({ where: { id: req.params.id }, data })
  res.json(garcom)
})

// Desativa (soft-delete) um garçom
router.delete('/:id', async (req: Request, res: Response) => {
  await prisma.garcom.update({ where: { id: req.params.id }, data: { ativo: false } })
  res.status(204).send()
})

// Reativa um garçom desativado
router.patch('/:id/reativar', async (req: Request, res: Response) => {
  const garcom = await prisma.garcom.update({ where: { id: req.params.id }, data: { ativo: true } })
  res.json(garcom)
})

export default router
