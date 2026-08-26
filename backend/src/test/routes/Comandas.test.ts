import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import bcrypt from 'bcryptjs'
import app from '../../index'
import {
  Usuario,
  Garcom,
  Mesa,
  Categoria,
  ItemCardapio,
  Comanda,
  ItemComanda,
  Pagamento,
  MovimentoEstoque,
  Configuracoes,
} from '../../models'
import { createAuthToken } from '../helpers'

const TENANT = 'comandas-test-tenant'
const CODIGO_EXCLUSAO_PLAIN = '1234'

let tokenAdmin: string
let tokenGarcom: string
let garcomUserId: string
let garcomId: string
let mesaId: string
let mesa2Id: string
let categoriaId: string
let itemId: string
let comandaId: string

async function createBaseData() {
  const adminUser = await Usuario.create({
    email: `admin-${TENANT}@teste.com`,
    nome: 'Admin Test',
    senhaHash: 'hash',
    role: 'CLIENTE',
    status: 'ATIVO',
    tenantId: TENANT,
  })
  tokenAdmin = createAuthToken({ sub: adminUser._id.toString(), tenantId: TENANT })

  const garcom = await Garcom.create({ nome: 'Garcom Test', tenantId: TENANT })
  garcomId = garcom._id.toString()

  const garcomUser = await Usuario.create({
    email: `garcom-${TENANT}@teste.com`,
    nome: 'Garcom User',
    senhaHash: 'hash',
    role: 'GARCOM',
    status: 'ATIVO',
    tenantId: TENANT,
  })
  garcomUserId = garcomUser._id.toString()
  tokenGarcom = createAuthToken({
    sub: garcomUserId,
    role: 'GARCOM',
    tenantId: TENANT,
    garcomId,
  })

  const mesa = await Mesa.create({ numero: 100, tenantId: TENANT })
  mesaId = mesa._id.toString()

  const mesa2 = await Mesa.create({ numero: 101, tenantId: TENANT })
  mesa2Id = mesa2._id.toString()

  const cat = await Categoria.create({ nome: 'Bebidas', tenantId: TENANT })
  categoriaId = cat._id.toString()

  const item = await ItemCardapio.create({
    nome: 'Coca-Cola',
    preco: 12.0,
    controlaEstoque: true,
    estoqueAtual: 10,
    categoriaId,
    tenantId: TENANT,
  })
  itemId = item._id.toString()

  const hash = await bcrypt.hash(CODIGO_EXCLUSAO_PLAIN, 10)
  await Configuracoes.create({ tenantId: TENANT, codigoExclusao: hash })
}

async function cleanup() {
  await MovimentoEstoque.deleteMany({ tenantId: TENANT })
  const comandaIds = (await Comanda.find({ tenantId: TENANT }).select('_id')).map(c => c._id)
  await Pagamento.deleteMany({ comandaId: { $in: comandaIds } })
  await ItemComanda.deleteMany({ comandaId: { $in: comandaIds } })
  await Comanda.deleteMany({ tenantId: TENANT })
  await Mesa.deleteMany({ tenantId: TENANT })
  await ItemCardapio.deleteMany({ tenantId: TENANT })
  await Categoria.deleteMany({ tenantId: TENANT })
  await Garcom.deleteMany({ tenantId: TENANT })
  await Usuario.deleteMany({ tenantId: TENANT })
  await Configuracoes.deleteMany({ tenantId: TENANT })
}

beforeEach(async () => {
  await cleanup()
  await createBaseData()
})

afterEach(async () => {
  await cleanup()
})

