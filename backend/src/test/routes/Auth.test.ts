import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import bcrypt from 'bcryptjs'
import app from '../../index'
import { prisma } from '../../lib/prisma'

let testUserId: string

beforeAll(async () => {
  const hash = await bcrypt.hash('12345678', 12)
  const user = await prisma.usuario.create({
    data: {
      email: 'auth-test@teste.com',
      nome: 'Auth Test',
      senhaHash: hash,
      role: 'CLIENTE',
      status: 'ATIVO',
      tenantId: '',
    },
  })
  testUserId = user.id
  await prisma.usuario.update({ where: { id: user.id }, data: { tenantId: user.id } })
})

afterAll(async () => {
  await prisma.refreshToken.deleteMany({ where: { usuarioId: testUserId } })
  await prisma.usuario.deleteMany({ where: { id: testUserId } })
})

describe('POST /api/auth/login', () => {
  it('deve fazer login com credenciais válidas', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'auth-test@teste.com', senha: '12345678' })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('accessToken')
    expect(res.body).toHaveProperty('usuario')
    expect(res.body.usuario.email).toBe('auth-test@teste.com')
  })

  it('deve rejeitar senha incorreta', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'auth-test@teste.com', senha: 'wrongpass' })
    expect(res.status).toBe(401)
  })

  it('deve rejeitar email inexistente', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'naoexiste@teste.com', senha: '12345678' })
    expect(res.status).toBe(401)
  })
})

describe('GET /api/auth/me', () => {
  it('deve retornar dados do usuário com token válido', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'auth-test@teste.com', senha: '12345678' })
    const token = login.body.accessToken

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.usuario.email).toBe('auth-test@teste.com')
  })

  it('deve retornar 401 sem token', async () => {
    const res = await request(app).get('/api/auth/me')
    expect(res.status).toBe(401)
  })
})
