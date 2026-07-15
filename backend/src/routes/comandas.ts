import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { z } from 'zod'

const router = Router()

const TAXA_SERVICO = 0.1
const EXCLUSAO_CODIGO = process.env.EXCLUSAO_CODIGO || '1234'

// Recalcula subtotal, taxa de serviço e total de uma comanda
async function recalcularTotal(comandaId: string) {
  const agg = await prisma.itemComanda.aggregate({
    where: { comandaId },
    _sum: { precoUnit: true },
  })

  const subtotal = agg._sum.precoUnit ?? 0
  const taxaServico = Math.round(subtotal * TAXA_SERVICO * 100) / 100
  const total = subtotal + taxaServico

  await prisma.comanda.update({
    where: { id: comandaId },
    data: { subtotal, taxaServico, total },
  })
}

// Lista todas as comandas, com filtro opcional por status
router.get('/', async (req: Request, res: Response) => {
  const { status } = req.query
  const where = status ? { status: String(status) } : {}
  const comandas = await prisma.comanda.findMany({
    where,
    include: {
      mesa: true,
      garcom: true,
      itens: { include: { item: { include: { categoria: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  })
  res.json(comandas)
})

// Busca uma comanda pelo ID com todos os relacionamentos
router.get('/:id', async (req: Request, res: Response) => {
  const comanda = await prisma.comanda.findUnique({
    where: { id: req.params.id },
    include: {
      mesa: true,
      garcom: true,
      itens: { include: { item: { include: { categoria: true } } } },
    },
  })
  if (!comanda) return res.status(404).json({ error: 'Comanda não encontrada' })
  res.json(comanda)
})

// Abre uma nova comanda para uma mesa (impede duplicidade)
router.post('/', async (req: Request, res: Response) => {
  const schema = z.object({
    mesaId: z.string().uuid(),
    garcomId: z.string().uuid().optional(),
  })
  const { mesaId, garcomId } = schema.parse(req.body)

  const aberta = await prisma.comanda.findFirst({
    where: { mesaId, status: 'ABERTA' },
  })
  if (aberta) return res.status(400).json({ error: 'Mesa já possui comanda aberta' })

  const comanda = await prisma.comanda.create({
    data: { mesaId, garcomId: garcomId ?? null },
    include: { mesa: true, garcom: true },
  })
  res.status(201).json(comanda)
})

// Adiciona um item à comanda, baixa estoque e registra movimentação
router.post('/:id/itens', async (req: Request, res: Response) => {
  const schema = z.object({
    itemId: z.string().uuid(),
    quantidade: z.number().int().positive().default(1),
    observacao: z.string().optional(),
  })
  const { itemId, quantidade, observacao } = schema.parse(req.body)

  const comanda = await prisma.comanda.findUnique({ where: { id: req.params.id } })
  if (!comanda) return res.status(404).json({ error: 'Comanda não encontrada' })
  if (comanda.status !== 'ABERTA') return res.status(400).json({ error: 'Comanda não está aberta' })

  const item = await prisma.itemCardapio.findUnique({ where: { id: itemId } })
  if (!item) return res.status(404).json({ error: 'Item não encontrado' })
  if (item.estoqueAtual < quantidade) {
    return res.status(400).json({ error: `Estoque insuficiente. Disponível: ${item.estoqueAtual}` })
  }

  await prisma.itemComanda.create({
    data: {
      comandaId: req.params.id,
      itemId,
      quantidade,
      precoUnit: item.preco * quantidade,
      observacao,
    },
  })

  await prisma.itemCardapio.update({
    where: { id: itemId },
    data: { estoqueAtual: { decrement: quantidade } },
  })

  await prisma.movimentoEstoque.create({
    data: {
      itemId,
      tipo: 'SAIDA',
      quantidade,
      motivo: 'venda',
      comandaId: req.params.id,
    },
  })

  await recalcularTotal(req.params.id)

  const updated = await prisma.comanda.findUnique({
    where: { id: req.params.id },
    include: {
      mesa: true,
      garcom: true,
      itens: { include: { item: { include: { categoria: true } } } },
    },
  })
  res.status(201).json(updated)
})

// Fecha uma comanda aberta com a forma de pagamento
router.patch('/:id/fechar', async (req: Request, res: Response) => {
  const schema = z.object({ formaPagamento: z.string().min(1) })
  const { formaPagamento } = schema.parse(req.body)

  const comanda = await prisma.comanda.findUnique({ where: { id: req.params.id } })
  if (!comanda) return res.status(404).json({ error: 'Comanda não encontrada' })
  if (comanda.status !== 'ABERTA') return res.status(400).json({ error: 'Comanda já está fechada' })

  const updated = await prisma.comanda.update({
    where: { id: req.params.id },
    data: { status: 'FECHADA', formaPagamento },
    include: {
      mesa: true,
      garcom: true,
      itens: { include: { item: true } },
    },
  })
  res.json(updated)
})

// Remove um item da comanda (requer código de autorização), restaura estoque
router.delete('/:comandaId/itens/:itemId', async (req: Request, res: Response) => {
  const codigo = req.query.codigo as string
  if (!codigo || codigo !== EXCLUSAO_CODIGO) {
    return res.status(401).json({ error: 'Código de autorização inválido' })
  }

  const itemComanda = await prisma.itemComanda.findFirst({
    where: { id: req.params.itemId, comandaId: req.params.comandaId },
  })
  if (!itemComanda) return res.status(404).json({ error: 'Item não encontrado na comanda' })

  await prisma.itemCardapio.update({
    where: { id: itemComanda.itemId },
    data: { estoqueAtual: { increment: itemComanda.quantidade } },
  })

  await prisma.movimentoEstoque.create({
    data: {
      itemId: itemComanda.itemId,
      tipo: 'ENTRADA',
      quantidade: itemComanda.quantidade,
      motivo: 'estorno',
      comandaId: req.params.comandaId,
    },
  })

  await prisma.itemComanda.delete({ where: { id: req.params.itemId } })

  await recalcularTotal(req.params.comandaId)

  const updated = await prisma.comanda.findUnique({
    where: { id: req.params.comandaId },
    include: {
      mesa: true,
      garcom: true,
      itens: { include: { item: { include: { categoria: true } } } },
    },
  })
  res.json(updated)
})

export default router
