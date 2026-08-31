import dotenv from 'dotenv'
dotenv.config()

import mongoose from 'mongoose'
import logger from './pino'

const MONGODB_URI = process.env.DATABASE_URL || 'mongodb://localhost:27017/restaurante'

let isConnected = false

/**
 * Conecta ao banco de dados MongoDB via Mongoose.
 *
 * Utiliza a variável de ambiente `DATABASE_URL` ou o endereço padrão local.
 * Se já estiver conectado, retorna silenciosamente.
 * Configura `strictQuery` como `true` para rejeitar consultas com campos não definidos no schema.
 *
 * @returns {Promise<void>} Resolvida quando a conexão é estabelecida.
 */
export async function connectDatabase() {
  if (isConnected) return

  mongoose.set('strictQuery', true)

  await mongoose.connect(MONGODB_URI)
  isConnected = true
  logger.info('Conectado ao MongoDB via Mongoose')
}

/**
 * Desconecta do banco de dados MongoDB.
 *
 * Se não estiver conectado, retorna silenciosamente.
 *
 * @returns {Promise<void>} Resolvida quando a desconexão é concluída.
 */
export async function disconnectDatabase() {
  if (!isConnected) return
  await mongoose.disconnect()
  isConnected = false
  logger.info('Desconectado do MongoDB')
}
