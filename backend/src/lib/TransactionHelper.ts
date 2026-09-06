/**
 * Classe utilitária que executa operações de banco de dados.
 * Em MongoDB standalone (sem replica set), sessões/transações não são suportadas.
 * Esta versão executa a função diretamente sem sessão.
 */
export class TransactionHelper {
  static async execute<T>(fn: () => Promise<T>): Promise<T> {
    return await fn()
  }
}
