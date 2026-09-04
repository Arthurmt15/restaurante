/**
 * Página de detalhes do usuário (admin).
 *
 * Exibe informações completas de um usuário específico, incluindo:
 * - Dados pessoais (nome, email, role, status)
 * - Datas importantes (cadastro, último login)
 * - Atividades recentes no sistema
 * - Estatísticas de uso
 *
 * Acessível apenas por SUPERADMIN.
 * Rota: /admin/usuarios/[id]
 */
import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useAuth } from '../../../contexts/AuthContext'
import { apiGet, type UsuarioAdmin } from '../../../lib/api'
import styles from '../../../components/admin/AdminPanel.module.css'

/** Interface para atividade do usuário */
interface Atividade {
  id: string
  garcomId: string
  garcomNome: string
  acao: string
  detalhes: string
  mesaNumero: number
  tenantId: string
  createdAt: string
}

/** Interface para dados do usuário detalhado */
interface UsuarioDetalhado extends UsuarioAdmin {
  googleId?: string
  imagem?: string
}

/**
 * Formata uma data ISO para o formato brasileiro.
 * @param iso - Data em formato ISO opcional.
 * @returns Data formatada ou 'Nunca' caso não informada.
 */
function formatDate(iso?: string) {
  if (!iso) return 'Nunca'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

/** Labels de exibição para os status de usuário. */
const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ATIVO: { label: 'Ativo', color: '#2d8a4e' },
  SUSPENSO: { label: 'Suspenso', color: '#dc3545' },
  INADIMPLENTE: { label: 'Inadimplente', color: '#fd7e14' },
}

/** Labels de exibição para os papéis de usuário. */
const ROLE_LABELS: Record<string, string> = {
  SUPERADMIN: '👑 Superadmin',
  CLIENTE: '👤 Cliente',
  GARCOM: '🍽️ Garçom',
}

/**
 * Página de detalhes do usuário.
 *
 * Carrega os dados do usuário pelo ID da URL e exibe informações
 * detalhadas incluindo atividades recentes e estatísticas.
 */
