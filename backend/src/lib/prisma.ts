import { PrismaClient } from '@prisma/client'

// Instância única do Prisma Client para conectar ao banco de dados
export const prisma = new PrismaClient()
