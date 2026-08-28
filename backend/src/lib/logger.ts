import { AtividadeGarcom } from '../models'
import logger from './pino'

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
