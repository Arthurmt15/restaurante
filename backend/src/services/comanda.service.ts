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

export async function recalcularTotal(comandaId: string): Promise<number> {
  const comanda = await Comanda.findById(comandaId)
  const agg = await ItemComanda.aggregate([
    { $match: { comandaId } },
    { $group: { _id: null, total: { $sum: '$precoUnit' } } },
  ])

  const subtotal = agg[0]?.total ?? 0
  const taxaServico = MoneyUtils.calcularTaxa(subtotal)
  const desconto = comanda?.desconto || 0
  const total = Math.max(0, subtotal + taxaServico - desconto)

  await Comanda.findByIdAndUpdate(
    comandaId,
    { subtotal, taxaServico, total },
  )

  return total
}

export async function abrirComanda(
  data: { mesaId: string; garcomId: string | null; tenantId: string }
) {
  const comanda = new Comanda({
    mesaId: data.mesaId,
    garcomId: data.garcomId,
    tenantId: data.tenantId,
  })
  await comanda.save()
  await comanda.populate(['mesa', 'garcom'])

  await Mesa.findByIdAndUpdate(
    data.mesaId,
    { status: 'OCUPADA' },
  )

  return comanda
}

export async function adicionarItem(
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
  }).save()

  if (fresh.controlaEstoque) {
    await ItemCardapio.findByIdAndUpdate(
      data.itemId,
      { $inc: { estoqueAtual: -data.quantidade } },
    )

    await new MovimentoEstoque({
      itemId: data.itemId,
      tipo: 'SAIDA',
      quantidade: data.quantidade,
      motivo: 'venda',
      comandaId: data.comandaId,
      tenantId: data.tenantId,
    }).save()
  }

  await recalcularTotal(data.comandaId)
  return fresh
}

export async function removerItem(
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
    )

    await new MovimentoEstoque({
      itemId: data.itemComanda.itemId,
      tipo: 'ENTRADA',
      quantidade: data.itemComanda.quantidade,
      motivo: 'estorno',
      comandaId: data.comandaId,
      tenantId: data.tenantId,
    }).save()
  }

  await ItemComanda.findByIdAndDelete(data.itemId)
  await recalcularTotal(data.comandaId)
}

export async function reabrirComanda(
  data: { comandaId: string; mesaId: string }
) {
  await Comanda.findByIdAndUpdate(
    data.comandaId,
    { status: 'ABERTA' },
  )
  await Mesa.findByIdAndUpdate(
    data.mesaId,
    { status: 'OCUPADA' },
  )
}
