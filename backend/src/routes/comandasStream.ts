/**
 * Rotas de listagem de comandas e fluxo SSE (Server-Sent Events).
 *
 * Fornece o endpoint de streaming em tempo real para notificações
 * de comandas e o endpoint de listagem com paginação e filtro por status.
 */
import { Router, Request, Response } from 'express'
import { authorizeRoles } from '../middlewares/authorize'
import { addSSEClient } from '../lib/sse'
import {
  Comanda,
  ItemComanda,
  Pagamento,
} from '../models'

const router = Router()

/**
 * GET /api/comandas
 * Lista todas as comandas do tenant com paginação e filtro opcional por status.
 */
router.get('/', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const { status, pagina = '1', limite = '50' } = req.query

  const page = Math.max(1, parseInt(String(pagina)))
  const pageSize = Math.min(200, Math.max(1, parseInt(String(limite))))
  const skip = (page - 1) * pageSize

  const where = status ? { status: String(status), tenantId } : { tenantId }

  const [comandas, total] = await Promise.all([
    Comanda.find(where)
      .skip(skip)
      .limit(pageSize)
      .populate('mesa')
      .populate('garcom')
      .sort({ createdAt: -1 }),
    Comanda.countDocuments(where),
  ])

  const comandasComItens = await (async () => {
    const comandaIds = comandas.map((c) => c._id)
    const [allItens, allPagamentos] = await Promise.all([
      ItemComanda.find({ comandaId: { $in: comandaIds } })
        .populate({ path: 'itemId', populate: { path: 'categoriaId' } }),
      Pagamento.find({ comandaId: { $in: comandaIds } }),
    ])

    const itensPorComanda = new Map<string, any[]>()
    for (const item of allItens) {
      const key = String(item.comandaId)
      if (!itensPorComanda.has(key)) itensPorComanda.set(key, [])
      itensPorComanda.get(key)!.push(item)
    }
    const pagamentosPorComanda = new Map<string, any[]>()
    for (const p of allPagamentos) {
      const key = String(p.comandaId)
      if (!pagamentosPorComanda.has(key)) pagamentosPorComanda.set(key, [])
      pagamentosPorComanda.get(key)!.push(p)
    }

    return comandas.map((c) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const obj: any = c.toObject()
      // @ts-ignore - itens/pagamentos são adicionados dinamicamente
      obj.itens = itensPorComanda.get(String(c._id)) || []
      // @ts-ignore - itens/pagamentos são adicionados dinamicamente
      obj.pagamentos = pagamentosPorComanda.get(String(c._id)) || []
      return obj
    })
  })()

  res.json({
    comandas: comandasComItens,
    paginacao: {
      total,
      pagina: page,
      limite: pageSize,
      totalPaginas: Math.ceil(total / pageSize),
    },
  })
})

/**
 * GET /api/comandas/stream
 * Endpoint Server-Sent Events (SSE) para receber notificações em tempo real.
 * Valida TTL do token via query param ?t= para evitar conexões com tokens antigos.
 * Requer role SUPERADMIN ou CLIENTE.
 */
router.get('/stream', authorizeRoles('SUPERADMIN', 'CLIENTE'), (req: Request, res: Response) => {
  const timestamp = Number(req.query.t)
  if (timestamp) {
    const TTL_MS = 5 * 60 * 1000 // 5 minutos
    if (Date.now() - timestamp > TTL_MS) {
      return res.status(401).json({ error: 'Conexão SSE expirada. Recarregue a página.' })
    }
  }
  const tenantId = req.user!.tenantId
  addSSEClient(tenantId, res, req.headers.origin)
})

export default router
