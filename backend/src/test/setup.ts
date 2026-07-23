import { prisma } from '../lib/prisma'
import { beforeAll, afterAll } from 'vitest'

beforeAll(async () => {
  process.env.JWT_SECRET = 'TEST_SECRET'
  process.env.NODE_ENV = 'test'
})

afterAll(async () => {
  await prisma.$disconnect()
})
