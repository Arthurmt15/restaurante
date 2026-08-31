/**
 * Classe utilitária para cálculos de períodos de tempo.
 * Utilizada nos relatórios para determinar intervalos de datas com base
 * no tipo de período selecionado (diário, semanal, mensal, etc.).
 *
 * @example
 * ```ts
 * const { startDate, endDate } = DateRangeHelper.calcularPeriodo('mensal', '08', '2025');
 * // startDate: 2025-08-01T00:00:00.000Z
 * // endDate:   2025-09-01T00:00:00.000Z
 * ```
 */
export class DateRangeHelper {
  /**
   * Calcula o intervalo de datas (startDate e endDate) com base no período informado.
   *
   * Tipos de período suportados:
   * - `diario` → início e fim do dia atual
   * - `semanal` → início da semana (domingo) até o fim do dia atual
   * - `mensal` → primeiro dia do mês até o primeiro dia do mês seguinte
   * - `trimestral` → primeiro dia do trimestre até o primeiro dia do trimestre seguinte
   * - `anual` → primeiro dia do ano até o primeiro dia do ano seguinte
   * - `personalizado` → retorna apenas startDate (endDate undefined) para filtro manual
   *
   * @param periodo - Tipo do período (diario | semanal | mensal | trimestral | anual | personalizado)
   * @param mes - Mês no formato "MM" (ex: "08" para agosto). Obrigatório para períodos mensal e trimestral.
   * @param ano - Ano no formato "AAAA" (ex: "2025"). Obrigatório para períodos mensal, trimestral e anual.
   * @returns Objeto com startDate (sempre) e endDate (quando aplicável)
   *
   * @throws {Error} Se o período for inválido
   */
  static calcularPeriodo(
    periodo: string,
    mes?: string,
    ano?: string
  ): { startDate: Date; endDate?: Date } {
    const now = new Date();
    const anoAtual = now.getFullYear();
    const mesAtual = now.getMonth();

    switch (periodo) {
      case 'diario': {
        const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        return { startDate, endDate };
      }

      case 'semanal': {
        const diaSemana = now.getDay();
        const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diaSemana);
        const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        return { startDate, endDate };
      }

      case 'mensal': {
        const mesNum = mes ? parseInt(mes, 10) - 1 : mesAtual;
        const anoNum = ano ? parseInt(ano, 10) : anoAtual;
        const startDate = new Date(anoNum, mesNum, 1);
        const endDate = new Date(anoNum, mesNum + 1, 1);
        return { startDate, endDate };
      }

      case 'trimestral': {
        const mesNum = mes ? parseInt(mes, 10) - 1 : mesAtual;
        const anoNum = ano ? parseInt(ano, 10) : anoAtual;
        const trimestreInicio = Math.floor(mesNum / 3) * 3;
        const startDate = new Date(anoNum, trimestreInicio, 1);
        const endDate = new Date(anoNum, trimestreInicio + 3, 1);
        return { startDate, endDate };
      }

      case 'anual': {
        const anoNum = ano ? parseInt(ano, 10) : anoAtual;
        const startDate = new Date(anoNum, 0, 1);
        const endDate = new Date(anoNum + 1, 0, 1);
        return { startDate, endDate };
      }

      case 'personalizado': {
        return { startDate: now, endDate: undefined };
      }

      default:
        throw new Error(`Período inválido: ${periodo}`);
    }
  }

  /**
   * Retorna o rótulo capitalizado de um período para exibição em interfaces.
   *
   * @param periodo - String do período (ex: "mensal", "semanal")
   * @returns Rótulo capitalizado ou uma string padrão caso não informado
   *
   * @example
   * ```ts
   * DateRangeHelper.formatPeriodoLabel('mensal');   // "Mensal"
   * DateRangeHelper.formatPeriodoLabel('anual');    // "Anual"
   * DateRangeHelper.formatPeriodoLabel();            // "Todos os Períodos"
   * ```
   */
  static formatPeriodoLabel(periodo?: string): string {
    if (!periodo) {
      return 'Todos os Períodos';
    }

    const labels: Record<string, string> = {
      diario: 'Diário',
      semanal: 'Semanal',
      mensal: 'Mensal',
      trimestral: 'Trimestral',
      anual: 'Anual',
      personalizado: 'Personalizado',
    };

    return labels[periodo] ?? periodo.charAt(0).toUpperCase() + periodo.slice(1);
  }
}
