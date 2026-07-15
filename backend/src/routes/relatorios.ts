import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'

const router = Router()

// Relatório de vendas por período (diário, semanal, mensal)
router.get('/vendas', async (req: Request, res: Response) => {
  const { periodo } = req.query
  const now = new Date()
  let startDate: Date

  switch (periodo) {
    case 'diario':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      break
    case 'semanal': {
      const day = now.getDay()
      startDate = new Date(now)
      startDate.setDate(now.getDate() - day)
      startDate.setHours(0, 0, 0, 0)
      break
    }
    case 'mensal':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }

  const comandas = await prisma.comanda.findMany({
    where: {
      status: 'FECHADA',
      createdAt: { gte: startDate },
    },
    include: {
      mesa: true,
      garcom: true,
      itens: {
        include: { item: { include: { categoria: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const totalVendas = comandas.reduce((acc, c) => acc + c.total, 0)
  const totalTaxa = comandas.reduce((acc, c) => acc + c.taxaServico, 0)
  const totalSubtotal = comandas.reduce((acc, c) => acc + c.subtotal, 0)
  const totalComandas = comandas.length

  res.json({
    periodo,
    totalComandas,
    totalSubtotal: Math.round(totalSubtotal * 100) / 100,
    totalTaxa: Math.round(totalTaxa * 100) / 100,
    totalVendas: Math.round(totalVendas * 100) / 100,
    mediaPorComanda: totalComandas > 0
      ? Math.round((totalVendas / totalComandas) * 100) / 100
      : 0,
    comandas,
  })
})

// Comparativo mensal de vendas por garçom
router.get('/garcons/comparativo', async (_req: Request, res: Response) => {
  const garcons = await prisma.garcom.findMany({
    include: {
      comandas: {
        where: { status: 'FECHADA' },
        select: { total: true, taxaServico: true, subtotal: true, createdAt: true },
      },
    },
    orderBy: { nome: 'asc' },
  })

  const comparativo = garcons.map((g) => {
    const porMes: Record<string, { vendas: number; total: number; taxa: number }> = {}

    for (const c of g.comandas) {
      const chave = `${c.createdAt.getFullYear()}-${String(c.createdAt.getMonth() + 1).padStart(2, '0')}`
      if (!porMes[chave]) porMes[chave] = { vendas: 0, total: 0, taxa: 0 }
      porMes[chave].vendas += 1
      porMes[chave].total += c.total
      porMes[chave].taxa += c.taxaServico
    }

    const meses = Object.entries(porMes)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, dados]) => ({
        mes,
        vendas: dados.vendas,
        total: Math.round(dados.total * 100) / 100,
        taxa: Math.round(dados.taxa * 100) / 100,
      }))

    const totalVendido = meses.reduce((acc, m) => acc + m.total, 0)
    const totalVendas = meses.reduce((acc, m) => acc + m.vendas, 0)

    return {
      id: g.id,
      nome: g.nome,
      totalVendido: Math.round(totalVendido * 100) / 100,
      totalVendas,
      meses,
    }
  })

  res.json(comparativo)
})

export default router
