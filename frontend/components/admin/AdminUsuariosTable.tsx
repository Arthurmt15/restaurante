import type { UsuarioAdmin } from '../../lib/api'

/** Labels de exibição para os status de usuário. */
const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ATIVO:        { label: 'Ativo',        color: '#2d8a4e' },
  SUSPENSO:     { label: 'Suspenso',     color: '#dc3545' },
  INADIMPLENTE: { label: 'Inadimplente', color: '#fd7e14' },
}

/** Labels de exibição para os papéis de usuário. */
const ROLE_LABELS: Record<string, string> = {
  SUPERADMIN: '👑 Superadmin',
  CLIENTE:    '👤 Cliente',
  GARCOM:     '🍽️ Garçom',
}

/**
 * Formata uma data ISO para o formato brasileiro (dd/mm/aaaa hh:mm).
 * @param iso - Data em formato ISO opcional.
 * @returns Data formatada ou 'Nunca' caso não informada.
 */
function formatDate(iso?: string) {
  if (!iso) return 'Nunca'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

/** Props do componente de tabela de usuários do painel administrativo. */
interface AdminUsuariosTableProps {
  /** Lista de usuários a ser exibida na tabela. */
  usuarios: UsuarioAdmin[]
  /** Indica se os dados estão sendo carregados. */
  carregando: boolean
  /** Informações de paginação atual. */
  paginacao: { total: number; pagina: number; totalPaginas: number }
  /** ID do usuário que está sendo impersonado, ou null. */
  impersonando: string | null
  /** Objeto de estilos CSS do módulo (AdminPanel.module.css). */
  styles: Record<string, string>
  /** Callback ao clicar no botão de impersonar usuário. */
  onImpersonate: (u: UsuarioAdmin) => void
  /** Callback ao clicar no botão de editar usuário. */
  onEditar: (u: UsuarioAdmin) => void
  /** Callback ao clicar no botão de alternar status. */
  onToggleStatus: (u: UsuarioAdmin) => void
  /** Callback ao clicar no botão de redefinir senha. */
  onResetSenha: (u: UsuarioAdmin) => void
  /** Callback ao clicar no botão de vincular ambiente. */
  onVincular: (u: UsuarioAdmin) => void
  /** Callback ao clicar no botão de desvincular ambiente. */
  onDesvincular: (u: UsuarioAdmin) => void
  /** Callback ao clicar no botão de remover usuário. */
  onRemover: (u: UsuarioAdmin) => void
  /** Callback para navegar entre páginas da paginação. */
  onPagina: (pagina: number) => void
}

/**
 * Tabela de gerenciamento de usuários do painel administrativo.
 * Exibe lista de usuários com ações de editar, status, senha, vínculo e remoção.
 */
export default function AdminUsuariosTable({
  usuarios,
  carregando,
  paginacao,
  impersonando,
  styles,
  onImpersonate,
  onEditar,
  onToggleStatus,
  onResetSenha,
  onVincular,
  onDesvincular,
  onRemover,
  onPagina,
}: AdminUsuariosTableProps) {
  return (
    <>
      <div className={styles.adminTableWrap}>
        {carregando ? (
          <div className={styles.tableLoading}>
            <div className={styles.adminSpinner} />
          </div>
        ) : usuarios.length === 0 ? (
          <div className={styles.tableEmpty}>
            <span>👥</span>
            <p>Nenhum usuário encontrado</p>
          </div>
        ) : (
          <table className={styles.adminTable}>
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Cargo</th>
                <th>Status</th>
                <th>Ambiente</th>
                <th>Último Login</th>
                <th>Cadastro</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id} className={u.status !== 'ATIVO' ? styles.rowInactive : ''}>
                  <td>
                    <div className={styles.userCell}>
                      <div className={styles.userAvatar}>{u.nome?.charAt(0)?.toUpperCase() || '?'}</div>
                      <div>
                        <div className={styles.userName}>{u.nome}</div>
                        <div className={styles.userEmail}>{u.email}</div>
                        <div className={styles.userId}>{u.id}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`${styles.roleBadge} ${u.role === 'SUPERADMIN' ? styles.roleSuper : styles.roleCliente}`}>
                      {ROLE_LABELS[u.role]}
                    </span>
                  </td>
                  <td>
                    <span
                      className={styles.statusBadge}
                      style={{ '--status-color': STATUS_LABELS[u.status]?.color } as React.CSSProperties}
                    >
                      {STATUS_LABELS[u.status]?.label || u.status}
                    </span>
                  </td>
                  <td>
                    <span className={`${styles.tenantBadge} ${u.tenantId === u.id ? styles.tenantOwn : styles.tenantShared}`}>
                      {u.tenantId === u.id ? 'Próprio' : u.tenantId ? 'Compartilhado' : '—'}
                    </span>
                    {u.tenantId && u.tenantId !== u.id && (
                      <div className={styles.tenantIdMuted}>{u.tenantId.slice(0, 8)}…</div>
                    )}
                  </td>
                  <td className={styles.dateCell}>{formatDate(u.ultimoLogin)}</td>
                  <td className={styles.dateCell}>{formatDate(u.createdAt)}</td>
                  <td>
                    <div className={styles.actionBtns}>
                      {u.role !== 'SUPERADMIN' && (
                        <button
                          className={`${styles.actionBtn} ${styles.actionBtnGhost}`}
                          title="Logar como este usuário"
                          onClick={() => onImpersonate(u)}
                          disabled={impersonando === u.id}
                        >
                          {impersonando === u.id ? '⏳' : '👁️'}
                        </button>
                      )}
                      <button
                        className={`${styles.actionBtn} ${styles.actionBtnGhost}`}
                        title="Editar usuário"
                        onClick={() => onEditar(u)}
                      >
                        ✏️
                      </button>
                      <button
                        className={`${styles.actionBtn} ${u.status === 'ATIVO' ? styles.actionBtnWarn : styles.actionBtnSuccess}`}
                        title={u.status === 'ATIVO' ? 'Suspender' : 'Ativar'}
                        onClick={() => onToggleStatus(u)}
                      >
                        {u.status === 'ATIVO' ? '🔒' : '🔓'}
                      </button>
                      <button
                        className={`${styles.actionBtn} ${styles.actionBtnGhost}`}
                        title="Redefinir senha"
                        onClick={() => onResetSenha(u)}
                      >
                        🔑
                      </button>
                      {u.role !== 'SUPERADMIN' && (
                        <button
                          className={`${styles.actionBtn} ${styles.actionBtnGhost}`}
                          title="Vincular a outro ambiente"
                          onClick={() => onVincular(u)}
                        >
                          🔗
                        </button>
                      )}
                      {u.role !== 'SUPERADMIN' && u.tenantId && u.tenantId !== u.id && (
                        <button
                          className={`${styles.actionBtn} ${styles.actionBtnWarn}`}
                          title="Restaurar ambiente próprio"
                          onClick={() => onDesvincular(u)}
                        >
                          🔓
                        </button>
                      )}
                      <button
                        className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                        title="Remover conta"
                        onClick={() => onRemover(u)}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {paginacao.totalPaginas > 1 && (
        <div className={styles.pagination}>
          <span className={styles.paginationInfo}>
            {paginacao.total} usuários • Página {paginacao.pagina} de {paginacao.totalPaginas}
          </span>
          <div className={styles.paginationBtns}>
            <button
              className={styles.paginationBtn}
              disabled={paginacao.pagina === 1}
              onClick={() => onPagina(paginacao.pagina - 1)}
            >
              ← Anterior
            </button>
            <button
              className={styles.paginationBtn}
              disabled={paginacao.pagina === paginacao.totalPaginas}
              onClick={() => onPagina(paginacao.pagina + 1)}
            >
              Próxima →
            </button>
          </div>
        </div>
      )}
    </>
  )
}
