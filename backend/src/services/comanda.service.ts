import { ClientSession } from 'mongoose'
import {
  Comanda,
  ItemComanda,
  ItemCardapio,
  Mesa,
  MovimentoEstoque,
} from '../models'
import { HttpError } from '../lib/comanda-utils'
import { MoneyUtils } from '../lib/MoneyUtils'

export { HttpError } from '../lib/comanda-utils'
export { compararCodigoExclusao, hashCodigoExclusao } from '../lib/comanda-utils'
export { fecharComanda } from './comanda-fechamento'

/**
 * Recalcula o total de uma comanda com base em todos os itens associados.
 *
 * Calcula o subtotal a partir dos preços dos itens, aplica a taxa de serviço (10%),
 * subtrai descontos e atualiza o registro da comanda no banco de dados.
 *
 * @param session - Sessão do Mongoose para transação.
 * @param comandaId - ID da comanda a ser recalculada.
 * @returns O novo total calculado da comanda.
 */
export async function recalcularTotal(session: ClientSession, comandaId: string): Promise<number> {
  const comanda = await Comanda.findById(comandaId).session(session)
  const agg = await ItemComanda.aggregate([
    { $match: { comandaId } },
    { $group: { _id: null, total: { $sum: '$precoUnit' } } },
  ]).session(session)

  const subtotal = agg[0]?.total ?? 0
  const taxaServico = MoneyUtils.calcularTaxa(subtotal)
  const desconto = comanda?.desconto || 0
  const total = Math.max(0, subtotal + taxaServico - desconto)

  await Comanda.findByIdAndUpdate(
    comandaId,
    { subtotal, taxaServico, total },
    { session }
  )

  return total
}

/**
 * Abre uma nova comanda para uma mesa.
 *
 * Cria o registro da comanda, popula referências (mesa e garçom)
 * e atualiza o status da mesa para 'OCUPADA'.
 *
 * @param session - Sessão do Mongoose para transação.
 * @param data - Dados para abertura da comanda.
 * @param data.mesaId - ID da mesa que receberá a comanda.
 * @param data.garcomId - ID do garçom responsável (pode ser `null`).
 * @param data.tenantId - ID do tenant (restaurante).
 * @returns A comanda criada com referências populadas.
 */
export async function abrirComanda(
  session: ClientSession,
  data: { mesaId: string; garcomId: string | null; tenantId: string }
) {
  const comanda = new Comanda({
    mesaId: data.mesaId,
    garcomId: data.garcomId,
    tenantId: data.tenantId,
  })
  await comanda.save({ session })
  await comanda.populate(['mesa', 'garcom'])

  await Mesa.findByIdAndUpdate(
    data.mesaId,
    { status: 'OCUPADA' },
    { session }
  )

  return comanda
}

/**
 * Adiciona um item à comanda.
 *
 * Valida a existência do item no cardápio do tenant, verifica estoque se aplicável,
 * cria o registro do item na comanda, atualiza o estoque e registra a movimentação.
 * Após a adição, recalcula o total da comanda.
 *
 * @param session - Sessão do Mongoose para transação.
 * @param data - Dados do item a ser adicionado.
 * @param data.comandaId - ID da comanda que receberá o item.
 * @param data.itemId - ID do item do cardápio.
 * @param data.quantidade - Quantidade do item.
 * @param data.observacao - Observação opcional do item.
 * @param data.acrescimo - Valor de acréscimo adicional ao item.
 * @param data.desconto - Valor de desconto aplicado ao item (opcional).
 * @param data.tenantId - ID do tenant (restaurante).
 * @returns O item do cardápio encontrado e populado.
 * @throws {HttpError} Se o item não for encontrado ou estoque insuficiente.
 */
export async function adicionarItem(
  session: ClientSession,
  data: {
    comandaId: string
    itemId: string
    quantidade: number
    observacao?: string
    acrescimo: number
    desconto?: number
    tenantId: string
  }
) {
  const fresh = await ItemCardapio.findOne({
    _id: data.itemId,
    tenantId: data.tenantId,
  })
    .populate('categoria')
    .session(session)
  if (!fresh) throw new HttpError(404, 'Item não encontrado neste ambiente')

  if (fresh.controlaEstoque && fresh.estoqueAtual < data.quantidade) {
    throw new HttpError(400, `Estoque insuficiente. Disponível: ${fresh.estoqueAtual}`)
  }

  const desconto = data.desconto ?? 0
  await new ItemComanda({
    comandaId: data.comandaId,
    itemId: data.itemId,
    quantidade: data.quantidade,
    precoUnit: fresh.preco * data.quantidade + data.acrescimo - desconto,
    observacao: data.observacao,
    acrescimo: data.acrescimo,
    desconto,
  }).save({ session })

  if (fresh.controlaEstoque) {
    await ItemCardapio.findByIdAndUpdate(
      data.itemId,
      { $inc: { estoqueAtual: -data.quantidade } },
      { session }
    )

    await new MovimentoEstoque({
      itemId: data.itemId,
      tipo: 'SAIDA',
      quantidade: data.quantidade,
      motivo: 'venda',
      comandaId: data.comandaId,
      tenantId: data.tenantId,
    }).save({ session })
  }

  await recalcularTotal(session, data.comandaId)
  return fresh
}



/**
 * Remove um item da comanda.
 *
 * Se o item controla estoque, devolve a quantidade ao estoque e registra
 * a movimentação de entrada (estorno). Após a remoção, recalcula o total da comanda.
 *
 * @param session - Sessão do Mongoose para transação.
 * @param data - Dados do item a ser removido.
 * @param data.comandaId - ID da comanda.
 * @param data.itemId - ID do registro do item na comanda (ItemComanda).
 * @param data.tenantId - ID do tenant (restaurante).
 * @param data.itemComanda - Dados do item da comanda para estorno de estoque.
 */
export async function removerItem(
  session: ClientSession,
  data: {
    comandaId: string
    itemId: string
    tenantId: string
    itemComanda: {
      itemId: string
      quantidade: number
      item: { controlaEstoque: boolean }
    }
  }
) {
  if (data.itemComanda.item.controlaEstoque) {
    await ItemCardapio.findByIdAndUpdate(
      data.itemComanda.itemId,
      { $inc: { estoqueAtual: data.itemComanda.quantidade } },
      { session }
    )

    await new MovimentoEstoque({
      itemId: data.itemComanda.itemId,
      tipo: 'ENTRADA',
      quantidade: data.itemComanda.quantidade,
      motivo: 'estorno',
      comandaId: data.comandaId,
      tenantId: data.tenantId,
    }).save({ session })
  }

  await ItemComanda.findByIdAndDelete(data.itemId, { session })
  await recalcularTotal(session, data.comandaId)
}

/**
 * Reabre uma comanda que foi fechada.
 *
 * Atualiza o status da comanda para 'ABERTA' e o status da mesa para 'OCUPADA'.
 *
 * @param session - Sessão do Mongoose para transação.
 * @param data - Dados para reabertura.
 * @param data.comandaId - ID da comanda a ser reaberta.
 * @param data.mesaId - ID da mesa associada.
 */
export async function reabrirComanda(
  session: ClientSession,
  data: { comandaId: string; mesaId: string }
) {
  await Comanda.findByIdAndUpdate(
    data.comandaId,
    { status: 'ABERTA' },
    { session }
  )
  await Mesa.findByIdAndUpdate(
    data.mesaId,
    { status: 'OCUPADA' },
    { session }
  )
}
