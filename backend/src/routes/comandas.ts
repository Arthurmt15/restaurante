import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { authorizeRoles } from '../middlewares/authorize'
import { addSSEClient, broadcastToTenant } from '../lib/sse'
import { logAtividadeGarcom } from '../lib/logger'

const router = Router()

const TAXA_SERVICO = 0.1

// Erro de regra de negócio disparado dentro de transações,
// mapeado para uma resposta HTTP específica no catch da rota
class HttpError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message)
  }
}

// Trata erros lançados dentro de $transaction e preserva o comportamento
// de erro do Express para falhas inesperadas
function responderErro(res: Response, err: unknown): void {
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({ error: err.message })
    return
  }
  throw err
}

// Recalcula subtotal/taxa/total da comanda usando o cliente informado
// (prisma fora de transação ou tx dentro de $transaction). Retorna o total.
async function recalcularTotal(db: Prisma.TransactionClient, comandaId: string) {
  const comanda = await db.comanda.findUnique({ where: { id: comandaId } });
  const agg = await db.itemComanda.aggregate({
    where: { comandaId },
    _sum: { precoUnit: true },
  })

  const subtotal = agg._sum.precoUnit ?? 0
  const taxaServico = Math.round(subtotal * TAXA_SERVICO * 100) / 100
  const desconto = comanda?.desconto || 0
  const total = Math.max(0, subtotal + taxaServico - desconto)

  await db.comanda.update({
    where: { id: comandaId },
    data: { subtotal, taxaServico, total },
  })

  return total
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

// Endpoint para SSE: Clientes e Admins se conectam aqui para receber notificações
router.get('/stream', authorizeRoles('SUPERADMIN', 'CLIENTE'), (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  addSSEClient(tenantId, res)
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
  let { mesaId, garcomId } = schema.parse(req.body)

  if (req.user!.role === 'GARCOM') {
    garcomId = req.user!.garcomId
  }

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

  // Cria a comanda e ocupa a mesa atomicamente
  const [comanda] = await prisma.$transaction([
    prisma.comanda.create({
      data: { mesaId, garcomId: garcomId ?? null, tenantId },
      include: { mesa: true, garcom: true },
    }),
    prisma.mesa.update({
      where: { id: mesaId },
      data: { status: 'OCUPADA' },
    }),
  ])

  if (comanda.garcom) {
    await logAtividadeGarcom({
      garcomId: comanda.garcom.id,
      garcomNome: comanda.garcom.nome,
      acao: 'ABRIU_MESA',
      detalhes: 'Abriu a mesa',
      mesaNumero: comanda.mesa.numero,
      tenantId
    })
  }

  res.status(201).json(comanda)
})

// Adiciona um item à comanda do tenant, baixa estoque e registra movimentação
router.post('/:id/itens', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const schema = z.object({
    itemId: z.string().uuid(),
    quantidade: z.number().int().positive().default(1),
    observacao: z.string().optional(),
    acrescimo: z.number().min(0).default(0),
  })
  const { itemId, quantidade, observacao, acrescimo } = schema.parse(req.body)

  const comanda = await prisma.comanda.findFirst({ where: { id: req.params.id, tenantId } })
  if (!comanda) return res.status(404).json({ error: 'Comanda não encontrada' })
  if (comanda.status !== 'ABERTA') return res.status(400).json({ error: 'Comanda não está aberta' })

  // Restrição: Garçom só pode adicionar pedido na sua própria comanda
  if (req.user!.role === 'GARCOM' && comanda.garcomId !== req.user!.garcomId) {
    return res.status(403).json({ error: 'Você só pode adicionar pedidos nas suas próprias comandas' })
  }

  // Verificar que o item pertence ao tenant
  const item = await prisma.itemCardapio.findFirst({
    where: { id: itemId, tenantId },
    include: { categoria: true },
  })
  if (!item) return res.status(404).json({ error: 'Item não encontrado neste ambiente' })

  try {
    await prisma.$transaction(async (tx) => {
      // Revalida o item dentro da transação para evitar corrida no estoque
      const fresh = await tx.itemCardapio.findFirst({
        where: { id: itemId, tenantId },
        include: { categoria: true },
      })
      if (!fresh) throw new HttpError(404, 'Item não encontrado neste ambiente')

      if (fresh.controlaEstoque && fresh.estoqueAtual < quantidade) {
        throw new HttpError(400, `Estoque insuficiente. Disponível: ${fresh.estoqueAtual}`)
      }

      await tx.itemComanda.create({
        data: {
          comandaId: req.params.id,
          itemId,
          quantidade,
          precoUnit: item.preco * quantidade + acrescimo,
          observacao,
          acrescimo,
        },
      })

      if (fresh.controlaEstoque) {
        await tx.itemCardapio.update({
          where: { id: itemId },
          data: { estoqueAtual: { decrement: quantidade } },
        })

        await tx.movimentoEstoque.create({
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

      await recalcularTotal(tx, req.params.id)
    })
  } catch (err) {
    return responderErro(res, err)
  }

  const comandaAtualizada = await prisma.comanda.findUnique({
    where: { id: req.params.id },
    include: {
      mesa: true,
      garcom: true,
      itens: { include: { item: { include: { categoria: true } } } },
    },
  })

  // Disparar notificação em tempo real e log
  if (comandaAtualizada) {
    const mesaNome = comandaAtualizada.mesa?.numero ? `Mesa ${comandaAtualizada.mesa.numero}` : 'Comanda Balcão'
    const garcomNome = comandaAtualizada.garcom?.nome || 'Sistema'
    broadcastToTenant(tenantId, 'novo_pedido', {
      comandaId: comandaAtualizada.id,
      mesa: mesaNome,
      garcom: garcomNome,
      item: item.nome,
      quantidade
    })

    if (comandaAtualizada.garcom) {
      await logAtividadeGarcom({
        garcomId: comandaAtualizada.garcom.id,
        garcomNome: comandaAtualizada.garcom.nome,
        acao: 'ADICIONOU_ITEM',
        detalhes: `Adicionou ${quantidade}x ${item.nome}`,
        mesaNumero: comandaAtualizada.mesa!.numero,
        tenantId
      })
    }
  }

  res.status(201).json(comandaAtualizada)
})

// Fecha uma comanda do tenant com um ou mais métodos de pagamento
router.patch('/:id/fechar', authorizeRoles('SUPERADMIN', 'CLIENTE', 'GARCOM'), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const schema = z.object({
    pagamentos: z.array(z.object({
      forma: z.string().min(1),
      valor: z.number().positive(),
    })),
    desconto: z.number().min(0).optional(),
  })
  const { pagamentos, desconto } = schema.parse(req.body)

  const comanda = await prisma.comanda.findFirst({
    where: { id: req.params.id, tenantId },
    include: { pagamentos: true, mesa: true, garcom: true },
  })
  if (!comanda) return res.status(404).json({ error: 'Comanda não encontrada' })
  if (comanda.status !== 'ABERTA') return res.status(400).json({ error: 'Comanda já está fechada' })

  // Restrição: Garçom só pode fechar a sua própria comanda
  if (req.user!.role === 'GARCOM' && comanda.garcomId !== req.user!.garcomId) {
    return res.status(403).json({ error: 'Você só pode fechar as suas próprias comandas' })
  }

  // Aplica desconto, fecha comanda, registra pagamentos e libera a mesa atomicamente
  try {
    await prisma.$transaction(async (tx) => {
      let totalAtual = comanda.total

      if (desconto !== undefined) {
        await tx.comanda.update({
          where: { id: req.params.id },
          data: { desconto },
        })
        totalAtual = (await recalcularTotal(tx, req.params.id)) ?? 0
      }

      const jaPago = comanda.pagamentos.reduce((acc, p) => acc + p.valor, 0)
      const restante = totalAtual - jaPago

      if (restante > 0) {
        if (pagamentos.length === 0) {
          throw new HttpError(400, 'Adicione ao menos um método de pagamento')
        }
        const totalPagoNovo = pagamentos.reduce((acc, p) => acc + p.valor, 0)
        if (Math.abs(totalPagoNovo - restante) > 0.01) {
          throw new HttpError(400, `Valor a pagar (R$ ${restante.toFixed(2)}) não corresponde ao total informado (R$ ${totalPagoNovo.toFixed(2)})`)
        }
      }

      await tx.comanda.update({
        where: { id: req.params.id },
        data: { status: 'FECHADA' },
      })

      for (const p of pagamentos) {
        await tx.pagamento.create({
          data: { comandaId: req.params.id, forma: p.forma, valor: p.valor },
        })
      }

      const outrasAbertas = await tx.comanda.count({
        where: { mesaId: comanda.mesaId, status: 'ABERTA', tenantId, id: { not: req.params.id } },
      })
      if (outrasAbertas === 0) {
        await tx.mesa.update({
          where: { id: comanda.mesaId },
          data: { status: 'LIVRE' },
        })
      }
    })
  } catch (err) {
    return responderErro(res, err)
  }

  // Notificar encerramento da comanda
  const mesaNome = comanda.mesa?.numero ? `Mesa ${comanda.mesa.numero}` : 'Comanda Balcão'
  const garcomNome = comanda.garcom?.nome || 'Sistema'
  broadcastToTenant(tenantId, 'comanda_fechada', {
    comandaId: comanda.id,
    mesa: mesaNome,
    garcom: garcomNome,
    total: comanda.total
  })

  if (comanda.garcom) {
    await logAtividadeGarcom({
      garcomId: comanda.garcom.id,
      garcomNome: comanda.garcom.nome,
      acao: 'FECHOU_COMANDA',
      detalhes: `Fechou comanda no valor de R$ ${comanda.total.toFixed(2)}`,
      mesaNumero: comanda.mesa!.numero,
      tenantId
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

// Ajusta o acréscimo (valor extra) de um item da comanda — altera o total cobrado
router.patch('/:comandaId/itens/:itemId', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const schema = z.object({
    acrescimo: z.number().min(0),
  })
  const { acrescimo } = schema.parse(req.body)

  const comanda = await prisma.comanda.findFirst({ where: { id: req.params.comandaId, tenantId } })
  if (!comanda) return res.status(404).json({ error: 'Comanda não encontrada' })
  if (comanda.status !== 'ABERTA') return res.status(400).json({ error: 'Comanda não está aberta' })

  // Restrição: Garçom só pode ajustar itens da sua própria comanda
  if (req.user!.role === 'GARCOM' && comanda.garcomId !== req.user!.garcomId) {
    return res.status(403).json({ error: 'Você só pode ajustar itens nas suas próprias comandas' })
  }

  const itemComanda = await prisma.itemComanda.findFirst({
    where: { id: req.params.itemId, comandaId: req.params.comandaId },
    include: { item: true },
  })
  if (!itemComanda) return res.status(404).json({ error: 'Item não encontrado na comanda' })

  const precoUnit = itemComanda.item.preco * itemComanda.quantidade + acrescimo

  if (comanda.garcomId) {
    const garcom = await prisma.garcom.findUnique({ where: { id: comanda.garcomId } })
    const mesa = await prisma.mesa.findUnique({ where: { id: comanda.mesaId } })
    if (garcom) {
      await logAtividadeGarcom({
        garcomId: garcom.id,
        garcomNome: garcom.nome,
        acao: 'AJUSTOU_ITEM',
        detalhes: `Ajustou o valor de ${itemComanda.item.nome} (acréscimo R$ ${acrescimo.toFixed(2)})`,
        mesaNumero: mesa?.numero ?? 0,
        tenantId
      })
    }
  }

  // Atualiza o acréscimo e recalcula o total atomicamente
  try {
    await prisma.$transaction(async (tx) => {
      await tx.itemComanda.update({
        where: { id: req.params.itemId },
        data: { acrescimo, precoUnit },
      })
      await recalcularTotal(tx, req.params.comandaId)
    })
  } catch (err) {
    return responderErro(res, err)
  }

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

// Remove um item da comanda (requer código de autorização no header
// x-codigo-exclusao, evitando vazamento do código em logs de URL), restaura estoque
router.delete('/:comandaId/itens/:itemId', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const codigo = (req.headers['x-codigo-exclusao'] as string | undefined)?.trim()
  const config = await prisma.configuracoes.findUnique({ where: { tenantId } })

  if (!config?.codigoExclusao) {
    return res.status(400).json({ error: 'Código de exclusão não configurado. Configure em Configurações.' })
  }

  if (!codigo || codigo !== config.codigoExclusao) {
    return res.status(401).json({ error: 'Código de autorização inválido' })
  }

  // Verificar que a comanda pertence ao tenant
  const comanda = await prisma.comanda.findFirst({ where: { id: req.params.comandaId, tenantId } })
  if (!comanda) return res.status(404).json({ error: 'Comanda não encontrada' })

  const itemComanda = await prisma.itemComanda.findFirst({
    where: { id: req.params.itemId, comandaId: req.params.comandaId },
    include: { item: true },
  })
  if (!itemComanda) return res.status(404).json({ error: 'Item não encontrado na comanda' })

  // Restaura estoque, registra estorno e remove o item atomicamente
  try {
    await prisma.$transaction(async (tx) => {
      if (itemComanda.item.controlaEstoque) {
        await tx.itemCardapio.update({
          where: { id: itemComanda.itemId },
          data: { estoqueAtual: { increment: itemComanda.quantidade } },
        })

        await tx.movimentoEstoque.create({
          data: {
            itemId: itemComanda.itemId,
            tipo: 'ENTRADA',
            quantidade: itemComanda.quantidade,
            motivo: 'estorno',
            comandaId: req.params.comandaId,
            tenantId,
          },
        })
      }

      await tx.itemComanda.delete({ where: { id: req.params.itemId } })

      await recalcularTotal(tx, req.params.comandaId)
    })
  } catch (err) {
    return responderErro(res, err)
  }

  const updated = await prisma.comanda.findUnique({
    where: { id: req.params.comandaId },
    include: {
      mesa: true,
      garcom: true,
      itens: { include: { item: { include: { categoria: true } } } },
      pagamentos: true,
    },
  })

  if (updated?.garcom) {
    await logAtividadeGarcom({
      garcomId: updated.garcom.id,
      garcomNome: updated.garcom.nome,
      acao: 'REMOVEU_ITEM',
      detalhes: 'Removeu item da comanda (código autorizado)',
      mesaNumero: updated.mesa!.numero,
      tenantId
    })
  }

  res.json(updated)
})

// Reabre uma comanda fechada do tenant
router.patch('/:id/reabrir', authorizeRoles('SUPERADMIN', 'CLIENTE'), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId
  const comanda = await prisma.comanda.findFirst({ where: { id: req.params.id, tenantId } })
  if (!comanda) return res.status(404).json({ error: 'Comanda não encontrada' })
  if (comanda.status !== 'FECHADA') return res.status(400).json({ error: 'Comanda não está fechada' })

  // Reabre a comanda e ocupa a mesa atomicamente
  await prisma.$transaction([
    prisma.comanda.update({
      where: { id: req.params.id },
      data: { status: 'ABERTA' },
    }),
    prisma.mesa.update({
      where: { id: comanda.mesaId },
      data: { status: 'OCUPADA' },
    }),
  ])

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
