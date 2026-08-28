import { AuditLog } from '../models'

export async function logAuditoria(
  tenantId: string,
  usuarioId: string | undefined,
  usuarioNome: string,
  acao: string,
  recurso: string,
  recursoId?: string,
  detalhes?: string,
  ip?: string,
): Promise<void> {
  await AuditLog.create({
    tenantId,
    usuarioId,
    usuarioNome,
    acao,
    recurso,
    recursoId,
    detalhes,
    ip,
  })
}
