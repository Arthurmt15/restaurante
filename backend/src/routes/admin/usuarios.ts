import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'

const router = Router()

// ─── Schemas de validação ────────────────────────────────────────────────────

const criarUsuarioSchema = z.object({
  email: z.string().min(3, 'Email/Usuário deve ter ao menos 3 caracteres'),
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  senha: z.string().min(8, 'Senha deve ter ao menos 8 caracteres'),
  role: z.enum(['SUPERADMIN', 'CLIENTE', 'GARCOM']).default('CLIENTE'),
  status: z.enum(['ATIVO', 'SUSPENSO', 'INADIMPLENTE']).default('ATIVO'),
  tenantId: z.string().optional(), // tenant do restaurante ao qual o garçom pertence
})

const editarUsuarioSchema = z.object({
  email: z.string().min(3, 'Email/Usuário deve ter ao menos 3 caracteres').optional(),
  nome: z.string().min(2).optional(),
  role: z.enum(['SUPERADMIN', 'CLIENTE', 'GARCOM']).optional(),
  status: z.enum(['ATIVO', 'SUSPENSO', 'INADIMPLENTE']).optional(),
  tenantId: z.string().optional(),
})

const statusSchema = z.object({
  status: z.enum(['ATIVO', 'SUSPENSO', 'INADIMPLENTE']),
})

const resetSenhaSchema = z.object({
  novaSenha: z.string().min(8, 'Senha deve ter ao menos 8 caracteres'),
})

// ─── GET /api/admin/usuarios ──────────────────────────────────────────────────
// Listagem paginada com busca e filtros

