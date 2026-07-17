import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import app from '../../index'
import { prisma } from '../../lib/prisma'
import { createAuthToken } from '../helpers'

let token: string
let tenantId: string
let garcomId: string

beforeAll(async () => {
  tenantId = 'garcons-test-tenant'
  const user = await prisma.usuario.create({
    data: {
      email: 'garcons-test@teste.com',
      nome: 'Garcons Test',
      senhaHash: 'hash',
      role: 'CLIENTE',
      status: 'ATIVO',
      tenantId,
    },
  })
  token = createAuthToken({ sub: user.id, tenantId })
})

afterAll(async () => {
  await prisma.garcom.deleteMany({ where: { tenantId } })
  await prisma.usuario.deleteMany({ where: { email: 'garcons-test@teste.com' } })
})

describe('GET /api/garcons', () => {
  it('deve listar garçons vazia inicialmente', async () => {
    const res = await request(app)
      .get('/api/garcons')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('deve retornar 401 sem token', async () => {
    const res = await request(app).get('/api/garcons')
    expect(res.status).toBe(401)
  })
})

describe('POST /api/garcons', () => {
  it('deve criar novo garçom', async () => {
    const res = await request(app)
      .post('/api/garcons')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Garçom Teste' })
    expect(res.status).toBe(201)
    expect(res.body.nome).toBe('Garçom Teste')
    garcomId = res.body.id
  })
})

describe('PUT /api/garcons/:id', () => {
  it('deve atualizar garçom', async () => {
    const res = await request(app)
      .put(`/api/garcons/${garcomId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Garçom Atualizado' })
    expect(res.status).toBe(200)
    expect(res.body.nome).toBe('Garçom Atualizado')
  })
})

describe('DELETE /api/garcons/:id', () => {
  it('deve desativar garçom', async () => {
    const res = await request(app)
      .delete(`/api/garcons/${garcomId}`)
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(204)
  })
})
