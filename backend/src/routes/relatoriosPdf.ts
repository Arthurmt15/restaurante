/**
 * Rota de geração de relatório de vendas em formato HTML/PDF.
 *
 * Fornece o endpoint que gera um documento HTML completo com tabela
 * de comandas e resumo de totais, pronto para exportação ou impressão.
 */
import { Router, Request, Response } from 'express'
import { Comanda } from '../models'

const router = Router()

/**
 * GET /api/relatorios/vendas/pdf
 * Gera relatório de vendas em formato HTML para exportação/PDF.
 * Retorna HTML pronto com tabela de comandas e resumo de totais.
 */
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
