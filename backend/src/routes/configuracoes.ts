import { Router, Request, Response } from 'express'
import { Configuracoes } from '../models'
import { authorizeRoles } from '../middlewares/authorize'
import { z } from 'zod'
import { hashCodigoExclusao } from '../services/comanda.service'

const router = Router()

/**
 * GET /api/configuracoes
 * Retorna as configurações do restaurante (tenant).
 * Requer role SUPERADMIN ou CLIENTE.
 */
router.get('/', authorizeRoles('SUPERADMIN', 'CLIENTE'), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId

  let config = await Configuracoes.findOne({ tenantId })

  // Se ainda não existir, sinalizar que precisa de setup
  if (!config) {
    return res.json({
      configurado: false,
      requiresSetup: true,
    })
  }

  // Retorna config sem expor o hash
  res.json({
    id: config._id,
    tenantId: config.tenantId,
    codigoExclusaoConfigurado: true,
    updatedAt: config.updatedAt,
  })
})

/**
 * PUT /api/configuracoes
 * Cria ou atualiza as configurações do restaurante.
 * Armazena o código de exclusão com hash bcrypt.
 * Requer role SUPERADMIN ou CLIENTE.
 */
router.put('/', authorizeRoles('SUPERADMIN', 'CLIENTE'), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId

  const schema = z.object({
    codigoExclusao: z.string().min(4, 'Código deve ter ao menos 4 caracteres'),
  })

  const { codigoExclusao } = schema.parse(req.body)
  const codigoHash = await hashCodigoExclusao(codigoExclusao)

  const config = await Configuracoes.findOneAndUpdate(
    { tenantId },
    { codigoExclusao: codigoHash },
    { new: true, upsert: true },
  )

  res.json({
    id: config._id,
    tenantId: config.tenantId,
    codigoExclusaoConfigurado: true,
    updatedAt: config.updatedAt,
  })
})

export default router
