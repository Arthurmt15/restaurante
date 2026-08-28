import { Router, Request, Response } from 'express'
import mongoose from 'mongoose'
import { z } from 'zod'
import { authorizeRoles } from '../middlewares/authorize'
import { addSSEClient, broadcastToTenant } from '../lib/sse'
import { logAtividadeGarcom } from '../lib/logger'
import {
  Comanda,
  Mesa,
  Garcom,
  ItemCardapio,
  ItemComanda,
  Pagamento,
  Configuracoes,
} from '../models'
import {
  HttpError,
  abrirComanda,
  adicionarItem,
  fecharComanda,
  removerItem,
  reabrirComanda,
  compararCodigoExclusao,
} from '../services/comanda.service'

const router = Router()

function responderErro(res: Response, err: unknown): void {
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({ error: err.message })
    return
  }
  throw err
}

async function buscarComandaCompleta(comandaId: string, tenantId: string) {
  const comanda = await Comanda.findOne({ _id: comandaId, tenantId })
    .populate('mesaId')
    .populate('garcomId')
  if (!comanda) return null

  const itens = await ItemComanda.find({ comandaId: comanda._id })
    .populate({ path: 'itemId', populate: { path: 'categoriaId' } })
  const pagamentos = await Pagamento.find({ comandaId: comanda._id })

  return { comanda, itens, pagamentos }
}

// Lista todas as comandas do tenant, com filtro opcional por status e paginação
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
      .populate('mesaId')
      .populate('garcomId')
      .sort({ createdAt: -1 }),
    Comanda.countDocuments(where),
  ])

  const comandasComItens = await Promise.all(
    comandas.map(async (c) => {
      const itens = await ItemComanda.find({ comandaId: c._id })
        .populate({ path: 'itemId', populate: { path: 'categoriaId' } })
      const pagamentos = await Pagamento.find({ comandaId: c._id })
      return { ...c.toObject(), itens, pagamentos }
    })
  )

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

// Endpoint para SSE: Clientes e Admins se conectam aqui para receber notificações
// Valida TTL do token via query param ?t= (timestamp em ms) para evitar
// conexões com tokens muito antigos. TTL máximo: 5 minutos.
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

// Busca uma comanda pelo ID (verifica que pertence ao tenant)
router.get('/:id', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const result = await buscarComandaCompleta(req.params.id, tenantId)
  if (!result) return res.status(404).json({ error: 'Comanda não encontrada' })
  res.json({ ...result.comanda.toObject(), itens: result.itens, pagamentos: result.pagamentos })
})

// Abre uma nova comanda para uma mesa do tenant
router.post('/', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const schema = z.object({
    mesaId: z.string(),
    garcomId: z.string().optional(),
  })
  let { mesaId, garcomId } = schema.parse(req.body)

  if (req.user!.role === 'GARCOM') {
    garcomId = req.user!.garcomId
  }

  const mesa = await Mesa.findOne({ _id: mesaId, tenantId })
  if (!mesa) return res.status(404).json({ error: 'Mesa não encontrada neste ambiente' })

  const aberta = await Comanda.findOne({
    mesaId,
    status: 'ABERTA',
    tenantId,
  })
  if (aberta) return res.status(400).json({ error: 'Mesa já possui comanda aberta' })

  if (garcomId) {
    const garcom = await Garcom.findOne({ _id: garcomId, tenantId })
    if (!garcom) return res.status(404).json({ error: 'Garçom não encontrado neste ambiente' })
  }

  let comanda: any
  const session = await mongoose.startSession()
  try {
    await session.withTransaction(async () => {
      comanda = await abrirComanda(session, {
        mesaId,
        garcomId: garcomId ?? null,
        tenantId,
      })
    })
  } finally {
    session.endSession()
  }

  if (comanda.garcomId) {
    const garcomDoc = typeof comanda.garcomId === 'object' ? comanda.garcomId : await Garcom.findById(comanda.garcomId)
    const mesaDoc = typeof comanda.mesaId === 'object' ? comanda.mesaId : await Mesa.findById(comanda.mesaId)
    if (garcomDoc) {
      await logAtividadeGarcom({
        garcomId: (garcomDoc as any)._id.toString(),
        garcomNome: (garcomDoc as any).nome,
        acao: 'ABRIU_MESA',
        detalhes: 'Abriu a mesa',
        mesaNumero: mesaDoc ? (mesaDoc as any).numero : 0,
        tenantId,
      })
    }
  }

  res.status(201).json(comanda)
})

