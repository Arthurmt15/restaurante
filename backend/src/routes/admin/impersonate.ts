import { Router, Request, Response } from 'express'
import { Usuario } from '../../models'
import { generateAccessToken, TokenPayload } from '../../middlewares/auth'

const router = Router()

/**
 * POST /api/admin/impersonate/:id
 * Inicia impersonation de um usuário pelo Superadmin.
 * Gera um token temporário com os dados do usuário alvo.
 * Não permite impersonar outro Superadmin.
 * Registra em log de auditoria.
 */
router.post('/:id', async (req: Request, res: Response) => {
  try {
    const superadmin = req.user!

    const alvo = await Usuario.findById(req.params.id)
      .select('email nome role status tenantId')

    if (!alvo) {
      return res.status(404).json({ error: 'Usuário não encontrado' })
    }

    if (alvo.role === 'SUPERADMIN') {
      return res.status(400).json({ error: 'Não é possível impersonar outro Superadmin' })
    }

    const impersonationPayload: TokenPayload = {
      sub: String(alvo._id),
      email: alvo.email,
      nome: alvo.nome,
      role: alvo.role as 'CLIENTE',
      status: alvo.status,
      tenantId: alvo.tenantId,
      impersonatedBy: superadmin.sub,
    }

    const impersonationToken = generateAccessToken(impersonationPayload)

    console.log(`[AUDIT] Superadmin ${superadmin.email} iniciou impersonation do usuário ${alvo.email} (${alvo._id})`)

    return res.json({
      accessToken: impersonationToken,
      impersonando: {
        id: alvo._id,
        nome: alvo.nome,
        email: alvo.email,
      },
    })
  } catch (err) {
    console.error('[ADMIN] Erro ao iniciar impersonation:', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

/**
 * POST /api/admin/impersonate/stop
 * Encerra a impersonation ativa.
 * Valida que existe uma impersonação em curso.
 * Registra em log de auditoria.
 */
router.post('/stop', async (req: Request, res: Response) => {
  try {
    const currentUser = req.user

    if (!currentUser?.impersonatedBy) {
      return res.status(400).json({ error: 'Não há impersonation ativa' })
    }

    console.log(`[AUDIT] Impersonation encerrada. Admin ID: ${currentUser.impersonatedBy}`)

    return res.json({ message: 'Impersonation encerrada' })
  } catch (err) {
    console.error('[ADMIN] Erro ao encerrar impersonation:', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

export default router
