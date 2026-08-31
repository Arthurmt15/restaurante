import { useState, useEffect, useCallback, useRef } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useAuth } from '../../contexts/AuthContext'
import { apiGet, apiPost, apiPatch, apiDelete, type UsuarioAdmin, type PaginacaoUsuarios, type ResumoAdmin } from '../../lib/api'
import { setImpersonationToken } from '../../lib/auth'
import ModalUsuario from '../../components/admin/ModalUsuario'
import ModalResetSenha from '../../components/admin/ModalResetSenha'
import ModalVincular from '../../components/admin/ModalVincular'
import AdminUsuariosTable from '../../components/admin/AdminUsuariosTable'
import styles from '../../components/admin/AdminPanel.module.css'

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
        <AdminUsuariosTable
          usuarios={usuarios}
          carregando={carregando}
          paginacao={paginacao}
          impersonando={impersonando}
          styles={styles}
          onImpersonate={handleImpersonate}
          onEditar={(u) => { setUsuarioEditando(u); setModalAberto(true) }}
          onToggleStatus={handleToggleStatus}
          onResetSenha={(u) => setModalResetSenha(u)}
          onVincular={(u) => setModalVincular(u)}
          onDesvincular={handleDesvincular}
          onRemover={handleRemover}
          onPagina={(p) => carregarDados(p)}
        />
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