// Adiciona um item à comanda do tenant, baixa estoque e registra movimentação
router.post('/:id/itens', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const schema = z.object({
    itemId: z.string(),
    quantidade: z.number().int().positive().default(1),
    observacao: z.string().optional(),
    acrescimo: z.number().min(0).default(0),
    desconto: z.number().min(0).default(0),
  })
  const { itemId, quantidade, observacao, acrescimo, desconto } = schema.parse(req.body)

  const comanda = await Comanda.findOne({ _id: req.params.id, tenantId })
  if (!comanda) return res.status(404).json({ error: 'Comanda não encontrada' })
  if (comanda.status !== 'ABERTA') return res.status(400).json({ error: 'Comanda não está aberta' })

  if (req.user!.role === 'GARCOM' && comanda.garcomId?.toString() !== req.user!.garcomId) {
    return res.status(403).json({ error: 'Você só pode adicionar pedidos nas suas próprias comandas' })
  }

  const item = await ItemCardapio.findOne({ _id: itemId, tenantId })
    .populate('categoriaId')
  if (!item) return res.status(404).json({ error: 'Item não encontrado neste ambiente' })

  try {
    const session = await mongoose.startSession()
    try {
      await session.withTransaction(async () => {
        await adicionarItem(session, {
          comandaId: req.params.id,
          itemId,
          quantidade,
          observacao,
          acrescimo,
          desconto,
          tenantId,
        })
      })
    } finally {
      session.endSession()
    }
  } catch (err) {
    return responderErro(res, err)
  }

  const result = await buscarComandaCompleta(req.params.id, tenantId)

  if (result) {
    const mesaNome = (result.comanda as any).mesaId?.numero
      ? `Mesa ${(result.comanda as any).mesaId.numero}`
      : 'Comanda Balcão'
    const garcomNome = (result.comanda as any).garcomId?.nome || 'Sistema'
    broadcastToTenant(tenantId, 'novo_pedido', {
      comandaId: result.comanda._id,
      mesa: mesaNome,
      garcom: garcomNome,
      item: item.nome,
      quantidade,
    })

    if ((result.comanda as any).garcomId) {
      await logAtividadeGarcom({
        garcomId: (result.comanda as any).garcomId._id,
        garcomNome: (result.comanda as any).garcomId.nome,
        acao: 'ADICIONOU_ITEM',
        detalhes: `Adicionou ${quantidade}x ${item.nome}`,
        mesaNumero: (result.comanda as any).mesaId!.numero,
        tenantId,
      })
    }
  }

  res.status(201).json(result ? { ...result.comanda.toObject(), itens: result.itens, pagamentos: result.pagamentos } : null)
})

// Fecha uma comanda do tenant com um ou mais métodos de pagamento
router.patch('/:id/fechar', authorizeRoles('SUPERADMIN', 'CLIENTE', 'GARCOM'), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const schema = z.object({
    pagamentos: z.array(z.object({
      forma: z.string().min(1),
      valor: z.number().positive(),
    })),
    desconto: z.number().min(0).optional(),
  })
  const { pagamentos, desconto } = schema.parse(req.body)

  const comanda = await Comanda.findOne({ _id: req.params.id, tenantId })
    .populate('mesaId')
    .populate('garcomId')
  if (!comanda) return res.status(404).json({ error: 'Comanda não encontrada' })
  if (comanda.status !== 'ABERTA') return res.status(400).json({ error: 'Comanda já está fechada' })

  if (req.user!.role === 'GARCOM' && comanda.garcomId?.toString() !== req.user!.garcomId) {
    return res.status(403).json({ error: 'Você só pode fechar as suas próprias comandas' })
  }

  const pagamentosExistentes = await Pagamento.find({ comandaId: comanda._id })

  try {
    const session = await mongoose.startSession()
    try {
      await session.withTransaction(async () => {
        await fecharComanda(session, {
          comandaId: req.params.id,
          pagamentos,
          desconto,
          mesaId: comanda.mesaId.toString(),
          tenantId,
          totalAtual: comanda.total,
          pagamentosExistentes,
        })
      })
    } finally {
      session.endSession()
    }
  } catch (err) {
    return responderErro(res, err)
  }

  const mesaNome = (comanda as any).mesaId?.numero
    ? `Mesa ${(comanda as any).mesaId.numero}`
    : 'Comanda Balcão'
  const garcomNome = (comanda as any).garcomId?.nome || 'Sistema'
  broadcastToTenant(tenantId, 'comanda_fechada', {
    comandaId: comanda._id,
    mesa: mesaNome,
    garcom: garcomNome,
    total: comanda.total,
  })

  if ((comanda as any).garcomId) {
    await logAtividadeGarcom({
      garcomId: (comanda as any).garcomId._id,
      garcomNome: (comanda as any).garcomId.nome,
      acao: 'FECHOU_COMANDA',
      detalhes: `Fechou comanda no valor de R$ ${comanda.total.toFixed(2)}`,
      mesaNumero: (comanda as any).mesaId!.numero,
      tenantId,
    })
  }

  const updated = await buscarComandaCompleta(req.params.id, tenantId)
  res.json(updated ? { ...updated.comanda.toObject(), itens: updated.itens, pagamentos: updated.pagamentos } : null)
})

