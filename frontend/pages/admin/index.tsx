import { useState, useEffect, useCallback, useRef } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useAuth } from '../../contexts/AuthContext'
import { apiGet, apiPost, apiPatch, apiDelete, type UsuarioAdmin, type PaginacaoUsuarios, type ResumoAdmin } from '../../lib/api'
import { setImpersonationToken } from '../../lib/auth'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ATIVO:        { label: 'Ativo',        color: '#2d8a4e' },
  SUSPENSO:     { label: 'Suspenso',     color: '#dc3545' },
  INADIMPLENTE: { label: 'Inadimplente', color: '#fd7e14' },
}

const ROLE_LABELS: Record<string, string> = {
  SUPERADMIN: '👑 Superadmin',
  CLIENTE:    '👤 Cliente',
}

function formatDate(iso?: string) {
  if (!iso) return 'Nunca'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

// ─── Modal de Criação/Edição ──────────────────────────────────────────────────

interface ModalUsuarioProps {
  usuario?: UsuarioAdmin | null
  onClose: () => void
  onSalvo: () => void
}

function ModalUsuario({ usuario, onClose, onSalvo }: ModalUsuarioProps) {
  const isEdicao = !!usuario
  const [nome, setNome] = useState(usuario?.nome || '')
  const [email, setEmail] = useState(usuario?.email || '')
  const [senha, setSenha] = useState('')
  const [role, setRole] = useState<'SUPERADMIN' | 'CLIENTE'>(usuario?.role || 'CLIENTE')
  const [status, setStatus] = useState<'ATIVO' | 'SUSPENSO' | 'INADIMPLENTE'>(usuario?.status || 'ATIVO')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro('')

    try {
      if (isEdicao) {
        await apiPatch<UsuarioAdmin>(`/admin/usuarios/${usuario!.id}`, { nome, email, role, status })
      } else {
        await apiPost<UsuarioAdmin>('/admin/usuarios', { nome, email, senha, role, status })
      }
      onSalvo()
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-header">
          <h3 id="modal-title">{isEdicao ? 'Editar Usuário' : 'Novo Usuário'}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Fechar">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {erro && <div className="form-error">{erro}</div>}

          <div className="form-row">
            <div className="form-field">
              <label htmlFor="modal-nome">Nome *</label>
              <input id="modal-nome" type="text" value={nome} onChange={e => setNome(e.target.value)} required minLength={2} placeholder="Nome completo" />
            </div>
            <div className="form-field">
              <label htmlFor="modal-email">Email *</label>
              <input id="modal-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="email@exemplo.com" />
            </div>
          </div>

          {!isEdicao && (
            <div className="form-field">
              <label htmlFor="modal-senha">Senha *</label>
              <input id="modal-senha" type="password" value={senha} onChange={e => setSenha(e.target.value)} required minLength={8} placeholder="Mínimo 8 caracteres" />
            </div>
          )}

          <div className="form-row">
            <div className="form-field">
              <label htmlFor="modal-role">Cargo</label>
              <select id="modal-role" value={role} onChange={e => setRole(e.target.value as 'SUPERADMIN' | 'CLIENTE')}>
                <option value="CLIENTE">Cliente</option>
                <option value="SUPERADMIN">Superadmin</option>
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="modal-status">Status</label>
              <select id="modal-status" value={status} onChange={e => setStatus(e.target.value as 'ATIVO' | 'SUSPENSO' | 'INADIMPLENTE')}>
                <option value="ATIVO">Ativo</option>
                <option value="SUSPENSO">Suspenso</option>
                <option value="INADIMPLENTE">Inadimplente</option>
              </select>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={salvando}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={salvando}>
              {salvando ? 'Salvando...' : isEdicao ? 'Salvar Alterações' : 'Criar Usuário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Modal de Reset de Senha ──────────────────────────────────────────────────

function ModalResetSenha({ usuario, onClose }: { usuario: UsuarioAdmin; onClose: () => void }) {
  const [novaSenha, setNovaSenha] = useState('')
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [enviando, setEnviando] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setErro('')
    try {
      await apiPost(`/admin/usuarios/${usuario.id}/reset-senha`, { novaSenha })
      setSucesso(true)
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao redefinir senha')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-sm" role="dialog" aria-modal="true">
        <div className="modal-header">
          <h3>Redefinir Senha</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-form">
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', marginBottom: 16 }}>
            Redefinindo senha de <strong style={{ color: '#fff' }}>{usuario.nome}</strong>.<br />
            Todas as sessões ativas serão encerradas.
          </p>
          {sucesso ? (
            <div className="form-success">✅ Senha redefinida com sucesso! Todas as sessões foram encerradas.</div>
          ) : (
            <form onSubmit={handleSubmit}>
              {erro && <div className="form-error">{erro}</div>}
              <div className="form-field">
                <label htmlFor="reset-nova-senha">Nova Senha</label>
                <input id="reset-nova-senha" type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} required minLength={8} placeholder="Mínimo 8 caracteres" autoFocus />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={onClose} disabled={enviando}>Cancelar</button>
                <button type="submit" className="btn-danger" disabled={enviando || novaSenha.length < 8}>
                  {enviando ? 'Redefinindo...' : 'Redefinir Senha'}
                </button>
              </div>
            </form>
          )}
          {sucesso && (
            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button className="btn-primary" onClick={onClose}>Fechar</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Painel Admin Principal ───────────────────────────────────────────────────

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
  }, [usuario, carregarDados])

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

  if (loading || (!usuario && !loading)) {
    return (
      <div className="admin-loading">
        <div className="admin-spinner" />
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

      <div className="admin-page">
        {/* Header */}
        <div className="admin-header">
          <div>
            <h1 className="admin-title">Painel Administrativo</h1>
            <p className="admin-subtitle">Gestão de usuários e controle de acesso</p>
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
          <div className="admin-stats">
            <div className="stat-card">
              <div className="stat-value">{resumo.total}</div>
              <div className="stat-label">Total de Usuários</div>
            </div>
            <div className="stat-card stat-card-green">
              <div className="stat-value">{resumo.ativos}</div>
              <div className="stat-label">Ativos</div>
            </div>
            <div className="stat-card stat-card-red">
              <div className="stat-value">{resumo.suspensos}</div>
              <div className="stat-label">Suspensos</div>
            </div>
            <div className="stat-card stat-card-orange">
              <div className="stat-value">{resumo.inadimplentes}</div>
              <div className="stat-label">Inadimplentes</div>
            </div>
          </div>
        )}

        {/* Filtros e busca */}
        <div className="admin-filters">
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input
              id="admin-busca"
              type="text"
              className="search-input"
              placeholder="Buscar por nome, email ou ID..."
              value={busca}
              onChange={e => handleBusca(e.target.value)}
            />
          </div>
          <div className="filter-tabs">
            {[
              { value: '', label: 'Todos' },
              { value: 'ATIVO', label: 'Ativos' },
              { value: 'SUSPENSO', label: 'Suspensos' },
              { value: 'INADIMPLENTE', label: 'Inadimplentes' },
            ].map(tab => (
              <button
                key={tab.value}
                className={`filter-tab ${filtroStatus === tab.value ? 'active' : ''}`}
                onClick={() => handleFiltroStatus(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabela */}
        <div className="admin-table-wrap">
          {carregando ? (
            <div className="table-loading">
              <div className="admin-spinner" />
            </div>
          ) : usuarios.length === 0 ? (
            <div className="table-empty">
              <span>👥</span>
              <p>Nenhum usuário encontrado</p>
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Cargo</th>
                  <th>Status</th>
                  <th>Último Login</th>
                  <th>Cadastro</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.id} className={u.status !== 'ATIVO' ? 'row-inactive' : ''}>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar">{u.nome.charAt(0).toUpperCase()}</div>
                        <div>
                          <div className="user-nome">{u.nome}</div>
                          <div className="user-email">{u.email}</div>
                          <div className="user-id">{u.id}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`role-badge ${u.role === 'SUPERADMIN' ? 'role-super' : 'role-cliente'}`}>
                        {ROLE_LABELS[u.role]}
                      </span>
                    </td>
                    <td>
                      <span
                        className="status-badge"
                        style={{ '--status-color': STATUS_LABELS[u.status]?.color } as React.CSSProperties}
                      >
                        {STATUS_LABELS[u.status]?.label || u.status}
                      </span>
                    </td>
                    <td className="date-cell">{formatDate(u.ultimoLogin)}</td>
                    <td className="date-cell">{formatDate(u.createdAt)}</td>
                    <td>
                      <div className="action-btns">
                        {/* Logar como */}
                        {u.role !== 'SUPERADMIN' && (
                          <button
                            className="action-btn action-btn-ghost"
                            title="Logar como este usuário"
                            onClick={() => handleImpersonate(u)}
                            disabled={impersonando === u.id}
                          >
                            {impersonando === u.id ? '⏳' : '👁️'}
                          </button>
                        )}
                        {/* Editar */}
                        <button
                          className="action-btn action-btn-ghost"
                          title="Editar usuário"
                          onClick={() => { setUsuarioEditando(u); setModalAberto(true) }}
                        >
                          ✏️
                        </button>
                        {/* Toggle status */}
                        <button
                          className={`action-btn ${u.status === 'ATIVO' ? 'action-btn-warn' : 'action-btn-success'}`}
                          title={u.status === 'ATIVO' ? 'Suspender' : 'Ativar'}
                          onClick={() => handleToggleStatus(u)}
                        >
                          {u.status === 'ATIVO' ? '🔒' : '🔓'}
                        </button>
                        {/* Reset senha */}
                        <button
                          className="action-btn action-btn-ghost"
                          title="Redefinir senha"
                          onClick={() => setModalResetSenha(u)}
                        >
                          🔑
                        </button>
                        {/* Remover */}
                        <button
                          className="action-btn action-btn-danger"
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
          <div className="pagination">
            <span className="pagination-info">
              {paginacao.total} usuários • Página {paginacao.pagina} de {paginacao.totalPaginas}
            </span>
            <div className="pagination-btns">
              <button
                className="pagination-btn"
                disabled={paginacao.pagina === 1}
                onClick={() => carregarDados(paginacao.pagina - 1)}
              >
                ← Anterior
              </button>
              <button
                className="pagination-btn"
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

      <style jsx>{`
        .admin-page {
          padding: 0;
          max-width: 1400px;
          margin: 0 auto;
        }

        /* ── Header ─────────────────────────────────────── */
        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 28px;
          gap: 16px;
          flex-wrap: wrap;
        }

        .admin-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--text-primary, #1a1a1a);
          margin: 0 0 4px;
        }

        .admin-subtitle {
          font-size: 0.875rem;
          color: var(--text-secondary, #666);
          margin: 0;
        }

        /* ── Loading ─────────────────────────────────────── */
        .admin-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 200px;
          gap: 12px;
          color: #666;
        }

        .admin-spinner {
          width: 28px;
          height: 28px;
          border: 3px solid rgba(45, 138, 78, 0.2);
          border-top-color: #2d8a4e;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* ── Stats ───────────────────────────────────────── */
        .admin-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: var(--card-bg, #fff);
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 14px;
          padding: 20px;
          text-align: center;
          transition: transform 0.2s, box-shadow 0.2s;
          border-left: 4px solid #6b7280;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }

        .stat-card-green { border-left-color: #2d8a4e; }
        .stat-card-red   { border-left-color: #dc3545; }
        .stat-card-orange { border-left-color: #fd7e14; }

        .stat-value {
          font-size: 2rem;
          font-weight: 800;
          color: var(--text-primary, #1a1a1a);
          line-height: 1;
          margin-bottom: 6px;
        }

        .stat-label {
          font-size: 0.8rem;
          color: var(--text-secondary, #666);
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* ── Filtros ─────────────────────────────────────── */
        .admin-filters {
          display: flex;
          gap: 16px;
          margin-bottom: 20px;
          flex-wrap: wrap;
          align-items: center;
        }

        .search-wrap {
          position: relative;
          flex: 1;
          min-width: 200px;
        }

        .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          font-size: 0.9rem;
        }

        .search-input {
          width: 100%;
          padding: 10px 14px 10px 40px;
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 10px;
          font-size: 0.875rem;
          background: var(--card-bg, #fff);
          color: var(--text-primary, #1a1a1a);
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
          font-family: inherit;
          outline: none;
        }

        .search-input:focus {
          border-color: #2d8a4e;
          box-shadow: 0 0 0 3px rgba(45,138,78,0.12);
        }

        .filter-tabs {
          display: flex;
          gap: 6px;
          background: var(--card-bg, #fff);
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 10px;
          padding: 4px;
        }

        .filter-tab {
          padding: 7px 14px;
          border: none;
          border-radius: 7px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          background: transparent;
          color: var(--text-secondary, #666);
          transition: all 0.2s;
          font-family: inherit;
        }

        .filter-tab.active {
          background: #2d8a4e;
          color: #fff;
        }

        .filter-tab:hover:not(.active) {
          background: rgba(45,138,78,0.08);
          color: #2d8a4e;
        }

        /* ── Tabela ──────────────────────────────────────── */
        .admin-table-wrap {
          background: var(--card-bg, #fff);
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 16px;
          overflow: hidden;
          margin-bottom: 20px;
        }

        .table-loading, .table-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          gap: 12px;
          color: var(--text-secondary, #666);
        }

        .table-empty span { font-size: 2.5rem; }
        .table-empty p { margin: 0; font-size: 0.9rem; }

        .admin-table {
          width: 100%;
          border-collapse: collapse;
        }

        .admin-table th {
          padding: 12px 16px;
          text-align: left;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          color: var(--text-secondary, #666);
          background: var(--table-header-bg, #f9fafb);
          border-bottom: 1px solid var(--border-color, #e5e7eb);
        }

        .admin-table td {
          padding: 14px 16px;
          border-bottom: 1px solid var(--border-color, #f3f4f6);
          vertical-align: middle;
        }

        .admin-table tbody tr:last-child td {
          border-bottom: none;
        }

        .admin-table tbody tr {
          transition: background 0.15s;
        }

        .admin-table tbody tr:hover {
          background: var(--table-row-hover, #f9fafb);
        }

        .row-inactive {
          opacity: 0.65;
        }

        .user-cell {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .user-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: linear-gradient(135deg, #2d8a4e, #1f6b3a);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 1rem;
          color: #fff;
          flex-shrink: 0;
        }

        .user-nome {
          font-weight: 600;
          font-size: 0.9rem;
          color: var(--text-primary, #1a1a1a);
        }

        .user-email {
          font-size: 0.8rem;
          color: var(--text-secondary, #666);
        }

        .user-id {
          font-size: 0.7rem;
          color: var(--text-muted, #999);
          font-family: monospace;
          margin-top: 1px;
        }

        .role-badge {
          display: inline-block;
          padding: 3px 10px;
          border-radius: 20px;
          font-size: 0.78rem;
          font-weight: 600;
        }

        .role-super {
          background: rgba(124, 58, 237, 0.12);
          color: #7c3aed;
        }

        .role-cliente {
          background: rgba(45, 138, 78, 0.1);
          color: #2d8a4e;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 0.78rem;
          font-weight: 600;
          background: color-mix(in srgb, var(--status-color) 12%, transparent);
          color: var(--status-color);
        }

        .status-badge::before {
          content: '';
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--status-color);
          flex-shrink: 0;
        }

        .date-cell {
          font-size: 0.8rem;
          color: var(--text-secondary, #666);
          white-space: nowrap;
        }

        /* ── Botões de ação ──────────────────────────────── */
        .action-btns {
          display: flex;
          gap: 6px;
          flex-wrap: nowrap;
        }

        .action-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 1px solid var(--border-color, #e5e7eb);
          background: transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.95rem;
          transition: all 0.15s;
          flex-shrink: 0;
        }

        .action-btn:hover:not(:disabled) { transform: scale(1.1); }
        .action-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .action-btn-ghost:hover:not(:disabled) {
          background: rgba(0,0,0,0.05);
          border-color: rgba(0,0,0,0.15);
        }

        .action-btn-success:hover:not(:disabled) {
          background: rgba(45,138,78,0.1);
          border-color: #2d8a4e;
        }

        .action-btn-warn:hover:not(:disabled) {
          background: rgba(253,126,20,0.1);
          border-color: #fd7e14;
        }

        .action-btn-danger:hover:not(:disabled) {
          background: rgba(220,53,69,0.1);
          border-color: #dc3545;
        }

        /* ── Paginação ───────────────────────────────────── */
        .pagination {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }

        .pagination-info {
          font-size: 0.85rem;
          color: var(--text-secondary, #666);
        }

        .pagination-btns {
          display: flex;
          gap: 8px;
        }

        .pagination-btn {
          padding: 8px 16px;
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 8px;
          background: var(--card-bg, #fff);
          color: var(--text-primary, #1a1a1a);
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.15s;
          font-family: inherit;
        }

        .pagination-btn:hover:not(:disabled) {
          background: #2d8a4e;
          color: #fff;
          border-color: #2d8a4e;
        }

        .pagination-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        /* ── Botões globais ──────────────────────────────── */
        :global(.btn-primary) {
          padding: 10px 20px;
          background: linear-gradient(135deg, #2d8a4e, #1f6b3a);
          border: none;
          border-radius: 10px;
          color: #fff;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }

        :global(.btn-primary):hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(45,138,78,0.35);
        }

        :global(.btn-secondary) {
          padding: 10px 20px;
          background: transparent;
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 10px;
          color: var(--text-primary, #1a1a1a);
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }

        :global(.btn-danger) {
          padding: 10px 20px;
          background: linear-gradient(135deg, #dc3545, #b02a37);
          border: none;
          border-radius: 10px;
          color: #fff;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }

        /* ── Modal ───────────────────────────────────────── */
        :global(.modal-overlay) {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(4px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        :global(.modal) {
          background: var(--card-bg, #fff);
          border-radius: 18px;
          width: 100%;
          max-width: 560px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          animation: modalIn 0.2s ease;
          overflow: hidden;
        }

        :global(.modal-sm) {
          max-width: 400px;
        }

        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(-10px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }

        :global(.modal-header) {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border-color, #e5e7eb);
        }

        :global(.modal-header h3) {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text-primary, #1a1a1a);
          margin: 0;
        }

        :global(.modal-close) {
          background: none;
          border: none;
          font-size: 1rem;
          cursor: pointer;
          color: var(--text-secondary, #666);
          padding: 4px 8px;
          border-radius: 6px;
          transition: background 0.15s;
        }

        :global(.modal-close):hover {
          background: rgba(0,0,0,0.06);
        }

        :global(.modal-form) {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        :global(.form-row) {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        :global(.form-field) {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        :global(.form-field label) {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary, #666);
          text-transform: uppercase;
          letter-spacing: 0.6px;
        }

        :global(.form-field input),
        :global(.form-field select) {
          padding: 10px 12px;
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 8px;
          font-size: 0.875rem;
          background: var(--input-bg, #fff);
          color: var(--text-primary, #1a1a1a);
          font-family: inherit;
          transition: border-color 0.2s, box-shadow 0.2s;
          outline: none;
        }

        :global(.form-field input):focus,
        :global(.form-field select):focus {
          border-color: #2d8a4e;
          box-shadow: 0 0 0 3px rgba(45,138,78,0.12);
        }

        :global(.form-error) {
          padding: 10px 14px;
          background: rgba(220,53,69,0.08);
          border: 1px solid rgba(220,53,69,0.25);
          border-radius: 8px;
          color: #dc3545;
          font-size: 0.85rem;
        }

        :global(.form-success) {
          padding: 10px 14px;
          background: rgba(45,138,78,0.08);
          border: 1px solid rgba(45,138,78,0.25);
          border-radius: 8px;
          color: #2d8a4e;
          font-size: 0.85rem;
        }

        :global(.modal-actions) {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          padding-top: 4px;
        }

        @media (max-width: 640px) {
          :global(.form-row) { grid-template-columns: 1fr; }
          .admin-table { display: block; overflow-x: auto; }
          .admin-filters { flex-direction: column; }
          .filter-tabs { flex-wrap: wrap; }
        }
      `}</style>
    </>
  )
}
