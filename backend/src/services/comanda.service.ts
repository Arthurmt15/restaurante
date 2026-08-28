import { ClientSession } from 'mongoose'
import bcrypt from 'bcryptjs'
import {
  Comanda,
  ItemComanda,
  ItemCardapio,
  Mesa,
  Pagamento,
  MovimentoEstoque,
} from '../models'

const TAXA_SERVICO = 0.1

export class HttpError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message)
  }
}

export async function recalcularTotal(session: ClientSession, comandaId: string): Promise<number> {
  const comanda = await Comanda.findById(comandaId).session(session)
  const agg = await ItemComanda.aggregate([
    { $match: { comandaId } },
    { $group: { _id: null, total: { $sum: '$precoUnit' } } },
  ]).session(session)

  const subtotal = agg[0]?.total ?? 0
  const taxaServico = Math.round(subtotal * TAXA_SERVICO * 100) / 100
  const desconto = comanda?.desconto || 0
  const total = Math.max(0, subtotal + taxaServico - desconto)

  await Comanda.findByIdAndUpdate(
    comandaId,
    { subtotal, taxaServico, total },
    { session }
  )

  return total
}

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

export async function fecharComanda(
  session: ClientSession,
  data: {
    comandaId: string
    pagamentos: { forma: string; valor: number }[]
    desconto?: number
    mesaId: string
    tenantId: string
    totalAtual: number
    pagamentosExistentes: { valor: number }[]
  }
) {
  let total = data.totalAtual

  if (data.desconto !== undefined) {
    await Comanda.findByIdAndUpdate(
      data.comandaId,
      { desconto: data.desconto },
      { session }
    )
    total = (await recalcularTotal(session, data.comandaId)) ?? 0
  }

  const jaPago = data.pagamentosExistentes.reduce((acc, p) => acc + p.valor, 0)
  const restante = total - jaPago

  if (restante > 0) {
    if (data.pagamentos.length === 0) {
      throw new HttpError(400, 'Adicione ao menos um método de pagamento')
    }
    const totalPagoNovo = data.pagamentos.reduce((acc, p) => acc + p.valor, 0)
    if (Math.abs(totalPagoNovo - restante) > 0.01) {
      throw new HttpError(
        400,
        `Valor a pagar (R$ ${restante.toFixed(2)}) não corresponde ao total informado (R$ ${totalPagoNovo.toFixed(2)})`
      )
    }
  }

  await Comanda.findByIdAndUpdate(
    data.comandaId,
    { status: 'FECHADA' },
    { session }
  )

  for (const p of data.pagamentos) {
    await new Pagamento({
      comandaId: data.comandaId,
      forma: p.forma,
      valor: p.valor,
    }).save({ session })
  }

  const outrasAbertas = await Comanda.countDocuments({
    mesaId: data.mesaId,
    status: 'ABERTA',
    tenantId: data.tenantId,
    _id: { $ne: data.comandaId },
  }).session(session)
  if (outrasAbertas === 0) {
    await Mesa.findByIdAndUpdate(
      data.mesaId,
      { status: 'LIVRE' },
      { session }
    )
  }
}

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

// ─── Configuração: código de exclusão com hash bcrypt ────────────────────────

export async function compararCodigoExclusao(
  codigoPlano: string,
  codigoHash: string
): Promise<boolean> {
  // Compatibilidade: se o hash não começar com $2$, é texto plano antigo
  if (!codigoHash.startsWith('$2')) {
    return codigoPlano === codigoHash
  }
  return bcrypt.compare(codigoPlano, codigoHash)
}

export async function hashCodigoExclusao(codigo: string): Promise<string> {
  return bcrypt.hash(codigo, 10)
}
