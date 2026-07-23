import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function logAtividadeGarcom(data: {
  garcomId: string
  garcomNome: string
  acao: string
  detalhes: string
  mesaNumero: number
  tenantId: string
}) {
  try {
    await prisma.atividadeGarcom.create({
      data: {
        garcomId: data.garcomId,
        garcomNome: data.garcomNome,
        acao: data.acao,
        detalhes: data.detalhes,
        mesaNumero: data.mesaNumero,
        tenantId: data.tenantId,
      },
    })
  } catch (error) {
    console.error('Erro ao registrar atividade do garçom:', error)
  }
}
