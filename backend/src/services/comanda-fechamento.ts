import {
  Comanda,
  Mesa,
  Pagamento,
} from '../models'
import { HttpError } from '../lib/comanda-utils'
import { recalcularTotal } from './comanda.service'

export async function fecharComanda(
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
    )
    total = (await recalcularTotal(data.comandaId)) ?? 0
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
  )

  for (const p of data.pagamentos) {
    await new Pagamento({
      comandaId: data.comandaId,
      forma: p.forma,
      valor: p.valor,
    }).save()
  }

  const outrasAbertas = await Comanda.countDocuments({
    mesaId: data.mesaId,
    status: 'ABERTA',
    tenantId: data.tenantId,
    _id: { $ne: data.comandaId },
  })
  if (outrasAbertas === 0) {
    await Mesa.findByIdAndUpdate(
      data.mesaId,
      { status: 'LIVRE' },
    )
  }
}
