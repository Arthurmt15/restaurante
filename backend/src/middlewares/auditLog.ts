import { AuditLog } from '../models'

/**
 * Registra uma entrada de auditoria no banco de dados.
 *
 * Cria um registro na coleção `AuditLog` com informações sobre
 * a ação realizada por um usuário em um recurso específico.
 *
 * @param tenantId - ID do tenant (restaurante) ao qual a auditoria pertence.
 * @param usuarioId - ID do usuário que realizou a ação (pode ser `undefined` para ações anônimas).
 * @param usuarioNome - Nome do usuário que realizou a ação.
 * @param acao - Tipo de ação realizada (ex: 'CRIAR', 'EDITAR', 'EXCLUIR').
 * @param recurso - Nome do recurso afetado (ex: 'Comanda', 'Mesa', 'ItemCardapio').
 * @param recursoId - ID do recurso afetado (opcional).
 * @param detalhes - Descrição adicional da ação (opcional).
 * @param ip - Endereço IP do cliente que realizou a ação (opcional).
 */
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
