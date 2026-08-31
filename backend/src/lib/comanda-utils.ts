/**
 * Utilitários compartilhados para operações de comanda.
 *
 * Contém a classe HttpError para tratamento de erros HTTP
 * e funções de comparação e hash de códigos de exclusão.
 */
import bcrypt from 'bcryptjs'

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