describe('POST /api/comandas — Abrir comanda', () => {
  it('deve abrir uma comanda para uma mesa', async () => {
    const res = await request(app)
      .post('/api/comandas')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ mesaId })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id')
    expect(res.body.status).toBe('ABERTA')
    expect(res.body.mesaId).toBe(mesaId)
    comandaId = res.body.id
  })

  it('deve rejeitar abrir comanda para mesa com comanda aberta', async () => {
    await request(app)
      .post('/api/comandas')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ mesaId })

    const res = await request(app)
      .post('/api/comandas')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ mesaId })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Mesa já possui comanda aberta')
  })

  it('deve retornar 404 para mesa inexistente', async () => {
    const fakeMesaId = '00000000-0000-0000-0000-000000000000'
    const res = await request(app)
      .post('/api/comandas')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ mesaId: fakeMesaId })

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Mesa não encontrada neste ambiente')
  })

  it('deve abrir comanda com garçom vinculado', async () => {
    const res = await request(app)
      .post('/api/comandas')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ mesaId, garcomId })

    expect(res.status).toBe(201)
    expect(res.body.garcomId).toBe(garcomId)
    comandaId = res.body.id
  })

  it('deve retornar 401 sem token', async () => {
    const res = await request(app)
      .post('/api/comandas')
      .send({ mesaId })

    expect(res.status).toBe(401)
  })
})

describe('POST /api/comandas/:id/itens — Adicionar item', () => {
  async function openComanda(mesaOverride?: string) {
    const res = await request(app)
      .post('/api/comandas')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ mesaId: mesaOverride || mesaId })
    comandaId = res.body.id
    return res.body
  }

  it('deve adicionar item à comanda e baixar estoque', async () => {
    await openComanda()

    const res = await request(app)
      .post(`/api/comandas/${comandaId}/itens`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ itemId, quantidade: 2 })

    expect(res.status).toBe(201)
    expect(res.body.itens.length).toBe(1)
    expect(res.body.itens[0].quantidade).toBe(2)

    const itemDb = await ItemCardapio.findById(itemId)
    expect(itemDb!.estoqueAtual).toBe(8)
  })

  it('deve retornar 400 para comanda fechada', async () => {
    await openComanda()

    await request(app)
      .patch(`/api/comandas/${comandaId}/fechar`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ pagamentos: [{ forma: 'DINHEIRO', valor: 12 }], desconto: 0 })

    const res = await request(app)
      .post(`/api/comandas/${comandaId}/itens`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ itemId, quantidade: 1 })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Comanda não está aberta')
  })

  it('deve retornar 404 para item inexistente', async () => {
    await openComanda()
    const fakeItemId = '00000000-0000-0000-0000-000000000000'

    const res = await request(app)
      .post(`/api/comandas/${comandaId}/itens`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ itemId: fakeItemId, quantidade: 1 })

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Item não encontrado neste ambiente')
  })

  it('deve retornar 400 para estoque insuficiente', async () => {
    await openComanda()

    const res = await request(app)
      .post(`/api/comandas/${comandaId}/itens`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ itemId, quantidade: 999 })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/Estoque insuficiente/)
  })

  it('GARCOM deve retornar 403 ao adicionar item em comanda de outro garçom', async () => {
    const comanda = await openComanda()

    const res = await request(app)
      .post(`/api/comandas/${comanda.id}/itens`)
      .set('Authorization', `Bearer ${tokenGarcom}`)
      .send({ itemId, quantidade: 1 })

    expect(res.status).toBe(403)
    expect(res.body.error).toMatch(/próprias comandas/)
  })

  it('GARCOM deve conseguir adicionar item na própria comanda', async () => {
    const res = await request(app)
      .post('/api/comandas')
      .set('Authorization', `Bearer ${tokenGarcom}`)
      .send({ mesaId })
    comandaId = res.body.id

    const resItem = await request(app)
      .post(`/api/comandas/${comandaId}/itens`)
      .set('Authorization', `Bearer ${tokenGarcom}`)
      .send({ itemId, quantidade: 1 })

    expect(resItem.status).toBe(201)
    expect(resItem.body.itens.length).toBe(1)
  })

  it('deve retornar 401 sem token', async () => {
    await openComanda()
    const res = await request(app)
      .post(`/api/comandas/${comandaId}/itens`)
      .send({ itemId, quantidade: 1 })

    expect(res.status).toBe(401)
  })
})

