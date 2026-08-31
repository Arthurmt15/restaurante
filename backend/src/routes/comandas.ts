import { Router, Request, Response } from 'express'
import mongoose from 'mongoose'
import { z } from 'zod'
import { authorizeRoles } from '../middlewares/authorize'
import { broadcastToTenant } from '../lib/sse'
import { logAtividadeGarcom } from '../lib/logger'
import {
  Comanda,
  Mesa,
  Garcom,
  ItemCardapio,
  ItemComanda,
  Pagamento,
} from '../models'
import {
  HttpError,
  abrirComanda,
  adicionarItem,
  fecharComanda,
} from '../services/comanda.service'
import comandasStreamRouter from './comandasStream'
import criarComandasItensRouter from './comandasItens'

const router = Router()

router.use(comandasStreamRouter)

export function responderErro(res: Response, err: unknown): void {
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({ error: err.message })
    return
  }
  throw err
}

export async function buscarComandaCompleta(comandaId: string, tenantId: string) {
  const comanda = await Comanda.findOne({ _id: comandaId, tenantId })
    .populate('mesaId')
    .populate('garcomId')
  if (!comanda) return null

  const itens = await ItemComanda.find({ comandaId: comanda._id })
    .populate({ path: 'itemId', populate: { path: 'categoriaId' } })
  const pagamentos = await Pagamento.find({ comandaId: comanda._id })

  return { comanda, itens, pagamentos }
}

router.use(criarComandasItensRouter(buscarComandaCompleta, responderErro))

/**
 * GET /api/comandas/:id
 * Busca uma comanda pelo ID com seus itens e pagamentos.
 * Verifica que a comanda pertence ao tenant autenticado.
 */
router.get('/:id', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const result = await buscarComandaCompleta(req.params.id, tenantId)
  if (!result) return res.status(404).json({ error: 'Comanda não encontrada' })
  res.json({ ...result.comanda.toObject(), itens: result.itens, pagamentos: result.pagamentos })
})

/**
 * POST /api/comandas
 * Abre uma nova comanda para uma mesa do tenant.
 * Valida que a mesa existe, não possui comanda aberta e o garçom é válido.
 * Registra atividade do garçom ao abrir mesa.
 */
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

/**
 * POST /api/comandas/:id/itens
 * Adiciona um item à comanda aberta, baixa estoque e registra movimentação.
 * Garçom só pode adicionar itens em suas próprias comandas.
 * Emite notificação SSE para clientes e admin.
 */
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

/**
 * PATCH /api/comandas/:id/fechar
 * Fecha uma comanda aberta com um ou mais métodos de pagamento.
 * Suporta desconto e múltiplas formas de pagamento.
 * Garçom só pode fechar suas próprias comandas.
 */
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

export default router
