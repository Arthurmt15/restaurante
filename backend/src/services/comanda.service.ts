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

/**
 * Erro HTTP personalizado para operações de comanda.
 *
 * Permite associar um código de status HTTP a uma mensagem de erro,
 * facilitando o tratamento de erros de negócio nos controllers.
 */
export class HttpError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message)
  }
}

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

// ─── Configuração: código de exclusão com hash bcrypt ────────────────────────

/**
 * Compara um código de exclusão fornecido com um hash armazenado.
 *
 * Suporta compatibilidade com texto plano antigo (hashes que não começam com `$2`).
 * Se o hash não for bcrypt, compara como texto plano.
 *
 * @param codigoPlano - Código em texto plano fornecido pelo usuário.
 * @param codigoHash - Hash armazenado no banco de dados.
 * @returns `true` se o código corresponder ao hash, `false` caso contrário.
 */
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

/**
 * Gera um hash bcrypt a partir de um código de exclusão.
 *
 * Utiliza salt rounds de 10 para equilíbrio entre segurança e performance.
 *
 * @param codigo - Código em texto plano a ser hasheado.
 * @returns O hash bcrypt gerado.
 */
export async function hashCodigoExclusao(codigo: string): Promise<string> {
  return bcrypt.hash(codigo, 10)
}