describe('PATCH /api/comandas/:id/fechar — Fechar comanda', () => {
  async function openAndGetTotal(mesaOverride?: string) {
    const res = await request(app)
      .post('/api/comandas')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ mesaId: mesaOverride || mesaId })
    comandaId = res.body.id
    return res.body
  }

  it('deve fechar comanda com pagamento correto', async () => {
    await openAndGetTotal()

    await request(app)
      .post(`/api/comandas/${comandaId}/itens`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ itemId, quantidade: 1 })

    const comanda = await Comanda.findById(comandaId)

    const res = await request(app)
      .patch(`/api/comandas/${comandaId}/fechar`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ pagamentos: [{ forma: 'DINHEIRO', valor: comanda!.total }], desconto: 0 })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('FECHADA')
    expect(res.body.pagamentos.length).toBe(1)
  })

  it('deve retornar 400 para pagamento insuficiente', async () => {
    await openAndGetTotal()

    await request(app)
      .post(`/api/comandas/${comandaId}/itens`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ itemId, quantidade: 1 })

    const res = await request(app)
      .patch(`/api/comandas/${comandaId}/fechar`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ pagamentos: [{ forma: 'DINHEIRO', valor: 1.0 }], desconto: 0 })

    expect(res.status).toBe(400)
  })

  it('deve retornar 400 ao fechar comanda já fechada', async () => {
    await openAndGetTotal()

    await request(app)
      .post(`/api/comandas/${comandaId}/itens`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ itemId, quantidade: 1 })

    const comanda = await Comanda.findById(comandaId)

    await request(app)
      .patch(`/api/comandas/${comandaId}/fechar`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ pagamentos: [{ forma: 'DINHEIRO', valor: comanda!.total }], desconto: 0 })

    const res = await request(app)
      .patch(`/api/comandas/${comandaId}/fechar`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ pagamentos: [{ forma: 'DINHEIRO', valor: comanda!.total }], desconto: 0 })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Comanda já está fechada')
  })

  it('deve retornar 401 sem token', async () => {
    await openAndGetTotal()
    const res = await request(app)
      .patch(`/api/comandas/${comandaId}/fechar`)
      .send({ pagamentos: [{ forma: 'DINHEIRO', valor: 0 }] })

    expect(res.status).toBe(401)
  })
})

describe('DELETE /api/comandas/:comandaId/itens/:itemId — Remover item', () => {
  let itemComandaId: string

  async function setupWithItem() {
    const comanda = await request(app)
      .post('/api/comandas')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ mesaId })
    comandaId = comanda.body.id

    const itemRes = await request(app)
      .post(`/api/comandas/${comandaId}/itens`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ itemId, quantidade: 3 })
    itemComandaId = itemRes.body.itens[0].id
  }

  it('deve remover item com código válido e restaurar estoque', async () => {
    await setupWithItem()

    const res = await request(app)
      .delete(`/api/comandas/${comandaId}/itens/${itemComandaId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .set('x-codigo-exclusao', CODIGO_EXCLUSAO_PLAIN)

    expect(res.status).toBe(200)
    expect(res.body.itens.length).toBe(0)

    const itemDb = await ItemCardapio.findById(itemId)
    expect(itemDb!.estoqueAtual).toBe(10)
  })

  it('deve retornar 401 com código inválido', async () => {
    await setupWithItem()

    const res = await request(app)
      .delete(`/api/comandas/${comandaId}/itens/${itemComandaId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .set('x-codigo-exclusao', 'WRONG')

    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/inválido/)
  })

  it('deve retornar 401 sem header de código', async () => {
    await setupWithItem()

    const res = await request(app)
      .delete(`/api/comandas/${comandaId}/itens/${itemComandaId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)

    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/inválido/)
  })

  it('deve retornar 404 para itemComanda inexistente', async () => {
    await setupWithItem()
    const fakeId = '00000000-0000-0000-0000-000000000000'

    const res = await request(app)
      .delete(`/api/comandas/${comandaId}/itens/${fakeId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .set('x-codigo-exclusao', CODIGO_EXCLUSAO_PLAIN)

    expect(res.status).toBe(404)
  })
})

describe('PATCH /api/comandas/:id/reabrir — Reabrir comanda', () => {
  async function openAndClose() {
    const res = await request(app)
      .post('/api/comandas')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ mesaId })
    comandaId = res.body.id

    await request(app)
      .post(`/api/comandas/${comandaId}/itens`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ itemId, quantidade: 1 })

    const comanda = await Comanda.findById(comandaId)

    await request(app)
      .patch(`/api/comandas/${comandaId}/fechar`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ pagamentos: [{ forma: 'DINHEIRO', valor: comanda!.total }], desconto: 0 })
  }

  it('deve reabrir comanda fechada', async () => {
    await openAndClose()

    const res = await request(app)
      .patch(`/api/comandas/${comandaId}/reabrir`)
      .set('Authorization', `Bearer ${tokenAdmin}`)

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ABERTA')
  })

  it('deve retornar 400 ao reabrir comanda já aberta', async () => {
    const resOpen = await request(app)
      .post('/api/comandas')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ mesaId })
    comandaId = resOpen.body.id

    const res = await request(app)
      .patch(`/api/comandas/${comandaId}/reabrir`)
      .set('Authorization', `Bearer ${tokenAdmin}`)

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Comanda não está fechada')
  })

  it('deve retornar 401 sem token', async () => {
    await openAndClose()
    const res = await request(app)
      .patch(`/api/comandas/${comandaId}/reabrir`)

    expect(res.status).toBe(401)
  })
})

