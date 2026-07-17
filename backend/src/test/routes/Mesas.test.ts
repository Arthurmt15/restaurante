import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import app from '../../index'
import { prisma } from '../../lib/prisma'
import { createAuthToken } from '../helpers'

let token: string
let tenantId: string
let mesaId: string

beforeAll(async () => {
  tenantId = 'mesas-test-tenant'
  const user = await prisma.usuario.create({
    data: {
      email: 'mesas-test@teste.com',
      nome: 'Mesas Test',
      senhaHash: 'hash',
      role: 'CLIENTE',
      status: 'ATIVO',
      tenantId,
    },
  })
  token = createAuthToken({ sub: user.id, tenantId })

  await prisma.mesa.create({ data: { numero: 99, tenantId } })
})

afterAll(async () => {
  await prisma.mesa.deleteMany({ where: { tenantId } })
  await prisma.usuario.deleteMany({ where: { email: 'mesas-test@teste.com' } })
})

describe('GET /api/mesas', () => {
  it('deve listar mesas do tenant', async () => {
    const res = await request(app)
      .get('/api/mesas')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThanOrEqual(1)
  })

  it('deve retornar 401 sem token', async () => {
    const res = await request(app).get('/api/mesas')
    expect(res.status).toBe(401)
  })
})

describe('POST /api/mesas', () => {
  it('deve criar nova mesa', async () => {
    const res = await request(app)
      .post('/api/mesas')
      .set('Authorization', `Bearer ${token}`)
      .send({ numero: 200 })
    expect(res.status).toBe(201)
    expect(res.body.numero).toBe(200)
    mesaId = res.body.id
  })

  it('deve rejeitar número duplicado no mesmo tenant', async () => {
    const res = await request(app)
      .post('/api/mesas')
      .set('Authorization', `Bearer ${token}`)
      .send({ numero: 200 })
    expect(res.status).toBe(409)
  })
})

describe('PATCH /api/mesas/:id/status', () => {
  it('deve atualizar status da mesa', async () => {
    const res = await request(app)
      .patch(`/api/mesas/${mesaId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'OCUPADA' })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('OCUPADA')
  })
})

describe('DELETE /api/mesas/:id', () => {
  it('deve remover mesa livre', async () => {
    const lista = await request(app)
      .get('/api/mesas')
      .set('Authorization', `Bearer ${token}`)
    const mesaLivre = lista.body.find((m: { status: string }) => m.status === 'LIVRE')
    if (!mesaLivre) return
    const res = await request(app)
      .delete(`/api/mesas/${mesaLivre.id}`)
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(204)
  })
})
