import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import bcrypt from 'bcryptjs'
import app from '../../index'
import { prisma } from '../../lib/prisma'
import { createAuthToken } from '../helpers'

let adminToken: string
let adminId: string
let clienteToken: string
let clienteId: string

beforeAll(async () => {
  const hash = await bcrypt.hash('12345678', 12)
  const admin = await prisma.usuario.create({
    data: {
      email: 'admin-test@teste.com',
      nome: 'Admin Test',
      senhaHash: hash,
      role: 'SUPERADMIN',
      status: 'ATIVO',
      tenantId: '',
    },
  })
  adminId = admin.id
  await prisma.usuario.update({ where: { id: admin.id }, data: { tenantId: admin.id } })
  adminToken = createAuthToken({ sub: admin.id, role: 'SUPERADMIN', tenantId: admin.id })

  const cliente = await prisma.usuario.create({
    data: {
      email: 'cliente-test@teste.com',
      nome: 'Cliente Test',
      senhaHash: hash,
      role: 'CLIENTE',
      status: 'ATIVO',
      tenantId: '',
    },
  })
  clienteId = cliente.id
  await prisma.usuario.update({ where: { id: cliente.id }, data: { tenantId: cliente.id } })
  clienteToken = createAuthToken({ sub: cliente.id, role: 'CLIENTE', tenantId: cliente.id })
})

afterAll(async () => {
  await prisma.refreshToken.deleteMany({ where: { usuarioId: { in: [adminId, clienteId] } } })
  await prisma.usuario.deleteMany({ where: { id: { in: [adminId, clienteId] } } })
})

describe('GET /api/admin/usuarios', () => {
  it('deve listar usuários (admin)', async () => {
    const res = await request(app)
      .get('/api/admin/usuarios')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('usuarios')
    expect(res.body).toHaveProperty('paginacao')
  })

  it('deve bloquear cliente', async () => {
    const res = await request(app)
      .get('/api/admin/usuarios')
      .set('Authorization', `Bearer ${clienteToken}`)
    expect(res.status).toBe(403)
  })
})

describe('POST /api/admin/usuarios/:id/vincular', () => {
  it('deve vincular cliente ao tenant do admin', async () => {
    const res = await request(app)
      .post(`/api/admin/usuarios/${clienteId}/vincular`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ tenantId: adminId })
    expect(res.status).toBe(200)
    expect(res.body.tenantId).toBe(adminId)
  })
})

describe('POST /api/admin/usuarios/:id/desvincular', () => {
  it('deve restaurar tenant próprio', async () => {
    const res = await request(app)
      .post(`/api/admin/usuarios/${clienteId}/desvincular`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.tenantId).toBe(clienteId)
  })
})