describe('GET /api/comandas — Listar comandas', () => {
  it('deve listar comandas com paginação', async () => {
    await request(app)
      .post('/api/comandas')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ mesaId })

    const res = await request(app)
      .get('/api/comandas')
      .set('Authorization', `Bearer ${tokenAdmin}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('comandas')
    expect(res.body).toHaveProperty('paginacao')
    expect(Array.isArray(res.body.comandas)).toBe(true)
    expect(res.body.comandas.length).toBeGreaterThanOrEqual(1)
    expect(res.body.paginacao).toHaveProperty('total')
    expect(res.body.paginacao).toHaveProperty('pagina')
    expect(res.body.paginacao).toHaveProperty('limite')
    expect(res.body.paginacao).toHaveProperty('totalPaginas')
  })

  it('deve filtrar comandas por status', async () => {
    await request(app)
      .post('/api/comandas')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ mesaId })

    const res = await request(app)
      .get('/api/comandas?status=ABERTA')
      .set('Authorization', `Bearer ${tokenAdmin}`)

    expect(res.status).toBe(200)
    expect(res.body.comandas.every((c: { status: string }) => c.status === 'ABERTA')).toBe(true)
  })

  it('deve retornar 401 sem token', async () => {
    const res = await request(app).get('/api/comandas')
    expect(res.status).toBe(401)
  })
})

describe('GET /api/comandas/:id — Buscar comanda por ID', () => {
  it('deve buscar comanda por id', async () => {
    const created = await request(app)
      .post('/api/comandas')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ mesaId })
    comandaId = created.body.id

    const res = await request(app)
      .get(`/api/comandas/${comandaId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)

    expect(res.status).toBe(200)
    expect(res.body.id).toBe(comandaId)
    expect(res.body).toHaveProperty('mesa')
    expect(res.body).toHaveProperty('itens')
    expect(res.body).toHaveProperty('pagamentos')
  })

  it('deve retornar 404 para comanda inexistente', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000'
    const res = await request(app)
      .get(`/api/comandas/${fakeId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Comanda não encontrada')
  })
})

describe('PATCH /api/comandas/:comandaId/itens/:itemId — Ajustar acréscimo', () => {
  let itemComandaId: string

  it('deve ajustar acréscimo de um item', async () => {
    const created = await request(app)
      .post('/api/comandas')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ mesaId })
    comandaId = created.body.id

    const itemRes = await request(app)
      .post(`/api/comandas/${comandaId}/itens`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ itemId, quantidade: 1 })
    itemComandaId = itemRes.body.itens[0].id

    const res = await request(app)
      .patch(`/api/comandas/${comandaId}/itens/${itemComandaId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ acrescimo: 5.0 })

    expect(res.status).toBe(200)
    const updated = res.body.itens.find((i: { id: string }) => i.id === itemComandaId)
    expect(updated.acrescimo).toBe(5.0)
  })
})
