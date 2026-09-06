import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { Usuario, UsuarioBarraca, Garcom } from '../../models'
import { errorHandler } from '../../middlewares/errorHandler'

const router = Router()
router.use(errorHandler)

const aprovarSchema = z.object({
  barracaId: z.string().min(1, 'barracaId é obrigatório'),
  role: z.enum(['CLIENTE', 'GARCOM']),
  nomeBarraca: z.string().optional(),
})

/**
 * GET /api/admin/aprovacoes
 * Lista todos os usuários com status PENDENTE (aguardando aprovação).
 */
router.get('/', async (req: Request, res: Response) => {
  const pendentes = await Usuario.find({ status: 'PENDENTE' })
    .select('email nome imagem role status createdAt')
    .sort({ createdAt: -1 })
    .lean({ virtuals: true })

  const vinculacoesPendentes = await UsuarioBarraca.find({ status: 'PENDENTE' })
    .populate('usuarioId', 'email nome imagem')
    .sort({ createdAt: -1 })
    .lean({ virtuals: true })

  res.json({ pendentes, vinculacoesPendentes })
})

/**
 * POST /api/admin/aprovacoes/:usuarioId/aprovar
 * Aprova um usuário PENDENTE e o vincula a uma barraca.
 *
 * Body: { barracaId, role, nomeBarraca? }
 * - barracaId: tenantId do dono da barraca
 * - role: CLIENTE ou GARCOM nessa barraca
 * - nomeBarraca: opcional, para atualizar o nome da barraca do dono
 */
router.post('/:usuarioId/aprovar', async (req: Request, res: Response) => {
  const { usuarioId } = req.params
  const body = aprovarSchema.parse(req.body)

  const usuario = await Usuario.findById(usuarioId)
  if (!usuario) {
    return res.status(404).json({ error: 'Usuário não encontrado' })
  }

  if (usuario.status !== 'PENDENTE') {
    return res.status(400).json({ error: 'Usuário não está pendente' })
  }

  // Atualizar status do usuário para ATIVO
  await Usuario.findByIdAndUpdate(usuarioId, { status: 'ATIVO' })

  // Se role é GARCOM, criar registro de garçom vinculado
  if (body.role === 'GARCOM') {
    const garcom = await Garcom.create({
      nome: usuario.nome,
      ativo: true,
      tenantId: body.barracaId,
      usuarioId: usuario._id,
    })
    // Atualizar garcomId no JWT do usuário
    await Usuario.findByIdAndUpdate(usuarioId, { $set: { garcomId: garcom._id } })
  }

  // Criar ou atualizar vínculo na UsuarioBarraca
  const vinculo = await UsuarioBarraca.findOneAndUpdate(
    { usuarioId: usuario._id, barracaId: body.barracaId },
    {
      role: body.role,
      status: 'ATIVO',
    },
    { new: true, upsert: true }
  )

  // Se o dono da barraca é o próprio usuário aprovado, atualizar nomeBarraca
  if (body.nomeBarraca && body.barracaId === String(usuario._id)) {
    await Usuario.findByIdAndUpdate(usuarioId, { nomeBarraca: body.nomeBarraca })
  }

  // Se nomeBarraca foi fornecido, atualizar o dono da barraca
  if (body.nomeBarraca) {
    const dono = await Usuario.findOne({ tenantId: body.barracaId })
    if (dono) {
      await Usuario.findByIdAndUpdate(dono._id, { nomeBarraca: body.nomeBarraca })
    }
  }

  res.json({
    message: 'Usuário aprovado com sucesso',
    vinculo,
    usuario: {
      id: String(usuario._id),
      email: usuario.email,
      nome: usuario.nome,
      status: 'ATIVO',
    },
  })
})

/**
 * POST /api/admin/aprovacoes/:usuarioId/rejeitar
 * Rejeita um usuário PENDENTE e o remove do sistema.
 */
router.post('/:usuarioId/rejeitar', async (req: Request, res: Response) => {
  const { usuarioId } = req.params

  const usuario = await Usuario.findById(usuarioId)
  if (!usuario) {
    return res.status(404).json({ error: 'Usuário não encontrado' })
  }

  if (usuario.status !== 'PENDENTE') {
    return res.status(400).json({ error: 'Usuário não está pendente' })
  }

  // Remover vínculos
  await UsuarioBarraca.deleteMany({ usuarioId: usuario._id })

  // Remover usuário
  await Usuario.findByIdAndDelete(usuarioId)

  res.json({ message: 'Usuário rejeitado e removido' })
})

/**
 * GET /api/admin/aprovacoes/barracas
 * Lista todas as barracas disponíveis (usuários com tenantId = próprio _id).
 */
router.get('/barracas', async (req: Request, res: Response) => {
  const donos = await Usuario.find({
    tenantId: { $ne: '' },
    status: 'ATIVO',
  })
    .select('nome email tenantId nomeBarraca')
    .sort({ nome: 1 })
    .lean({ virtuals: true })

  const barracas = donos.map((d: any) => ({
    id: d.tenantId,
    nome: d.nomeBarraca || d.nome,
    donoEmail: d.email,
  }))

  res.json(barracas)
})

/**
 * PUT /api/admin/aprovacoes/barracas/:barracaId
 * Atualiza o nome de uma barraca.
 */
router.put('/barracas/:barracaId', async (req: Request, res: Response) => {
  const { barracaId } = req.params
  const { nome } = req.body as { nome: string }

  if (!nome || !nome.trim()) {
    return res.status(400).json({ error: 'Nome é obrigatório' })
  }

  const dono = await Usuario.findOne({ tenantId: barracaId })
  if (!dono) {
    return res.status(404).json({ error: 'Barraca não encontrada' })
  }

  await Usuario.findByIdAndUpdate(dono._id, { nomeBarraca: nome.trim() })

  res.json({ message: 'Nome da barraca atualizado', nome: nome.trim() })
})

export default router
