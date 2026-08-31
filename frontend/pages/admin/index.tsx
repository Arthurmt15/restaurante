import { useState, useEffect, useCallback, useRef } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useAuth } from '../../contexts/AuthContext'
import { apiGet, apiPost, apiPatch, apiDelete, type UsuarioAdmin, type PaginacaoUsuarios, type ResumoAdmin } from '../../lib/api'
import { setImpersonationToken } from '../../lib/auth'
import ModalUsuario from '../../components/admin/ModalUsuario'
import ModalResetSenha from '../../components/admin/ModalResetSenha'
import ModalVincular from '../../components/admin/ModalVincular'
import styles from '../../components/admin/AdminPanel.module.css'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ATIVO:        { label: 'Ativo',        color: '#2d8a4e' },
  SUSPENSO:     { label: 'Suspenso',     color: '#dc3545' },
  INADIMPLENTE: { label: 'Inadimplente', color: '#fd7e14' },
}

const ROLE_LABELS: Record<string, string> = {
  SUPERADMIN: '👑 Superadmin',
  CLIENTE:    '👤 Cliente',
  GARCOM:     '🍽️ Garçom',
}

function formatDate(iso?: string) {
  if (!iso) return 'Nunca'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

/**
 * Painel administrativo para gestão de usuários do sistema.
 * Permite cadastrar, editar, suspender, remover usuários, configurar acessos,
 * vincular ambientes e impersonar contas. Acessível apenas por superadmins.
 */
export default function AdminPanel() {
  const { usuario, loading } = useAuth()
  const router = useRouter()

  const [resumo, setResumo] = useState<ResumoAdmin | null>(null)
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([])
  const [paginacao, setPaginacao] = useState({ total: 0, pagina: 1, totalPaginas: 1 })
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [impersonando, setImpersonando] = useState<string | null>(null)

  const [modalAberto, setModalAberto] = useState(false)
  const [usuarioEditando, setUsuarioEditando] = useState<UsuarioAdmin | null>(null)
  const [modalResetSenha, setModalResetSenha] = useState<UsuarioAdmin | null>(null)
  const [modalVincular, setModalVincular] = useState<UsuarioAdmin | null>(null)

  const buscaTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)


  // Redirecionar se não for superadmin
  useEffect(() => {
    if (!loading && usuario && usuario.role !== 'SUPERADMIN') {
      router.replace('/')
    }
    if (!loading && !usuario) {
      router.replace('/login')
    }
  }, [usuario, loading, router])

  const carregarDados = useCallback(async (pagina = 1, buscaAtual = busca, statusAtual = filtroStatus) => {
    setCarregando(true)
    try {
      const params = new URLSearchParams({
        pagina: String(pagina),
        limite: '10',
        ...(buscaAtual ? { busca: buscaAtual } : {}),
        ...(statusAtual ? { status: statusAtual } : {}),
      })

      const [dadosUsuarios, dadosResumo] = await Promise.all([
        apiGet<PaginacaoUsuarios>(`/admin/usuarios?${params}`),
        apiGet<ResumoAdmin>('/admin/usuarios/stats/resumo'),
      ])

      setUsuarios(dadosUsuarios.usuarios)
      setPaginacao(dadosUsuarios.paginacao)
      setResumo(dadosResumo)
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setCarregando(false)
    }
  }, [busca, filtroStatus])

  useEffect(() => {
    if (usuario?.role === 'SUPERADMIN') {
      carregarDados()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario])

  // Busca com debounce
  function handleBusca(valor: string) {
    setBusca(valor)
    clearTimeout(buscaTimeout.current)
    buscaTimeout.current = setTimeout(() => {
      carregarDados(1, valor, filtroStatus)
    }, 350)
  }

  function handleFiltroStatus(status: string) {
    setFiltroStatus(status)
    carregarDados(1, busca, status)
  }

  async function handleToggleStatus(u: UsuarioAdmin) {
    const novoStatus = u.status === 'ATIVO' ? 'SUSPENSO' : 'ATIVO'
    try {
      await apiPatch(`/admin/usuarios/${u.id}/status`, { status: novoStatus })
      carregarDados(paginacao.pagina)
    } catch (err) {
      console.error('Erro ao alterar status:', err)
    }
  }

  async function handleRemover(u: UsuarioAdmin) {
    if (!confirm(`Remover permanentemente a conta de "${u.nome}" (${u.email})?\n\nEsta ação não pode ser desfeita.`)) return
    try {
      await apiDelete(`/admin/usuarios/${u.id}`)
      carregarDados(paginacao.pagina)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao remover usuário')
    }
  }

  async function handleImpersonate(u: UsuarioAdmin) {
    setImpersonando(u.id)
    try {
      const res = await apiPost<{ accessToken: string; impersonando: { id: string; nome: string; email: string } }>(
        `/admin/impersonate/${u.id}`
      )
      setImpersonationToken(res.accessToken, res.impersonando)
      router.push('/')
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao iniciar impersonation')
    } finally {
      setImpersonando(null)
    }
  }

  async function handleVincular(u: UsuarioAdmin, targetTenantId: string) {
    try {
      await apiPost(`/admin/usuarios/${u.id}/vincular`, { tenantId: targetTenantId })
      carregarDados(paginacao.pagina)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao vincular ambiente')
    }
  }

  async function handleDesvincular(u: UsuarioAdmin) {
    if (!confirm(`Desvincular "${u.nome}" do ambiente compartilhado?\n\nO usuário passará a ver apenas os próprios dados.`)) return
    try {
      await apiPost(`/admin/usuarios/${u.id}/desvincular`)
      carregarDados(paginacao.pagina)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao desvincular ambiente')
    }
  }

  if (loading || (!usuario && !loading)) {
    return (
      <div className={styles.adminLoading}>
        <div className={styles.adminSpinner} />
        <span>Carregando...</span>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Painel Administrativo — Restaurante</title>
        <meta name="description" content="Gestão de usuários e permissões do sistema" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className={styles.adminPage}>
        {/* Header */}
        <div className={styles.adminHeader}>
          <div>
            <h1 className={styles.adminTitle}>Painel Administrativo</h1>
            <p className={styles.adminSubtitle}>Gestão de usuários e controle de acesso</p>
          </div>
          <button
            id="btn-novo-usuario"
            className="btn-primary"
            onClick={() => { setUsuarioEditando(null); setModalAberto(true) }}
          >
            + Novo Usuário
          </button>
        </div>

        {/* Cards de resumo */}
        {resumo && (
          <div className={styles.adminStats}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{resumo.total}</div>
              <div className={styles.statLabel}>Total de Usuários</div>
            </div>
            <div className={`${styles.statCard} ${styles.statCardGreen}`}>
              <div className={styles.statValue}>{resumo.ativos}</div>
              <div className={styles.statLabel}>Ativos</div>
            </div>
            <div className={`${styles.statCard} ${styles.statCardRed}`}>
              <div className={styles.statValue}>{resumo.suspensos}</div>
              <div className={styles.statLabel}>Suspensos</div>
            </div>
            <div className={`${styles.statCard} ${styles.statCardOrange}`}>
              <div className={styles.statValue}>{resumo.inadimplentes}</div>
              <div className={styles.statLabel}>Inadimplentes</div>
            </div>
          </div>
        )}

        {/* Filtros e busca */}
        <div className={styles.adminFilters}>
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              id="admin-busca"
              type="text"
              className={styles.searchInput}
              placeholder="Buscar por nome, email ou ID..."
              value={busca}
              onChange={e => handleBusca(e.target.value)}
            />
          </div>
          <div className={styles.filterTabs}>
            {[
              { value: '', label: 'Todos' },
              { value: 'ATIVO', label: 'Ativos' },
              { value: 'SUSPENSO', label: 'Suspensos' },
              { value: 'INADIMPLENTE', label: 'Inadimplentes' },
            ].map(tab => (
              <button
                key={tab.value}
                className={`${styles.filterTab} ${filtroStatus === tab.value ? styles.filterTabActive : ''}`}
                onClick={() => handleFiltroStatus(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabela */}
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
                        {/* Logar como */}
                        {u.role !== 'SUPERADMIN' && (
                          <button
                            className={`${styles.actionBtn} ${styles.actionBtnGhost}`}
                            title="Logar como este usuário"
                            onClick={() => handleImpersonate(u)}
                            disabled={impersonando === u.id}
                          >
                            {impersonando === u.id ? '⏳' : '👁️'}
                          </button>
                        )}
                        {/* Editar */}
                        <button
                          className={`${styles.actionBtn} ${styles.actionBtnGhost}`}
                          title="Editar usuário"
                          onClick={() => { setUsuarioEditando(u); setModalAberto(true) }}
                        >
                          ✏️
                        </button>
                        {/* Toggle status */}
                        <button
                          className={`${styles.actionBtn} ${u.status === 'ATIVO' ? styles.actionBtnWarn : styles.actionBtnSuccess}`}
                          title={u.status === 'ATIVO' ? 'Suspender' : 'Ativar'}
                          onClick={() => handleToggleStatus(u)}
                        >
                          {u.status === 'ATIVO' ? '🔒' : '🔓'}
                        </button>
                        {/* Reset senha */}
                        <button
                          className={`${styles.actionBtn} ${styles.actionBtnGhost}`}
                          title="Redefinir senha"
                          onClick={() => setModalResetSenha(u)}
                        >
                          🔑
                        </button>
                        {/* Vincular ambiente */}
                        {u.role !== 'SUPERADMIN' && (
                          <button
                            className={`${styles.actionBtn} ${styles.actionBtnGhost}`}
                            title="Vincular a outro ambiente"
                            onClick={() => setModalVincular(u)}
                          >
                            🔗
                          </button>
                        )}
                        {/* Desvincular ambiente */}
                        {u.role !== 'SUPERADMIN' && u.tenantId && u.tenantId !== u.id && (
                          <button
                            className={`${styles.actionBtn} ${styles.actionBtnWarn}`}
                            title="Restaurar ambiente próprio"
                            onClick={() => handleDesvincular(u)}
                          >
                            🔓
                          </button>
                        )}
                        {/* Remover */}
                        <button
                          className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                          title="Remover conta"
                          onClick={() => handleRemover(u)}
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

        {/* Paginação */}
        {paginacao.totalPaginas > 1 && (
          <div className={styles.pagination}>
            <span className={styles.paginationInfo}>
              {paginacao.total} usuários • Página {paginacao.pagina} de {paginacao.totalPaginas}
            </span>
            <div className={styles.paginationBtns}>
              <button
                className={styles.paginationBtn}
                disabled={paginacao.pagina === 1}
                onClick={() => carregarDados(paginacao.pagina - 1)}
              >
                ← Anterior
              </button>
              <button
                className={styles.paginationBtn}
                disabled={paginacao.pagina === paginacao.totalPaginas}
                onClick={() => carregarDados(paginacao.pagina + 1)}
              >
                Próxima →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modais */}
      {modalAberto && (
        <ModalUsuario
          usuario={usuarioEditando}
          onClose={() => setModalAberto(false)}
          onSalvo={() => { setModalAberto(false); carregarDados() }}
        />
      )}

      {modalResetSenha && (
        <ModalResetSenha
          usuario={modalResetSenha}
          onClose={() => setModalResetSenha(null)}
        />
      )}

      {modalVincular && (
        <ModalVincular
          usuario={modalVincular}
          onClose={() => setModalVincular(null)}
          onVincular={(targetTenantId) => {
            handleVincular(modalVincular, targetTenantId)
            setModalVincular(null)
          }}
        />
      )}
    </>
  )
}
