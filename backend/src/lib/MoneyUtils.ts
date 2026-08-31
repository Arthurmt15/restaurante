/**
 * Classe utilitária para operações financeiras.
 * Centraliza arredondamento, cálculo de taxas e formatação de valores monetários.
 *
 * @example
 * ```ts
 * const valor = MoneyUtils.round(19.994);
 * // 19.99
 *
 * const taxa = MoneyUtils.calcularTaxa(100);
 * // 10
 *
 * const formatado = MoneyUtils.formatBRL(150.5);
 * // "R$ 150,50"
 * ```
 */
export class MoneyUtils {
  /**
   * Percentual da taxa de serviço cobrada sobre o subtotal.
   * Equivale a 10% (0.1).
   */
  static readonly TAXA_SERVICO = 0.1;

  /**
   * Arredonda um valor numérico para duas casas decimais.
   *
   * @param value - Valor a ser arredondado
   * @returns Valor arredondado para o centavo mais próximo
   *
   * @example
   * ```ts
   * MoneyUtils.round(19.994); // 19.99
   * MoneyUtils.round(19.995); // 20
   * MoneyUtils.round(0.1 + 0.2); // 0.3 (corrige imprecisão de ponto flutuante)
   * ```
   */
  static round(value: number): number {
    return Math.round(value * 100) / 100;
  }

  /**
   * Calcula a taxa de serviço (10%) sobre um subtotal.
   *
   * @param subtotal - Valor subtotal sobre o qual a taxa será calculada
   * @returns Valor da taxa de serviço arredondado
   *
   * @example
   * ```ts
   * MoneyUtils.calcularTaxa(100);   // 10
   * MoneyUtils.calcularTaxa(87.50); // 8.75
   * ```
   */
  static calcularTaxa(subtotal: number): number {
    return this.round(subtotal * this.TAXA_SERVICO);
  }

  /**
   * Formata um valor numérico como moeda brasileira (BRL).
   * Utiliza separador de milhar com ponto e decimal com vírgula.
   *
   * @param value - Valor numérico a ser formatado
   * @returns String no formato "R$ X.XXX,XX"
   *
   * @example
   * ```ts
   * MoneyUtils.formatBRL(150.5);    // "R$ 150,50"
   * MoneyUtils.formatBRL(1234.56);  // "R$ 1.234,56"
   * MoneyUtils.formatBRL(0);        // "R$ 0,00"
   * ```
   */
  static formatBRL(value: number): string {
    return `R$ ${value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
}
