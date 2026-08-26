import dotenv from 'dotenv'
dotenv.config()

import mongoose from 'mongoose'

const MONGODB_URI = process.env.DATABASE_URL || 'mongodb://localhost:27017/restaurante'

let isConnected = false

export async function connectDatabase() {
  if (isConnected) return

  mongoose.set('strictQuery', true)

  await mongoose.connect(MONGODB_URI)
  isConnected = true
  console.log('Conectado ao MongoDB via Mongoose')
}

export async function disconnectDatabase() {
  if (!isConnected) return
  await mongoose.disconnect()
  isConnected = false
  console.log('Desconectado do MongoDB')
}
