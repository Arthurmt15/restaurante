import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import bcrypt from 'bcryptjs'
import app from '../../index'
import { Usuario, RefreshToken } from '../../models'
import { createAuthToken } from '../helpers'

let adminToken: string
let adminId: string
let clienteToken: string
let clienteId: string

beforeAll(async () => {
  const hash = await bcrypt.hash('12345678', 12)
  const admin = await Usuario.create({
    email: 'admin-test@teste.com',
    nome: 'Admin Test',
    senhaHash: hash,
    role: 'SUPERADMIN',
    status: 'ATIVO',
    tenantId: '',
  })
  adminId = admin._id.toString()
  await Usuario.updateOne({ _id: admin._id }, { $set: { tenantId: admin._id } })
  adminToken = createAuthToken({ sub: adminId, role: 'SUPERADMIN', tenantId: adminId })

  const cliente = await Usuario.create({
    email: 'cliente-test@teste.com',
    nome: 'Cliente Test',
    senhaHash: hash,
    role: 'CLIENTE',
    status: 'ATIVO',
    tenantId: '',
  })
  clienteId = cliente._id.toString()
  await Usuario.updateOne({ _id: cliente._id }, { $set: { tenantId: cliente._id } })
  clienteToken = createAuthToken({ sub: clienteId, role: 'CLIENTE', tenantId: clienteId })
})

afterAll(async () => {
  await RefreshToken.deleteMany({ usuarioId: { $in: [adminId, clienteId] } })
  await Usuario.deleteMany({ _id: { $in: [adminId, clienteId] } })
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
