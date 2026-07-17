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

// Lista todas as comandas do tenant, com filtro opcional por status
router.get('/', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const { status } = req.query
  const where = status ? { status: String(status), tenantId } : { tenantId }

  const comandas = await prisma.comanda.findMany({
    where,
    include: {
      mesa: true,
      garcom: true,
      itens: { include: { item: { include: { categoria: true } } } },
      pagamentos: true,
    },
    orderBy: { createdAt: 'desc' },
  })
  res.json(comandas)
})

// Busca uma comanda pelo ID (verifica que pertence ao tenant)
router.get('/:id', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const comanda = await prisma.comanda.findFirst({
    where: { id: req.params.id, tenantId },
    include: {
      mesa: true,
      garcom: true,
      itens: { include: { item: { include: { categoria: true } } } },
      pagamentos: true,
    },
  })
  if (!comanda) return res.status(404).json({ error: 'Comanda não encontrada' })
  res.json(comanda)
})

// Abre uma nova comanda para uma mesa do tenant
router.post('/', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const schema = z.object({
    mesaId: z.string().uuid(),
    garcomId: z.string().uuid().optional(),
  })
  const { mesaId, garcomId } = schema.parse(req.body)

  // Verificar que a mesa pertence ao tenant
  const mesa = await prisma.mesa.findFirst({ where: { id: mesaId, tenantId } })
  if (!mesa) return res.status(404).json({ error: 'Mesa não encontrada neste ambiente' })

  const aberta = await prisma.comanda.findFirst({
    where: { mesaId, status: 'ABERTA', tenantId },
  })
  if (aberta) return res.status(400).json({ error: 'Mesa já possui comanda aberta' })

  // Verificar que o garçom (se informado) pertence ao tenant
  if (garcomId) {
    const garcom = await prisma.garcom.findFirst({ where: { id: garcomId, tenantId } })
    if (!garcom) return res.status(404).json({ error: 'Garçom não encontrado neste ambiente' })
  }

  const comanda = await prisma.comanda.create({
    data: { mesaId, garcomId: garcomId ?? null, tenantId },
    include: { mesa: true, garcom: true },
  })

  await prisma.mesa.update({
    where: { id: mesaId },
    data: { status: 'OCUPADA' },
  })

  res.status(201).json(comanda)
})

// Adiciona um item à comanda do tenant, baixa estoque e registra movimentação
router.post('/:id/itens', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const schema = z.object({
    itemId: z.string().uuid(),
    quantidade: z.number().int().positive().default(1),
    observacao: z.string().optional(),
  })
  const { itemId, quantidade, observacao } = schema.parse(req.body)

  const comanda = await prisma.comanda.findFirst({ where: { id: req.params.id, tenantId } })
  if (!comanda) return res.status(404).json({ error: 'Comanda não encontrada' })
  if (comanda.status !== 'ABERTA') return res.status(400).json({ error: 'Comanda não está aberta' })

  // Verificar que o item pertence ao tenant
  const item = await prisma.itemCardapio.findFirst({
    where: { id: itemId, tenantId },
    include: { categoria: true },
  })
  if (!item) return res.status(404).json({ error: 'Item não encontrado neste ambiente' })

  const controlaEstoque = item.categoria.nome === 'Bebidas'
  if (controlaEstoque && item.estoqueAtual < quantidade) {
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

  if (controlaEstoque) {
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
        tenantId,
      },
    })
  }

  await recalcularTotal(req.params.id)

  const updated = await prisma.comanda.findUnique({
    where: { id: req.params.id },
    include: {
      mesa: true,
      garcom: true,
      itens: { include: { item: { include: { categoria: true } } } },
      pagamentos: true,
    },
  })
  res.status(201).json(updated)
})

// Fecha uma comanda do tenant com um ou mais métodos de pagamento
router.patch('/:id/fechar', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const schema = z.object({
    pagamentos: z.array(z.object({
      forma: z.string().min(1),
      valor: z.number().positive(),
    })),
  })
  const { pagamentos } = schema.parse(req.body)

  const comanda = await prisma.comanda.findFirst({
    where: { id: req.params.id, tenantId },
    include: { pagamentos: true },
  })
  if (!comanda) return res.status(404).json({ error: 'Comanda não encontrada' })
  if (comanda.status !== 'ABERTA') return res.status(400).json({ error: 'Comanda já está fechada' })

  const jaPago = comanda.pagamentos.reduce((acc, p) => acc + p.valor, 0)
  const restante = comanda.total - jaPago

  if (restante > 0) {
    if (pagamentos.length === 0) {
      return res.status(400).json({ error: 'Adicione ao menos um método de pagamento' })
    }
    const totalPagoNovo = pagamentos.reduce((acc, p) => acc + p.valor, 0)
    if (Math.abs(totalPagoNovo - restante) > 0.01) {
      return res.status(400).json({
        error: `Valor a pagar (R$ ${restante.toFixed(2)}) não corresponde ao total informado (R$ ${totalPagoNovo.toFixed(2)})`,
      })
    }
  }

  await prisma.comanda.update({
    where: { id: req.params.id },
    data: { status: 'FECHADA' },
  })

  for (const p of pagamentos) {
    await prisma.pagamento.create({
      data: { comandaId: req.params.id, forma: p.forma, valor: p.valor },
    })
  }

  const outrasAbertas = await prisma.comanda.count({
    where: { mesaId: comanda.mesaId, status: 'ABERTA', tenantId, id: { not: req.params.id } },
  })
  if (outrasAbertas === 0) {
    await prisma.mesa.update({
      where: { id: comanda.mesaId },
      data: { status: 'LIVRE' },
    })
  }

  const updated = await prisma.comanda.findUnique({
    where: { id: req.params.id },
    include: {
      mesa: true,
      garcom: true,
      itens: { include: { item: true } },
      pagamentos: true,
    },
  })
  res.json(updated)
})

// Remove um item da comanda (requer código de autorização), restaura estoque
router.delete('/:comandaId/itens/:itemId', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const codigo = req.query.codigo as string
  if (!codigo || codigo !== EXCLUSAO_CODIGO) {
    return res.status(401).json({ error: 'Código de autorização inválido' })
  }

  // Verificar que a comanda pertence ao tenant
  const comanda = await prisma.comanda.findFirst({ where: { id: req.params.comandaId, tenantId } })
  if (!comanda) return res.status(404).json({ error: 'Comanda não encontrada' })

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
      tenantId,
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
      pagamentos: true,
    },
  })
  res.json(updated)
})

// Reabre uma comanda fechada do tenant
router.patch('/:id/reabrir', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const comanda = await prisma.comanda.findFirst({ where: { id: req.params.id, tenantId } })
  if (!comanda) return res.status(404).json({ error: 'Comanda não encontrada' })
  if (comanda.status !== 'FECHADA') return res.status(400).json({ error: 'Comanda não está fechada' })

  await prisma.comanda.update({
    where: { id: req.params.id },
    data: { status: 'ABERTA' },
  })

  await prisma.mesa.update({
    where: { id: comanda.mesaId },
    data: { status: 'OCUPADA' },
  })

  const updated = await prisma.comanda.findUnique({
    where: { id: req.params.id },
    include: {
      mesa: true,
      garcom: true,
      itens: { include: { item: { include: { categoria: true } } } },
      pagamentos: true,
    },
  })
  res.json(updated)
})

export default router
