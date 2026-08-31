import mongoose, { ClientSession } from 'mongoose';

/**
 * Classe utilitária que encapsula o padrão de sessão/transação do Mongoose.
 * Elimina a duplicação do bloco try/finally com `startSession` / `withTransaction` / `endSession`.
 *
 * @example
 * ```ts
 * const resultado = await TransactionHelper.execute(async (session) => {
 *   const pedido = await Pedido.create([{ ... }], { session });
 *   const comanda = await Comanda.findByIdAndUpdate(
 *     comandaId,
 *     { $push: { pedidos: pedido._id } },
 *     { session, new: true }
 *   );
 *   return comanda;
 * });
 * ```
 */
export class TransactionHelper {
  /**
   * Executa uma função dentro de uma sessão Mongoose com transação.
   * A sessão é iniciada antes da execução e finalizada no bloco `finally`,
   * garantindo que recursos sejam liberados mesmo em caso de erro.
   *
   * @param fn - Função assíncrona que recebe a sessão e retorna um resultado do tipo T
   * @returns Resultado da função executada dentro da transação
   * @throws Qualquer erro lançado dentro da função fn será propagado após o encerramento da sessão
   */
  static async execute<T>(fn: (session: ClientSession) => Promise<T>): Promise<T> {
    const session = await mongoose.startSession();
    try {
      const result = await session.withTransaction(async () => {
        return await fn(session);
      });
      return result;
    } finally {
      session.endSession();
    }
  }
}
