import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { z, ZodError } from 'zod'
import mongoose from 'mongoose'
import { Usuario, Garcom, RefreshToken } from '../../models'

const router = Router()

// ─── Schemas de validação ────────────────────────────────────────────────────

const criarUsuarioSchema = z.object({
  email: z.string().min(3, 'Email/Usuário deve ter ao menos 3 caracteres'),
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  senha: z.string().min(8, 'Senha deve ter ao menos 8 caracteres'),
  role: z.enum(['SUPERADMIN', 'CLIENTE', 'GARCOM']).default('CLIENTE'),
  status: z.enum(['ATIVO', 'SUSPENSO', 'INADIMPLENTE']).default('ATIVO'),
  tenantId: z.string().optional(),
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

/**
 * GET /api/admin/usuarios
 * Lista todos os usuários do sistema com paginação.
 * Suporta busca por nome/email, filtro por status e role.
 */
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

    if (busca) {
      const or: Record<string, unknown>[] = [
        { nome: { $regex: String(busca), $options: 'i' } },
        { email: { $regex: String(busca), $options: 'i' } },
      ]
      if (mongoose.Types.ObjectId.isValid(String(busca))) {
        or.push({ _id: String(busca) })
      }
      where.$or = or
    }

    if (status && ['ATIVO', 'SUSPENSO', 'INADIMPLENTE'].includes(String(status))) {
      where.status = String(status)
    }

    if (role && ['SUPERADMIN', 'CLIENTE'].includes(String(role))) {
      where.role = String(role)
    }

    const [rawUsuarios, total] = await Promise.all([
      Usuario.find(where)
        .skip(skip)
        .limit(pageSize)
        .select('email nome role status ultimoLogin createdAt updatedAt tenantId')
        .sort({ createdAt: -1 })
        .lean(),
      Usuario.countDocuments(where),
    ])

    const usuarios = rawUsuarios.map((u) => ({
      id: String(u._id),
      email: u.email,
      nome: u.nome,
      role: u.role,
      status: u.status,
      ultimoLogin: u.ultimoLogin,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      tenantId: u.tenantId,
    }))

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

/**
 * POST /api/admin/usuarios
 * Cria um novo usuário no sistema.
 * Se a role for GARCOM, cria automaticamente o registro de garçom vinculado.
 * Valida duplicidade de email.
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const dados = criarUsuarioSchema.parse(req.body)

    const existente = await Usuario.findOne({ email: dados.email.toLowerCase().trim() })
    if (existente) {
      return res.status(409).json({ error: 'Este email já está cadastrado' })
    }

    const senhaHash = await bcrypt.hash(dados.senha, 12)

    const u = await Usuario.create({
      email: dados.email.toLowerCase().trim(),
      nome: dados.nome.trim(),
      senhaHash,
      role: dados.role,
      status: dados.status,
      ...(dados.tenantId ? { tenantId: dados.tenantId } : {}),
    })

    const usuario = {
      id: u._id,
      email: u.email,
      nome: u.nome,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt,
    }

    if (dados.role === 'GARCOM') {
      await Garcom.create({
        nome: dados.nome.trim(),
        usuarioId: u._id,
        tenantId: dados.tenantId || '',
        ativo: true,
      })
    }

    return res.status(201).json(usuario)
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: 'Dados inválidos', details: err.errors })
    }
    console.error('[ADMIN] Erro ao criar usuário:', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

/**
 * GET /api/admin/usuarios/stats/resumo
 * Retorna resumo dos usuários: total, ativos, suspensos e inadimplentes.
 */
router.get('/stats/resumo', async (_req: Request, res: Response) => {
  try {
    const [total, ativos, suspensos, inadimplentes] = await Promise.all([
      Usuario.countDocuments(),
      Usuario.countDocuments({ status: 'ATIVO' }),
      Usuario.countDocuments({ status: 'SUSPENSO' }),
      Usuario.countDocuments({ status: 'INADIMPLENTE' }),
    ])

    return res.json({ total, ativos, suspensos, inadimplentes })
  } catch (err) {
    console.error('[ADMIN] Erro ao buscar resumo:', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

/**
 * GET /api/admin/usuarios/:id
 * Busca um usuário pelo ID.
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const usuario = await Usuario.findById(req.params.id)
      .select('email nome role status ultimoLogin createdAt updatedAt tenantId')

    if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado' })

    return res.json(usuario)
  } catch (err) {
    console.error('[ADMIN] Erro ao buscar usuário:', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

/**
 * PUT /api/admin/usuarios/:id
 * Atualiza os dados de um usuário.
 * Se mudar para role GARCOM, cria registro de garçom vinculado.
 * Se sair de GARCOM, remove o registro de garçom associado.
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const dados = editarUsuarioSchema.parse(req.body)

    if (dados.email) {
      const existente = await Usuario.findOne({
        email: dados.email.toLowerCase().trim(),
        _id: { $ne: req.params.id },
      })
      if (existente) {
        return res.status(409).json({ error: 'Este email já está em uso por outro usuário' })
      }
      dados.email = dados.email.toLowerCase().trim()
    }

    const { tenantId: _, ...dadosSemTenant } = dados
    const usuario = await Usuario.findByIdAndUpdate(
      req.params.id,
      dadosSemTenant,
      { new: true },
    ).select('email nome role status tenantId updatedAt')

    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' })
    }

    if (dados.role === 'GARCOM') {
      const garcomExistente = await Garcom.findOne({ usuarioId: usuario._id })
      if (!garcomExistente) {
        await Garcom.create({
          nome: usuario.nome,
          usuarioId: usuario._id,
          tenantId: usuario.tenantId || '',
          ativo: true,
        })
      }
    } else if (dados.role && (dados.role as string) !== 'GARCOM') {
      await Garcom.deleteMany({ usuarioId: usuario._id })
    }

    return res.json(usuario)
  } catch (err: unknown) {
    console.error('[ADMIN] Erro ao editar usuário:', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

/**
 * PATCH /api/admin/usuarios/:id/status
 * Atualiza o status de um usuário (ATIVO, SUSPENSO, INADIMPLENTE).
 */
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { status } = statusSchema.parse(req.body)

    const usuario = await Usuario.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    ).select('email nome status')

    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' })
    }

    return res.json(usuario)
  } catch (err: unknown) {
    console.error('[ADMIN] Erro ao atualizar status:', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

/**
 * POST /api/admin/usuarios/:id/reset-senha
 * Redefine a senha de um usuário.
 * Invalida todas as sessões existentes (refresh tokens) do usuário.
 */
router.post('/:id/reset-senha', async (req: Request, res: Response) => {
  try {
    const { novaSenha } = resetSenhaSchema.parse(req.body)
    const senhaHash = await bcrypt.hash(novaSenha, 12)

    await RefreshToken.deleteMany({ usuarioId: req.params.id })

    const usuario = await Usuario.findByIdAndUpdate(
      req.params.id,
      { senhaHash },
    )

    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' })
    }

    return res.json({ message: 'Senha redefinida com sucesso. Todas as sessões foram encerradas.' })
  } catch (err: unknown) {
    console.error('[ADMIN] Erro ao resetar senha:', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

/**
 * DELETE /api/admin/usuarios/:id
 * Remove um usuário do sistema.
 * Não permite que o admin remova sua própria conta.
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (req.user && req.user.sub === req.params.id) {
      return res.status(400).json({ error: 'Não é possível remover sua própria conta' })
    }

    const usuario = await Usuario.findByIdAndDelete(req.params.id)

    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' })
    }

    return res.status(204).send()
  } catch (err: unknown) {
    console.error('[ADMIN] Erro ao deletar usuário:', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

/**
 * POST /api/admin/usuarios/:id/vincular
 * Vincula um usuário a um ambiente (tenant) específico.
 * Valida que o tenant de destino existe.
 * Encerra todas as sessões existentes do usuário.
 */
router.post('/:id/vincular', async (req: Request, res: Response) => {
  try {
    const { tenantId } = z.object({ tenantId: z.string().min(1) }).parse(req.body)

    const tenantOwner = await Usuario.findOne({ tenantId })
    if (!tenantOwner) {
      return res.status(404).json({ error: 'Ambiente de destino não encontrado. Informe um tenantId válido.' })
    }

    const usuario = await Usuario.findByIdAndUpdate(
      req.params.id,
      { tenantId },
      { new: true },
    ).select('nome email tenantId')

    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' })
    }

    await RefreshToken.deleteMany({ usuarioId: req.params.id })

    console.log(`[ADMIN] Usuário ${usuario.email} vinculado ao ambiente tenantId=${tenantId}`)
    return res.json({ ...usuario.toObject(), mensagem: 'Usuário vinculado ao ambiente com sucesso. Sessões encerradas.' })
  } catch (err: unknown) {
    console.error('[ADMIN] Erro ao vincular tenant:', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

/**
 * POST /api/admin/usuarios/:id/desvincular
 * Desvincula um usuário de um tenant, restaurando seu ambiente próprio.
 * Encerra todas as sessões existentes do usuário.
 */
router.post('/:id/desvincular', async (req: Request, res: Response) => {
  try {
    const usuario = await Usuario.findByIdAndUpdate(
      req.params.id,
      { tenantId: req.params.id },
      { new: true },
    ).select('nome email tenantId')

    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' })
    }

    await RefreshToken.deleteMany({ usuarioId: req.params.id })

    console.log(`[ADMIN] Usuário ${usuario.email} desvinculado — ambiente próprio restaurado`)
    return res.json({ ...usuario.toObject(), mensagem: 'Ambiente próprio restaurado com sucesso. Sessões encerradas.' })
  } catch (err: unknown) {
    console.error('[ADMIN] Erro ao desvincular tenant:', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

export default router
