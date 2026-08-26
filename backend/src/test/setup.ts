import { beforeAll, afterAll } from 'vitest'
import mongoose from 'mongoose'
import { connectDatabase, disconnectDatabase } from '../lib/mongoose'

beforeAll(async () => {
  process.env.JWT_SECRET = 'TEST_SECRET'
  process.env.NODE_ENV = 'test'
  await connectDatabase()
})

afterAll(async () => {
  await disconnectDatabase()
})
