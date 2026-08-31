/**
 * Rotas de gerenciamento de vinculação de usuários a tenants (ambientes).
 *
 * Fornece endpoints para vincular e desvincular usuários de tenants
 * específicos, encerrando todas as sessões existentes do usuário
 * após cada operação.
 */
import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { Usuario, RefreshToken } from '../../models'
import { errorHandler } from '../../middlewares/errorHandler'

const router = Router()
router.use(errorHandler)

/**
 * POST /api/admin/usuarios/:id/vincular
 * Vincula um usuário a um ambiente (tenant) específico.
 * Valida que o tenant de destino existe.
 * Encerra todas as sessões existentes do usuário.
 */
router.post('/:id/vincular', async (req: Request, res: Response) => {
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
})

/**
 * POST /api/admin/usuarios/:id/desvincular
 * Desvincula um usuário de um tenant, restaurando seu ambiente próprio.
 * Encerra todas as sessões existentes do usuário.
 */
router.post('/:id/desvincular', async (req: Request, res: Response) => {
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
})

export default router
