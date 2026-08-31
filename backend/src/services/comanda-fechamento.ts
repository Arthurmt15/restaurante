import { ClientSession } from 'mongoose'
import {
  Comanda,
  Mesa,
  Pagamento,
} from '../models'
import { HttpError } from '../lib/comanda-utils'
import { recalcularTotal } from './comanda.service'

/**
 * Fecha uma comanda, registrando pagamentos e finalizando a operação.
 *
 * Aplica desconto (se informado), recalcula o total, valida se os valores
 * pagos correspondem ao restante devido, registra os pagamentos e atualiza
 * o status da comanda para 'FECHADA'. Se não houver outras comandas abertas
 * na mesa, libera a mesa para 'LIVRE'.
 *
 * @param session - Sessão do Mongoose para transação.
 * @param data - Dados para fechamento da comanda.
 * @param data.comandaId - ID da comanda a ser fechada.
 * @param data.pagamentos - Lista de pagamentos a serem registrados.
 * @param data.desconto - Valor de desconto a ser aplicado (opcional).
 * @param data.mesaId - ID da mesa associada.
 * @param data.tenantId - ID do tenant (restaurante).
 * @param data.totalAtual - Total atual da comanda antes do fechamento.
 * @param data.pagamentosExistentes - Pagamentos já registrados anteriormente.
 * @throws {HttpError} Se nenhum pagamento for informado ou valores não corresponderem.
 */
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