export default function UsuarioDetalhesPage() {
  const router = useRouter()
  const { id } = router.query
  const { usuario, loading: authLoading } = useAuth()

  const [usuarioData, setUsuarioData] = useState<UsuarioDetalhado | null>(null)
  const [atividades, setAtividades] = useState<Atividade[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  /** Redirecionar se não for superadmin */
  useEffect(() => {
    if (!authLoading && usuario && usuario.role !== 'SUPERADMIN') {
      router.replace('/')
    }
  }, [usuario, authLoading, router])

  /** Carregar dados do usuário e atividades */
  const carregarDados = useCallback(async () => {
    if (!id || typeof id !== 'string') return

    setCarregando(true)
    setErro('')
    try {
      const [dadosUsuario, dadosAtividades] = await Promise.all([
        apiGet<UsuarioDetalhado>(`/admin/usuarios/${id}`),
        apiGet<Atividade[]>(`/atividades?usuarioId=${id}`).catch(() => []),
      ])
      setUsuarioData(dadosUsuario)
      setAtividades(dadosAtividades)
    } catch (err) {
      setErro('Usuário não encontrado ou erro ao carregar dados.')
    } finally {
      setCarregando(false)
    }
  }, [id])

  useEffect(() => {
    if (id) carregarDados()
  }, [id, carregarDados])

  if (authLoading || carregando) {
    return (
      <div className={styles.adminLoading}>
        <div className={styles.adminSpinner} />
        <span>Carregando...</span>
      </div>
    )
  }

  if (erro) {
    return (
      <div className={styles.adminPage}>
        <Head>
          <title>Erro — Restaurante</title>
        </Head>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <h2>{erro}</h2>
          <Link href="/admin" style={{ color: '#c9953f', marginTop: '16px', display: 'inline-block' }}>
            ← Voltar ao Painel Admin
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>{usuarioData?.nome || 'Usuário'} — Admin</title>
        <meta name="description" content={`Detalhes do usuário ${usuarioData?.nome}`} />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className={styles.adminPage}>
        {/* Cabeçalho com botão voltar */}
        <div className={styles.adminHeader}>
          <div>
            <Link
              href="/admin"
              style={{
                color: '#c9953f',
                textDecoration: 'none',
                fontSize: '0.875rem',
                marginBottom: '8px',
                display: 'inline-block',
              }}
            >
              ← Voltar ao Painel Admin
            </Link>
            <h1 className={styles.adminTitle}>
              {usuarioData?.nome || 'Usuário'}
            </h1>
            <p className={styles.adminSubtitle}>{usuarioData?.email}</p>
          </div>
        </div>

        {/* Cards de informações */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginTop: '24px' }}>
          {/* Card: Dados Pessoais */}
          <div style={{
            background: '#1e1e1e',
            border: '1px solid #333',
            borderRadius: '12px',
            padding: '24px',
          }}>
            <h3 style={{ color: '#c9953f', fontSize: '1rem', marginBottom: '16px' }}>
              Dados Pessoais
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <div style={{ color: '#777', fontSize: '0.75rem', textTransform: 'uppercase' }}>Nome</div>
                <div style={{ color: '#fff', fontSize: '0.95rem' }}>{usuarioData?.nome}</div>
              </div>
              <div>
                <div style={{ color: '#777', fontSize: '0.75rem', textTransform: 'uppercase' }}>Email</div>
                <div style={{ color: '#fff', fontSize: '0.95rem' }}>{usuarioData?.email}</div>
              </div>
              <div>
                <div style={{ color: '#777', fontSize: '0.75rem', textTransform: 'uppercase' }}>ID</div>
                <div style={{ color: '#888', fontSize: '0.8rem', fontFamily: 'monospace' }}>{usuarioData?.id}</div>
              </div>
              {usuarioData?.googleId && (
                <div>
                  <div style={{ color: '#777', fontSize: '0.75rem', textTransform: 'uppercase' }}>Google ID</div>
                  <div style={{ color: '#888', fontSize: '0.8rem', fontFamily: 'monospace' }}>{usuarioData.googleId}</div>
                </div>
              )}
            </div>
          </div>

          {/* Card: Status e Permissões */}
          <div style={{
            background: '#1e1e1e',
            border: '1px solid #333',
            borderRadius: '12px',
            padding: '24px',
          }}>
            <h3 style={{ color: '#c9953f', fontSize: '1rem', marginBottom: '16px' }}>
              Status e Permissões
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <div style={{ color: '#777', fontSize: '0.75rem', textTransform: 'uppercase' }}>Cargo</div>
                <div style={{ color: '#fff', fontSize: '0.95rem' }}>
                  {ROLE_LABELS[usuarioData?.role || ''] || usuarioData?.role}
                </div>
              </div>
              <div>
                <div style={{ color: '#777', fontSize: '0.75rem', textTransform: 'uppercase' }}>Status</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    display: 'inline-block',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: STATUS_LABELS[usuarioData?.status || '']?.color || '#666',
                  }} />
                  <span style={{ color: '#fff', fontSize: '0.95rem' }}>
                    {STATUS_LABELS[usuarioData?.status || '']?.label || usuarioData?.status}
                  </span>
                </div>
              </div>
              <div>
                <div style={{ color: '#777', fontSize: '0.75rem', textTransform: 'uppercase' }}>Permissões</div>
                <div style={{ color: '#fff', fontSize: '0.85rem', lineHeight: '1.6' }}>
                  {usuarioData?.role === 'SUPERADMIN' && (
                    <>
                      ✓ Gerenciar todos os usuários<br />
                      ✓ Ver atividades de cada usuário<br />
                      ✓ Relatórios gerais<br />
                      ✓ Impersonar usuários<br />
                      ✓ Gerenciar restaurante<br />
                      ✓ Gerenciar estoque<br />
                      ✓ Configurações
                    </>
                  )}
                  {usuarioData?.role === 'CLIENTE' && (
                    <>
                      ✓ Gerenciar restaurante<br />
                      ✓ Gerenciar comandas<br />
                      ✓ Ver relatórios<br />
                      ✓ Gerenciar estoque<br />
                      ✓ Configurações<br />
                      ✓ Ver dashboard
                    </>
                  )}
                  {usuarioData?.role === 'GARCOM' && (
                    <>
                      ✓ Gerenciar comandas<br />
                      ✓ Ver apenas suas comandas<br />
                      ✓ Ver dashboard<br />
                      ✓ Ver relatório próprio
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card: Datas */}
          <div style={{
            background: '#1e1e1e',
            border: '1px solid #333',
            borderRadius: '12px',
            padding: '24px',
          }}>
            <h3 style={{ color: '#c9953f', fontSize: '1rem', marginBottom: '16px' }}>
              Datas
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <div style={{ color: '#777', fontSize: '0.75rem', textTransform: 'uppercase' }}>Cadastro</div>
                <div style={{ color: '#fff', fontSize: '0.95rem' }}>{formatDate(usuarioData?.createdAt)}</div>
              </div>
              <div>
                <div style={{ color: '#777', fontSize: '0.75rem', textTransform: 'uppercase' }}>Último Login</div>
                <div style={{ color: '#fff', fontSize: '0.95rem' }}>{formatDate(usuarioData?.ultimoLogin)}</div>
              </div>
              <div>
                <div style={{ color: '#777', fontSize: '0.75rem', textTransform: 'uppercase' }}>Última Atualização</div>
                <div style={{ color: '#fff', fontSize: '0.95rem' }}>{formatDate(usuarioData?.updatedAt)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Atividades Recentes */}
        {atividades.length > 0 && (
          <div style={{
            background: '#1e1e1e',
            border: '1px solid #333',
            borderRadius: '12px',
            padding: '24px',
            marginTop: '24px',
          }}>
            <h3 style={{ color: '#c9953f', fontSize: '1rem', marginBottom: '16px' }}>
              Atividades Recentes
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {atividades.map((atividade) => (
                <div
                  key={atividade.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    background: '#252525',
                    borderRadius: '8px',
                  }}
                >
                  <div>
                    <span style={{ color: '#c9953f', fontWeight: 600 }}>{atividade.acao}</span>
                    {atividade.detalhes && (
                      <span style={{ color: '#888', marginLeft: '8px' }}>— {atividade.detalhes}</span>
                    )}
                    {atividade.mesaNumero && (
                      <span style={{ color: '#666', marginLeft: '8px' }}>(Mesa {atividade.mesaNumero})</span>
                    )}
                  </div>
                  <span style={{ color: '#666', fontSize: '0.8rem' }}>{formatDate(atividade.createdAt)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sem atividades */}
        {atividades.length === 0 && usuarioData?.role !== 'SUPERADMIN' && (
          <div style={{
            background: '#1e1e1e',
            border: '1px solid #333',
            borderRadius: '12px',
            padding: '24px',
            marginTop: '24px',
            textAlign: 'center',
            color: '#666',
          }}>
            Nenhuma atividade recente encontrada.
          </div>
        )}
      </div>
    </>
  )
}
