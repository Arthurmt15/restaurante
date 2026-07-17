import { Router, Request, Response } from 'express'
import { prisma } from '../../lib/prisma'
import { generateAccessToken, TokenPayload } from '../../middlewares/auth'

const router = Router()

// ─── POST /api/admin/impersonate/:id ─────────────────────────────────────────
// Superadmin entra na sessão de um cliente específico.
// Gera um access token temporário com claim `impersonatedBy`.
// O refresh token ORIGINAL do superadmin permanece inalterado no cookie.

router.post('/:id', async (req: Request, res: Response) => {
  try {
    const superadmin = req.user! // já validado pelo middleware isSuperAdmin

    const alvo = await prisma.usuario.findUnique({
      where: { id: req.params.id },
      select: { id: true, email: true, nome: true, role: true, status: true, tenantId: true },
    })

    if (!alvo) {
      return res.status(404).json({ error: 'Usuário não encontrado' })
    }

    // Impedir impersonation de outro SUPERADMIN
    if (alvo.role === 'SUPERADMIN') {
      return res.status(400).json({ error: 'Não é possível impersonar outro Superadmin' })
    }

    // Gerar token de impersonation com referência ao admin original
    const impersonationPayload: TokenPayload = {
      sub: alvo.id,
      email: alvo.email,
      nome: alvo.nome,
      role: alvo.role as 'CLIENTE',
      status: alvo.status,
      tenantId: alvo.tenantId,
      impersonatedBy: superadmin.sub, // ID do superadmin real
    }

    // Token de vida um pouco maior para sessões de suporte (1 hora)
    const impersonationToken = generateAccessToken(impersonationPayload)

    console.log(`[AUDIT] Superadmin ${superadmin.email} iniciou impersonation do usuário ${alvo.email} (${alvo.id})`)

    return res.json({
      accessToken: impersonationToken,
      impersonando: {
        id: alvo.id,
        nome: alvo.nome,
        email: alvo.email,
      },
    })
  } catch (err) {
    console.error('[ADMIN] Erro ao iniciar impersonation:', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// ─── POST /api/admin/impersonate/stop ────────────────────────────────────────
// Encerra a impersonation. O frontend descarta o token de impersonation
// e usa o refresh token original para obter um novo access token do superadmin.

router.post('/stop', async (req: Request, res: Response) => {
  try {
    // O frontend deve chamar /api/auth/refresh com o cookie original
    // Esta rota é apenas um registro de auditoria / confirmação
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
