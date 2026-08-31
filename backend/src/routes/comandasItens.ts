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
  ItemComanda,
  Configuracoes,
} from '../models'
import {
  removerItem,
  reabrirComanda,
  compararCodigoExclusao,
  recalcularTotal,
} from '../services/comanda.service'
import type { buscarComandaCompleta, responderErro } from './comandas'

const router = Router()

/**
 * Monta uma função auxiliar para buscar comanda completa.
 * Recebe a função `buscarComandaCompleta` do módulo principal de comandas.
 *
 * @param buscarFn - Função auxiliar para buscar comanda com itens e pagamentos.
 * @returns Router com as rotas de gerenciamento de itens da comanda.
 */
export default function criarComandasItensRouter(
  buscarFn: typeof buscarComandaCompleta,
  responderErroFn: typeof responderErro,
) {
  /**
   * PATCH /api/comandas/:comandaId/itens/:itemId
   * Ajusta o acréscimo e/ou desconto de um item específico da comanda.
   * Recalcula o total da comanda após a alteração.
   */
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
      return responderErroFn(res, err)
    }

    const updated = await buscarFn(req.params.comandaId, tenantId)
    res.json(updated ? { ...updated.comanda.toObject(), itens: updated.itens, pagamentos: updated.pagamentos } : null)
  })

  /**
   * DELETE /api/comandas/:comandaId/itens/:itemId
   * Remove um item da comanda. Requer código de autorização via header x-codigo-exclusao.
   * Devolve o estoque do item removido.
   */
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
      return responderErroFn(res, err)
    }

    const updated = await buscarFn(req.params.comandaId, tenantId)

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

  /**
   * PATCH /api/comandas/:id/reabrir
   * Reabre uma comanda que foi fechada.
   * Requer role SUPERADMIN ou CLIENTE.
   */
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

    const updated = await buscarFn(req.params.id, tenantId)
    res.json(updated ? { ...updated.comanda.toObject(), itens: updated.itens, pagamentos: updated.pagamentos } : null)
  })

  return router
}