router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      busca = '',
      status,
      role,
      pagina = '1',
      limite = '20',
    } = req.query

    const page = Math.max(1, parseInt(String(pagina)))
    const pageSize = Math.min(100, Math.max(1, parseInt(String(limite))))
    const skip = (page - 1) * pageSize

    const where: Record<string, unknown> = {}

    // Filtro de busca por nome, email ou ID
    if (busca) {
      where.OR = [
        { nome: { contains: String(busca) } },
        { email: { contains: String(busca) } },
        { id: { contains: String(busca) } },
      ]
    }

    // Filtro de status
    if (status && ['ATIVO', 'SUSPENSO', 'INADIMPLENTE'].includes(String(status))) {
      where.status = String(status)
    }

    // Filtro de cargo
    if (role && ['SUPERADMIN', 'CLIENTE'].includes(String(role))) {
      where.role = String(role)
    }

    const [usuarios, total] = await Promise.all([
      prisma.usuario.findMany({
        where,
        skip,
        take: pageSize,
        select: {
          id: true,
          email: true,
          nome: true,
          role: true,
          status: true,
          ultimoLogin: true,
          createdAt: true,
          updatedAt: true,
          tenantId: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.usuario.count({ where }),
    ])

    return res.json({
      usuarios,
      paginacao: {
        total,
        pagina: page,
        limite: pageSize,
        totalPaginas: Math.ceil(total / pageSize),
      },
    })
  } catch (err) {
    console.error('[ADMIN] Erro ao listar usuários:', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// ─── POST /api/admin/usuarios ─────────────────────────────────────────────────
// Criar novo usuário

router.post('/', async (req: Request, res: Response) => {
  try {
    const dados = criarUsuarioSchema.parse(req.body)

    // Verificar duplicidade de email
    const existente = await prisma.usuario.findUnique({
      where: { email: dados.email.toLowerCase().trim() },
    })
    if (existente) {
      return res.status(409).json({ error: 'Este email já está cadastrado' })
    }

    const senhaHash = await bcrypt.hash(dados.senha, 12)

    const usuario = await prisma.usuario.create({
      data: {
        email: dados.email.toLowerCase().trim(),
        nome: dados.nome.trim(),
        senhaHash,
        role: dados.role,
        status: dados.status,
        ...(dados.tenantId ? { tenantId: dados.tenantId } : {}),
      },
      select: {
        id: true,
        email: true,
        nome: true,
        role: true,
        status: true,
        createdAt: true,
      },
    })

    // Se o role for GARCOM, criar automaticamente o registro de garçom vinculado
    if (dados.role === 'GARCOM') {
      await prisma.garcom.create({
        data: {
          nome: dados.nome.trim(),
          usuarioId: usuario.id,
          tenantId: dados.tenantId || '',
          ativo: true,
        },
      })
    }

    return res.status(201).json(usuario)
  } catch (err: unknown) {
    if (err instanceof Error && err.constructor.name === 'ZodError') {
      return res.status(400).json({ error: 'Dados inválidos', details: err.message })
    }
    console.error('[ADMIN] Erro ao criar usuário:', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// ─── GET /api/admin/usuarios/stats/resumo ─────────────────────────────────────
// Resumo agregado para o dashboard admin
// IMPORTANTE: deve vir ANTES de /:id para não ser capturada como parâmetro

router.get('/stats/resumo', async (_req: Request, res: Response) => {
  try {
    const [total, ativos, suspensos, inadimplentes] = await Promise.all([
      prisma.usuario.count(),
      prisma.usuario.count({ where: { status: 'ATIVO' } }),
      prisma.usuario.count({ where: { status: 'SUSPENSO' } }),
      prisma.usuario.count({ where: { status: 'INADIMPLENTE' } }),
    ])

    return res.json({ total, ativos, suspensos, inadimplentes })
  } catch (err) {
    console.error('[ADMIN] Erro ao buscar resumo:', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// ─── GET /api/admin/usuarios/:id ─────────────────────────────────────────────

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.params.id },
      select: {
          id: true,
          email: true,
          nome: true,
          role: true,
          status: true,
          ultimoLogin: true,
          createdAt: true,
          updatedAt: true,
          tenantId: true,
        },
      })

    if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado' })

    return res.json(usuario)
  } catch (err) {
    console.error('[ADMIN] Erro ao buscar usuário:', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// ─── PUT /api/admin/usuarios/:id ─────────────────────────────────────────────
// Editar dados do usuário

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const dados = editarUsuarioSchema.parse(req.body)

    // Se email está sendo alterado, verificar duplicidade
    if (dados.email) {
      const existente = await prisma.usuario.findFirst({
        where: {
          email: dados.email.toLowerCase().trim(),
          NOT: { id: req.params.id },
        },
      })
      if (existente) {
        return res.status(409).json({ error: 'Este email já está em uso por outro usuário' })
      }
      dados.email = dados.email.toLowerCase().trim()
    }

    const { tenantId: _, ...dadosSemTenant } = dados
    const usuario = await prisma.usuario.update({
      where: { id: req.params.id },
      data: dadosSemTenant,
      select: {
        id: true,
        email: true,
        nome: true,
        role: true,
        status: true,
        tenantId: true,
        updatedAt: true,
      },
    })

    // Sincronizar registro de Garcom conforme o role
    if (dados.role === 'GARCOM') {
      // Upsert: cria se não existir, atualiza se existir
      const garcomExistente = await prisma.garcom.findUnique({ where: { usuarioId: usuario.id } })
      if (!garcomExistente) {
        await prisma.garcom.create({
          data: {
            nome: usuario.nome,
            usuarioId: usuario.id,
            tenantId: usuario.tenantId || '',
            ativo: true,
          },
        })
      }
    } else if (dados.role && (dados.role as string) !== 'GARCOM') {
      // Se mudou de GARCOM para outro role, remove o vínculo de garçom
      await prisma.garcom.deleteMany({ where: { usuarioId: usuario.id } })
    }

    return res.json(usuario)
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'P2025') {
      return res.status(404).json({ error: 'Usuário não encontrado' })
    }
    console.error('[ADMIN] Erro ao editar usuário:', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// ─── PATCH /api/admin/usuarios/:id/status ─────────────────────────────────────
// Toggle de status (Ativo / Suspenso / Inadimplente)

router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { status } = statusSchema.parse(req.body)

    const usuario = await prisma.usuario.update({
      where: { id: req.params.id },
      data: { status },
      select: { id: true, email: true, nome: true, status: true },
    })

    return res.json(usuario)
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'P2025') {
      return res.status(404).json({ error: 'Usuário não encontrado' })
    }
    console.error('[ADMIN] Erro ao atualizar status:', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// ─── POST /api/admin/usuarios/:id/reset-senha ─────────────────────────────────
// Redefinir senha de um usuário

router.post('/:id/reset-senha', async (req: Request, res: Response) => {
  try {
    const { novaSenha } = resetSenhaSchema.parse(req.body)
    const senhaHash = await bcrypt.hash(novaSenha, 12)

    // Invalidar todos os refresh tokens existentes ao resetar senha
    await prisma.refreshToken.deleteMany({ where: { usuarioId: req.params.id } })

    await prisma.usuario.update({
      where: { id: req.params.id },
      data: { senhaHash },
    })

    return res.json({ message: 'Senha redefinida com sucesso. Todas as sessões foram encerradas.' })
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'P2025') {
      return res.status(404).json({ error: 'Usuário não encontrado' })
    }
    console.error('[ADMIN] Erro ao resetar senha:', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// ─── DELETE /api/admin/usuarios/:id ──────────────────────────────────────────
// Remover conta (cascade deleta refresh tokens via Prisma)

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    // Impedir que o superadmin se auto-delete
    if (req.user && req.user.sub === req.params.id) {
      return res.status(400).json({ error: 'Não é possível remover sua própria conta' })
    }

    await prisma.usuario.delete({ where: { id: req.params.id } })

    return res.status(204).send()
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'P2025') {
      return res.status(404).json({ error: 'Usuário não encontrado' })
    }
    console.error('[ADMIN] Erro ao deletar usuário:', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})



// ─── POST /api/admin/usuarios/:id/vincular ────────────────────────────────────
// Vincula um usuário ao ambiente de outro (compartilha tenantId).
// Body: { tenantId: string } — o tenantId do usuário-alvo cujo ambiente será compartilhado.

router.post('/:id/vincular', async (req: Request, res: Response) => {
  try {
    const { tenantId } = z.object({ tenantId: z.string().min(1) }).parse(req.body)

    // Verificar que o tenant de destino existe (é o id de algum usuario)
    const tenantOwner = await prisma.usuario.findFirst({ where: { tenantId } })
    if (!tenantOwner) {
      return res.status(404).json({ error: 'Ambiente de destino não encontrado. Informe um tenantId válido.' })
    }

    const usuario = await prisma.usuario.update({
      where: { id: req.params.id },
      data: { tenantId },
      select: { id: true, nome: true, email: true, tenantId: true },
    })

    // Invalidar sessões ativas para que o novo JWT com tenantId seja emitido
    await prisma.refreshToken.deleteMany({ where: { usuarioId: req.params.id } })

    console.log(`[ADMIN] Usuário ${usuario.email} vinculado ao ambiente tenantId=${tenantId}`)
    return res.json({ ...usuario, mensagem: 'Usuário vinculado ao ambiente com sucesso. Sessões encerradas.' })
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'P2025') {
      return res.status(404).json({ error: 'Usuário não encontrado' })
    }
    console.error('[ADMIN] Erro ao vincular tenant:', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// ─── POST /api/admin/usuarios/:id/desvincular ─────────────────────────────────
// Restaura o ambiente próprio do usuário (tenantId = próprio id).

router.post('/:id/desvincular', async (req: Request, res: Response) => {
  try {
    const usuario = await prisma.usuario.update({
      where: { id: req.params.id },
      data: { tenantId: req.params.id },  // restaura para o próprio id
      select: { id: true, nome: true, email: true, tenantId: true },
    })

    // Invalidar sessões para forçar novo JWT
    await prisma.refreshToken.deleteMany({ where: { usuarioId: req.params.id } })

    console.log(`[ADMIN] Usuário ${usuario.email} desvinculado — ambiente próprio restaurado`)
    return res.json({ ...usuario, mensagem: 'Ambiente próprio restaurado com sucesso. Sessões encerradas.' })
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'P2025') {
      return res.status(404).json({ error: 'Usuário não encontrado' })
    }
    console.error('[ADMIN] Erro ao desvincular tenant:', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

export default router

