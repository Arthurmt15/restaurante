import { AtividadeGarcom } from '../models'
import logger from './pino'

/**
 * Registra a atividade de um garçom no banco de dados.
 *
 * Cria um registro na coleção `AtividadeGarcom` com informações sobre
 * a ação realizada, o garçom responsável e a mesa envolvida.
 * Em caso de erro ao salvar, registra o erro no logger e não propaga a exceção.
 *
 * @param data - Dados da atividade do garçom.
 * @param data.garcomId - ID do garçom que realizou a ação.
 * @param data.garcomNome - Nome do garçom.
 * @param data.acao - Tipo de ação realizada (ex: 'abrir_comanda', 'adicionar_item').
 * @param data.detalhes - Descrição detalhada da ação.
 * @param data.mesaNumero - Número da mesa envolvida.
 * @param data.tenantId - ID do tenant (restaurante) ao qual a atividade pertence.
 */
export async function logAtividadeGarcom(data: {
  garcomId: string
  garcomNome: string
  acao: string
  detalhes: string
  mesaNumero: number
  tenantId: string
}) {
  try {
    await AtividadeGarcom.create({
      garcomId: data.garcomId,
      garcomNome: data.garcomNome,
      acao: data.acao,
      detalhes: data.detalhes,
      mesaNumero: data.mesaNumero,
      tenantId: data.tenantId,
    })
  } catch (error) {
    logger.error({ err: error, garcomId: data.garcomId, acao: data.acao }, 'Erro ao registrar atividade do garçom')
  }
}
