import dotenv from 'dotenv'
dotenv.config()

import mongoose from 'mongoose'
import logger from './pino'

const MONGODB_URI = process.env.DATABASE_URL || 'mongodb://localhost:27017/restaurante'

let isConnected = false

export async function connectDatabase() {
  if (isConnected) return

  mongoose.set('strictQuery', true)

  await mongoose.connect(MONGODB_URI)
  isConnected = true
  logger.info('Conectado ao MongoDB via Mongoose')
}

export async function disconnectDatabase() {
  if (!isConnected) return
  await mongoose.disconnect()
  isConnected = false
  logger.info('Desconectado do MongoDB')
}
