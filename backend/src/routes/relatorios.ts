import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'

const router = Router()

// Relatório de vendas por período — filtrado pelo tenant
router.get('/vendas', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const { periodo, mes, ano } = req.query
  const now = new Date()
  let startDate: Date
  let endDate: Date | undefined

  if (mes && ano) {
    const m = parseInt(mes as string)
    const a = parseInt(ano as string)
    startDate = new Date(a, m - 1, 1)
    endDate = new Date(a, m, 1)
  } else {
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
  }

  const where: Record<string, unknown> = {
    status: 'FECHADA',
    tenantId,
    createdAt: { gte: startDate },
  }
  if (endDate) (where.createdAt as Record<string, unknown>).lt = endDate

  const comandas = await prisma.comanda.findMany({
    where: where as Parameters<typeof prisma.comanda.findMany>[0]['where'],
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

// Comparativo mensal de vendas por garçom — filtrado pelo tenant
router.get('/garcons/comparativo', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const garcons = await prisma.garcom.findMany({
    where: { ativo: true, tenantId },
    include: {
      comandas: {
        where: { status: 'FECHADA', tenantId },
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

// Comparativo mensal de vendas totais por mês em um ano — filtrado pelo tenant
router.get('/comparativo-mensal', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const ano = parseInt((req.query.ano as string) || String(new Date().getFullYear()))

  const comandas = await prisma.comanda.findMany({
    where: {
      status: 'FECHADA',
      tenantId,
      createdAt: {
        gte: new Date(ano, 0, 1),
        lt: new Date(ano + 1, 0, 1),
      },
    },
    select: { total: true, taxaServico: true, subtotal: true, createdAt: true },
  })

  const porMes: Record<string, { comandas: number; subtotal: number; taxa: number; total: number }> = {}
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

  for (const c of comandas) {
    const mes = c.createdAt.getMonth()
    const chave = `${ano}-${String(mes + 1).padStart(2, '0')}`
    if (!porMes[chave]) porMes[chave] = { comandas: 0, subtotal: 0, taxa: 0, total: 0 }
    porMes[chave].comandas += 1
    porMes[chave].subtotal += c.subtotal
    porMes[chave].taxa += c.taxaServico
    porMes[chave].total += c.total
  }

  const dados = Object.entries(porMes)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([chave, d]) => ({
      mes: chave,
      nomeMes: meses[parseInt(chave.split('-')[1]) - 1],
      ...d,
      subtotal: Math.round(d.subtotal * 100) / 100,
      taxa: Math.round(d.taxa * 100) / 100,
      total: Math.round(d.total * 100) / 100,
    }))

  const totalAnual = dados.reduce((acc, d) => ({
    comandas: acc.comandas + d.comandas,
    subtotal: acc.subtotal + d.subtotal,
    taxa: acc.taxa + d.taxa,
    total: acc.total + d.total,
  }), { comandas: 0, subtotal: 0, taxa: 0, total: 0 })

  res.json({ ano, dados, totalAnual })
})

export default router
