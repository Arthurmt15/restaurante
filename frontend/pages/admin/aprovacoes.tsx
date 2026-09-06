import { useEffect, useState } from 'react'
import Head from 'next/head'
import { apiGet, apiPost, apiPut } from '../../lib/api'
import { toast } from 'react-hot-toast'

interface UsuarioPendente {
  _id: string
  email: string
  nome: string
  imagem?: string
  status: string
  createdAt: string
}

interface Barraca {
  id: string
  nome: string
  donoEmail: string
}

export default function AprovacoesPage() {
  const [pendentes, setPendentes] = useState<UsuarioPendente[]>([])
  const [barracas, setBarracas] = useState<Barraca[]>([])
  const [loading, setLoading] = useState(true)
  const [processando, setProcessando] = useState<string | null>(null)

  // Modal de aprovação
  const [modalAberto, setModalAberto] = useState(false)
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<UsuarioPendente | null>(null)
  const [barracaId, setBarracaId] = useState('')
  const [role, setRole] = useState<'CLIENTE' | 'GARCOM'>('CLIENTE')
  const [novoNomeBarraca, setNovoNomeBarraca] = useState('')

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    setLoading(true)
    try {
      const [pendentesRes, barracasRes] = await Promise.allSettled([
        apiGet<{ pendentes: UsuarioPendente[] }>('/admin/aprovacoes'),
        apiGet<Barraca[]>('/admin/aprovacoes/barracas'),
      ])

      if (pendentesRes.status === 'fulfilled') {
        setPendentes(pendentesRes.value.pendentes || [])
      }
      if (barracasRes.status === 'fulfilled') {
        setBarracas(barracasRes.value || [])
      }
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  function abrirModal(usuario: UsuarioPendente) {
    setUsuarioSelecionado(usuario)
    setBarracaId(barracas.length > 0 ? barracas[0].id : '')
    setRole('CLIENTE')
    setNovoNomeBarraca('')
    setModalAberto(true)
  }

  async function aprovar() {
    if (!usuarioSelecionado) return

    const body: Record<string, string> = {
      barracaId: barracaId || '',
      role,
    }
    if (novoNomeBarraca.trim()) {
      body.nomeBarraca = novoNomeBarraca.trim()
    }

    setProcessando(usuarioSelecionado._id)
    try {
      await apiPost(`/admin/aprovacoes/${usuarioSelecionado._id}/aprovar`, body)
      toast.success(`${usuarioSelecionado.nome} aprovado(a) como ${role}!`)
      setModalAberto(false)
      setUsuarioSelecionado(null)
      carregarDados()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao aprovar')
    } finally {
      setProcessando(null)
    }
  }

  async function rejeitar(usuario: UsuarioPendente) {
    if (!confirm(`Rejeitar e remover ${usuario.nome}?`)) return

    setProcessando(usuario._id)
    try {
      await apiPost(`/admin/aprovacoes/${usuario._id}/rejeitar`, {})
      toast.success(`${usuario.nome} rejeitado`)
      carregarDados()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao rejeitar')
    } finally {
      setProcessando(null)
    }
  }

  return (
    <>
      <Head>
        <title>Aprovações — Admin</title>
      </Head>

      <div>
        <div className="page-header">
          <h2>Aprovações de Usuários</h2>
        </div>

        {loading ? (
          <div className="empty-state">Carregando...</div>
        ) : pendentes.length === 0 ? (
          <div className="card">
            <div className="empty-state">Nenhum usuário pendente de aprovação</div>
          </div>
        ) : (
          <div className="card">
            <table>
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Email</th>
                  <th>Cadastro</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {pendentes.map((u) => (
                  <tr key={u._id}>
                    <td data-label="Usuário">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {u.imagem && (
                          <img src={u.imagem} alt="" style={{ width: 28, height: 28, borderRadius: '50%' }} />
                        )}
                        {u.nome}
                      </div>
                    </td>
                    <td data-label="Email">{u.email}</td>
                    <td data-label="Cadastro">
                      {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td data-label="Ações">
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => abrirModal(u)}
                          disabled={processando === u._id}
                        >
                          Aprovar
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => rejeitar(u)}
                          disabled={processando === u._id}
                        >
                          Rejeitar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Aprovação */}
      {modalAberto && usuarioSelecionado && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
          onClick={() => setModalAberto(false)}
        >
          <div
            className="card"
            style={{ maxWidth: 480, width: '90%', padding: '1.5rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: '1rem' }}>Aprovar {usuarioSelecionado.nome}</h3>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>
                Barraca
              </label>
              <select
                value={barracaId}
                onChange={(e) => setBarracaId(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)' }}
              >
                <option value="">— Criar nova barraca —</option>
                {barracas.map((b) => (
                  <option key={b.id} value={b.id}>{b.nome} ({b.donoEmail})</option>
                ))}
              </select>
            </div>

            {!barracaId && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>
                  Nome da Nova Barraca
                </label>
                <input
                  type="text"
                  value={novoNomeBarraca}
                  onChange={(e) => setNovoNomeBarraca(e.target.value)}
                  placeholder="Ex: Barraca da Vania"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)' }}
                />
              </div>
            )}

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>
                Papel
              </label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="role"
                    value="CLIENTE"
                    checked={role === 'CLIENTE'}
                    onChange={() => setRole('CLIENTE')}
                  />
                  Cliente (acesso total)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="role"
                    value="GARCOM"
                    checked={role === 'GARCOM'}
                    onChange={() => setRole('GARCOM')}
                  />
                  Garçom
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                className="btn"
                onClick={() => setModalAberto(false)}
                disabled={processando !== null}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={aprovar}
                disabled={processando !== null || (!barracaId && !novoNomeBarraca.trim())}
              >
                {processando ? 'Processando...' : 'Aprovar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
