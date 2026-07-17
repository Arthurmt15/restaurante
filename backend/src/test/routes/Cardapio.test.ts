import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import app from '../../index'
import { prisma } from '../../lib/prisma'
import { createAuthToken } from '../helpers'

let token: string
let tenantId: string
let categoriaId: string
let itemId: string

beforeAll(async () => {
  tenantId = 'cardapio-test-tenant'
  const user = await prisma.usuario.create({
    data: {
      email: 'cardapio-test@teste.com',
      nome: 'Cardapio Test',
      senhaHash: 'hash',
      role: 'CLIENTE',
      status: 'ATIVO',
      tenantId,
    },
  })
  token = createAuthToken({ sub: user.id, tenantId })
})

afterAll(async () => {
  await prisma.itemCardapio.deleteMany({ where: { tenantId } })
  await prisma.categoria.deleteMany({ where: { tenantId } })
  await prisma.usuario.deleteMany({ where: { email: 'cardapio-test@teste.com' } })
})

describe('Categorias', () => {
  it('deve criar categoria', async () => {
    const res = await request(app)
      .post('/api/cardapio/categoria')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'TestBebidas' })
    expect(res.status).toBe(201)
    expect(res.body.nome).toBe('TestBebidas')
    categoriaId = res.body.id
  })

  it('deve rejeitar categoria duplicada no tenant', async () => {
    const res = await request(app)
      .post('/api/cardapio/categoria')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'TestBebidas' })
    expect(res.status).toBe(409)
  })
})

describe('Itens do Cardápio', () => {
  it('deve criar item', async () => {
    const res = await request(app)
      .post('/api/cardapio')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Item Teste', preco: 10, categoriaId })
    expect(res.status).toBe(201)
    expect(res.body.nome).toBe('Item Teste')
    itemId = res.body.id
  })

  it('deve listar cardápio com categorias e itens', async () => {
    const res = await request(app)
      .get('/api/cardapio')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    const cat = res.body.find((c: { id: string }) => c.id === categoriaId)
    expect(cat).toBeTruthy()
    expect(cat.itens.length).toBeGreaterThanOrEqual(1)
  })
})
