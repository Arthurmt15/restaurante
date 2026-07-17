import { prisma } from '../lib/prisma'

beforeAll(async () => {
  process.env.JWT_SECRET = 'TEST_SECRET'
  process.env.NODE_ENV = 'test'
})

afterAll(async () => {
  await prisma.$disconnect()
})
