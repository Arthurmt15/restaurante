import { Router, Request, Response } from 'express'
import { Usuario, UsuarioBarraca } from '../models'
import { errorHandler } from '../middlewares/errorHandler'

const router = Router()
router.use(errorHandler)

/**
 * GET /api/usuarios
 * Lista os usuários vinculados às barracas do usuário logado.
 * - SUPERADMIN: vê todos os usuários do sistema
 * - CLIENTE/GARCOM: vê os usuários das barracas que tem acesso
 */
router.get('/', async (req: Request, res: Response) => {
  const { role, tenantId } = req.user!

  if (role === 'SUPERADMIN') {
    const usuarios = await Usuario.find({})
      .select('email nome imagem role status tenantId nomeBarraca createdAt')
      .sort({ nome: 1 })
      .lean()
    return res.json({ usuarios })
  }

  // Para CLIENTE/GARCOM: buscar barracas que o usuário tem acesso
  const vinculos = await UsuarioBarraca.find({
    usuarioId: req.user!.sub,
    status: 'ATIVO',
  }).lean()

  const barracaIds = vinculos.map((v: any) => v.barracaId)

  // Incluir a barraca própria (tenantId do usuário = seu _id)
  if (tenantId && !barracaIds.includes(tenantId)) {
    barracaIds.push(tenantId)
  }

  // Buscar usuários vinculados a essas barracas
  const vinculosTodas = await UsuarioBarraca.find({
    barracaId: { $in: barracaIds },
    status: 'ATIVO',
  }).lean()

  const usuarioIds = [...new Set(vinculosTodas.map((v: any) => String(v.usuarioId)))]

  // Incluir o próprio usuário
  if (!usuarioIds.includes(req.user!.sub)) {
    usuarioIds.push(req.user!.sub)
  }

  const usuarios = await Usuario.find({ _id: { $in: usuarioIds } })
    .select('email nome imagem role status tenantId nomeBarraca createdAt')
    .sort({ nome: 1 })
    .lean()

  // Anexar info de vinculo (role na barraca)
  const usuariosComVinculo = usuarios.map((u: any) => {
    const vinculo = vinculosTodas.find((v: any) => String(v.usuarioId) === String(u._id))
    return {
      ...u,
      papelNaBarraca: vinculo?.role || u.role,
    }
  })

  res.json({ usuarios: usuariosComVinculo })
})

export default router
