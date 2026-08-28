import { Router, Request, Response } from 'express'
import { Comanda, Garcom, ItemComanda, ItemCardapio } from '../models'

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
    createdAt: { $gte: startDate },
  }
  if (endDate) (where.createdAt as Record<string, unknown>).$lt = endDate

  const comandas = await Comanda.find(where)
    .populate('mesa')
    .populate('garcom')
    .sort({ createdAt: -1 })

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
  const garcons = await Garcom.find({ ativo: true, tenantId }).sort({ nome: 1 })

  const comparativo = []

  for (const g of garcons) {
    const comandas = await Comanda.find({
      status: 'FECHADA',
      tenantId,
      garcom: g._id,
    }).select('total taxaServico subtotal createdAt').lean()

    const porMes: Record<string, { vendas: number; total: number; taxa: number }> = {}

    for (const c of comandas) {
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

    comparativo.push({
      id: g._id,
      nome: g.nome,
      totalVendido: Math.round(totalVendido * 100) / 100,
      totalVendas,
      meses,
    })
  }

  res.json(comparativo)
})

// Comparativo mensal de vendas totais por mês em um ano — filtrado pelo tenant
router.get('/comparativo-mensal', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const ano = parseInt((req.query.ano as string) || String(new Date().getFullYear()))

  const comandas = await Comanda.find({
    status: 'FECHADA',
    tenantId,
    createdAt: {
      $gte: new Date(ano, 0, 1),
      $lt: new Date(ano + 1, 0, 1),
    },
  }).select('total taxaServico subtotal createdAt').lean()

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

// Produtos mais/menos vendidos — filtrado pelo tenant
router.get('/produtos-mais-vendidos', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const { periodo, mes, ano, limite: limiteStr } = req.query
  const limite = Math.max(1, parseInt(String(limiteStr)) || 10)
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

  const comandaWhere: Record<string, unknown> = {
    status: 'FECHADA',
    tenantId,
    createdAt: { $gte: startDate },
  }
  if (endDate) (comandaWhere.createdAt as Record<string, unknown>).$lt = endDate

  const comandasFechadas = await Comanda.find(comandaWhere).select('_id').lean()
  const comandaIds = comandasFechadas.map((c) => c._id)

  const itensVendidos = await ItemComanda.aggregate([
    { $match: { comandaId: { $in: comandaIds } } },
    {
      $group: {
        _id: '$itemId',
        totalQuantidade: { $sum: '$quantidade' },
        totalReceita: { $sum: '$precoUnit' },
      },
    },
    { $sort: { totalQuantidade: -1 } },
  ])

  const itemIds = itensVendidos.map((i) => i._id)
  const itensCardapio = await ItemCardapio.find({ _id: { $in: itemIds }, tenantId })
    .select('nome preco')
    .lean()
  const itensMap = new Map(itensCardapio.map((i) => [String(i._id), i]))

  const resultado = itensVendidos
    .map((i) => {
      const item = itensMap.get(String(i._id))
      return {
        itemId: i._id,
        nome: item?.nome ?? 'Item removido',
        totalQuantidade: i.totalQuantidade,
        totalReceita: Math.round(i.totalReceita * 100) / 100,
      }
    })
    .filter((i) => i.nome !== 'Item removido')

  const maisVendidos = resultado.slice(0, limite)
  const menosVendidos = [...resultado].reverse().slice(0, limite)

  res.json({ maisVendidos, menosVendidos })
})

// Exportação HTML de vendas (para geração de PDF no cliente)
router.get('/vendas/pdf', async (req: Request, res: Response) => {
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
    createdAt: { $gte: startDate },
  }
  if (endDate) (where.createdAt as Record<string, unknown>).$lt = endDate

  const comandas = await Comanda.find(where)
    .populate('mesaId')
    .populate('garcomId')
    .sort({ createdAt: -1 })

  const totalVendas = comandas.reduce((acc, c) => acc + c.total, 0)
  const totalTaxa = comandas.reduce((acc, c) => acc + c.taxaServico, 0)
  const totalSubtotal = comandas.reduce((acc, c) => acc + c.subtotal, 0)
  const totalComandas = comandas.length
  const periodoLabel = periodo ? String(periodo).charAt(0).toUpperCase() + String(periodo).slice(1) : 'Diário'
  const dataFmt = now.toLocaleDateString('pt-BR')

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório de Vendas - ${periodoLabel}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
    h1 { text-align: center; margin-bottom: 4px; }
    .subtitle { text-align: center; color: #666; margin-bottom: 20px; }
    .summary { display: flex; justify-content: space-around; margin-bottom: 24px; }
    .summary-box { text-align: center; padding: 12px 20px; background: #f5f5f5; border-radius: 8px; }
    .summary-box .value { font-size: 22px; font-weight: bold; }
    .summary-box .label { font-size: 12px; color: #666; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f0f0f0; }
    tr:nth-child(even) { background: #fafafa; }
  </style>
</head>
<body>
  <h1>Relatório de Vendas</h1>
  <p class="subtitle">Período: ${periodoLabel} | Gerado em: ${dataFmt}</p>
  <div class="summary">
    <div class="summary-box">
      <div class="value">${totalComandas}</div>
      <div class="label">Comandas</div>
    </div>
    <div class="summary-box">
      <div class="value">R$ ${totalSubtotal.toFixed(2)}</div>
      <div class="label">Subtotal</div>
    </div>
    <div class="summary-box">
      <div class="value">R$ ${totalTaxa.toFixed(2)}</div>
      <div class="label">Taxa de Serviço</div>
    </div>
    <div class="summary-box">
      <div class="value">R$ ${totalVendas.toFixed(2)}</div>
      <div class="label">Total</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Mesa</th>
        <th>Garçom</th>
        <th>Subtotal</th>
        <th>Taxa</th>
        <th>Total</th>
        <th>Data</th>
      </tr>
    </thead>
    <tbody>
      ${comandas.map((c) => {
        const mesa = (c as any).mesaId?.numero ?? '-'
        const garcom = (c as any).garcomId?.nome ?? '-'
        const data = c.createdAt.toLocaleDateString('pt-BR')
        return `<tr>
          <td>${mesa}</td>
          <td>${garcom}</td>
          <td>R$ ${c.subtotal.toFixed(2)}</td>
          <td>R$ ${c.taxaServico.toFixed(2)}</td>
          <td>R$ ${c.total.toFixed(2)}</td>
          <td>${data}</td>
        </tr>`
      }).join('\n      ')}
    </tbody>
  </table>
</body>
</html>`

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(html)
})

export default router