// Ajusta o acréscimo e/ou desconto de um item da comanda
router.patch('/:comandaId/itens/:itemId', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const schema = z.object({
    acrescimo: z.number().min(0).default(0),
    desconto: z.number().min(0).default(0),
  })
  const { acrescimo, desconto } = schema.parse(req.body)

  const comanda = await Comanda.findOne({ _id: req.params.comandaId, tenantId })
  if (!comanda) return res.status(404).json({ error: 'Comanda não encontrada' })
  if (comanda.status !== 'ABERTA') return res.status(400).json({ error: 'Comanda não está aberta' })

  if (req.user!.role === 'GARCOM' && comanda.garcomId?.toString() !== req.user!.garcomId) {
    return res.status(403).json({ error: 'Você só pode ajustar itens nas suas próprias comandas' })
  }

  const itemComanda = await ItemComanda.findOne({
    _id: req.params.itemId,
    comandaId: req.params.comandaId,
  }).populate('itemId')
  if (!itemComanda) return res.status(404).json({ error: 'Item não encontrado na comanda' })

  const precoUnit = (itemComanda.itemId as any).preco * itemComanda.quantidade + acrescimo - desconto

  if (comanda.garcomId) {
    const garcom = await Garcom.findOne({ _id: comanda.garcomId })
    const mesa = await Mesa.findOne({ _id: comanda.mesaId })
    if (garcom) {
      await logAtividadeGarcom({
        garcomId: garcom._id.toString(),
        garcomNome: garcom.nome,
        acao: 'AJUSTOU_ITEM',
        detalhes: `Ajustou o valor de ${(itemComanda.itemId as any).nome} (acréscimo R$ ${acrescimo.toFixed(2)}, desconto R$ ${desconto.toFixed(2)})`,
        mesaNumero: mesa?.numero ?? 0,
        tenantId,
      })
    }
  }

  const { recalcularTotal } = await import('../services/comanda.service')
  try {
    const session = await mongoose.startSession()
    try {
      await session.withTransaction(async () => {
        await ItemComanda.findByIdAndUpdate(
          req.params.itemId,
          { acrescimo, desconto, precoUnit },
          { session }
        )
        await recalcularTotal(session, req.params.comandaId)
      })
    } finally {
      session.endSession()
    }
  } catch (err) {
    return responderErro(res, err)
  }

  const updated = await buscarComandaCompleta(req.params.comandaId, tenantId)
  res.json(updated ? { ...updated.comanda.toObject(), itens: updated.itens, pagamentos: updated.pagamentos } : null)
})

// Remove um item da comanda (requer código de autorização com hash bcrypt)
router.delete('/:comandaId/itens/:itemId', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const codigo = (req.headers['x-codigo-exclusao'] as string | undefined)?.trim()
  const config = await Configuracoes.findOne({ tenantId })

  if (!config?.codigoExclusao) {
    return res.status(400).json({ error: 'Código de exclusão não configurado. Configure em Configurações.' })
  }

  if (!codigo || !(await compararCodigoExclusao(codigo, config.codigoExclusao))) {
    return res.status(401).json({ error: 'Código de autorização inválido' })
  }

  const comanda = await Comanda.findOne({ _id: req.params.comandaId, tenantId })
  if (!comanda) return res.status(404).json({ error: 'Comanda não encontrada' })

  const itemComanda = await ItemComanda.findOne({
    _id: req.params.itemId,
    comandaId: req.params.comandaId,
  }).populate('itemId')
  if (!itemComanda) return res.status(404).json({ error: 'Item não encontrado na comanda' })

  try {
    const session = await mongoose.startSession()
    try {
      await session.withTransaction(async () => {
        await removerItem(session, {
          comandaId: req.params.comandaId,
          itemId: req.params.itemId,
          tenantId,
          itemComanda: {
            itemId: itemComanda.itemId.toString(),
            quantidade: itemComanda.quantidade,
            item: { controlaEstoque: (itemComanda.itemId as any).controlaEstoque },
          },
        })
      })
    } finally {
      session.endSession()
    }
  } catch (err) {
    return responderErro(res, err)
  }

  const updated = await buscarComandaCompleta(req.params.comandaId, tenantId)

  if (updated && (updated.comanda as any).garcomId) {
    await logAtividadeGarcom({
      garcomId: (updated.comanda as any).garcomId._id,
      garcomNome: (updated.comanda as any).garcomId.nome,
      acao: 'REMOVEU_ITEM',
      detalhes: 'Removeu item da comanda (código autorizado)',
      mesaNumero: (updated.comanda as any).mesaId!.numero,
      tenantId,
    })
  }

  res.json(updated ? { ...updated.comanda.toObject(), itens: updated.itens, pagamentos: updated.pagamentos } : null)
})

// Reabre uma comanda fechada do tenant
router.patch('/:id/reabrir', authorizeRoles('SUPERADMIN', 'CLIENTE'), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const comanda = await Comanda.findOne({ _id: req.params.id, tenantId })
  if (!comanda) return res.status(404).json({ error: 'Comanda não encontrada' })
  if (comanda.status !== 'FECHADA') return res.status(400).json({ error: 'Comanda não está fechada' })

  const session = await mongoose.startSession()
  try {
    await session.withTransaction(async () => {
      await reabrirComanda(session, { comandaId: req.params.id, mesaId: comanda.mesaId.toString() })
    })
  } finally {
    session.endSession()
  }

  const updated = await buscarComandaCompleta(req.params.id, tenantId)
  res.json(updated ? { ...updated.comanda.toObject(), itens: updated.itens, pagamentos: updated.pagamentos } : null)
})

export default router
