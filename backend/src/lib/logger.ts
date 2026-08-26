import { AtividadeGarcom } from '../models'

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
    console.error('Erro ao registrar atividade do garçom:', error)
  }
}
