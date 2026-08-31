import { useEffect, useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { apiGet, apiPost, apiPatch, type Mesa, type Comanda, type Garcom } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'

/**
 * Interface de kiosk para operações rápidas.
 * Permite criar novas comandas, listar comandas abertas e fechar comandas existentes.
 */
export default function KioskPage() {
  const router = useRouter()
  const { usuario, loading } = useAuth()
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [comandasAbertas, setComandasAbertas] = useState<Comanda[]>([])
  const [garcons, setGarcons] = useState<Garcom[]>([])
  const [tela, setTela] = useState<'menu' | 'nova' | 'comandas' | 'fechar'>('menu')
  const [mesaSelecionada, setMesaSelecionada] = useState('')
  const [garcomSelecionado, setGarcomSelecionado] = useState('')
  const [comandaFechando, setComandaFechando] = useState<Comanda | null>(null)
  const [erro, setErro] = useState('')
  const [processando, setProcessando] = useState(false)

  useEffect(() => {
    if (!loading && !usuario) router.replace('/login')
  }, [usuario, loading, router])

  useEffect(() => {
    if (usuario) {
      apiGet<Mesa[]>('/mesas').then(setMesas)
      apiGet<Garcom[]>('/garcons').then(setGarcons)
    }
  }, [usuario])

  function carregarComandas() {
    apiGet<{ comandas: Comanda[] }>('/comandas?status=ABERTA')
      .then((r) => setComandasAbertas(r.comandas))
      .catch(() => setComandasAbertas([]))
  }

  useEffect(() => {
    if (tela === 'comandas' || tela === 'fechar') carregarComandas()
  }, [tela])

  async function criarComanda() {
    if (!mesaSelecionada) return
    setProcessando(true)
    setErro('')
    try {
      const c = await apiPost<{ id: string }>('/comandas', {
        mesaId: mesaSelecionada,
        garcomId: garcomSelecionado || undefined,
      })
      router.push(`/comandas/${c.id}`)
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao criar comanda')
    } finally {
      setProcessando(false)
    }
  }

  async function fecharComanda(comanda: Comanda) {
    setProcessando(true)
    try {
      await apiPatch(`/comandas/${comanda.id}/fechar`, { pagamentos: [] })
      carregarComandas()
      setComandaFechando(null)
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao fechar comanda')
    } finally {
      setProcessando(false)
    }
  }

  if (loading || !usuario) {
    return (
      <div className="kiosk-loading">
        <div className="kiosk-spinner" />
        <p>Carregando...</p>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Kiosk — Restaurante</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
      </Head>

      <div className="kiosk-container">
        <div className="kiosk-header">
          <h1>Restaurante</h1>
          <span className="kiosk-user">{usuario.nome}</span>
        </div>

        {erro && (
          <div className="kiosk-error">{erro}</div>
        )}

        {tela === 'menu' && (
          <div className="kiosk-menu">
            <button className="kiosk-button kiosk-btn-primary" onClick={() => { setTela('nova'); setErro('') }}>
              <span className="kiosk-btn-icon">+</span>
              <span className="kiosk-btn-label">Nova Comanda</span>
            </button>
            <button className="kiosk-button kiosk-btn-secondary" onClick={() => { setTela('comandas'); setErro('') }}>
              <span className="kiosk-btn-icon">📋</span>
              <span className="kiosk-btn-label">Comandas Abertas</span>
              {comandasAbertas.length > 0 && (
                <span className="kiosk-btn-badge">{comandasAbertas.length}</span>
              )}
            </button>
            <button className="kiosk-button kiosk-btn-outline" onClick={() => { setTela('fechar'); setErro('') }}>
              <span className="kiosk-btn-icon">✔</span>
              <span className="kiosk-btn-label">Fechar Comanda</span>
            </button>
            <button className="kiosk-button kiosk-btn-back" onClick={() => router.push('/comandas')}>
              <span className="kiosk-btn-icon">←</span>
              <span className="kiosk-btn-label">Sair do Kiosk</span>
            </button>
          </div>
        )}

        {tela === 'nova' && (
          <div className="kiosk-form">
            <h2>Nova Comanda</h2>
            <div className="kiosk-field">
              <label>Mesa</label>
              <div className="kiosk-select-grid">
                {mesas.filter(m => m.status === 'LIVRE').map(m => (
                  <button
                    key={m.id}
                    className={`kiosk-select-btn ${mesaSelecionada === m.id ? 'kiosk-select-active' : ''}`}
                    onClick={() => setMesaSelecionada(m.id)}
                  >
                    {m.numero}
                  </button>
                ))}
                {mesas.filter(m => m.status === 'LIVRE').length === 0 && (
                  <p className="kiosk-empty">Nenhuma mesa livre</p>
                )}
              </div>
            </div>

            <div className="kiosk-field">
              <label>Garçom (opcional)</label>
              <div className="kiosk-select-grid">
                {garcons.filter(g => g.ativo).map(g => (
                  <button
                    key={g.id}
                    className={`kiosk-select-btn ${garcomSelecionado === g.id ? 'kiosk-select-active' : ''}`}
                    onClick={() => setGarcomSelecionado(garcomSelecionado === g.id ? '' : g.id)}
                  >
                    {g.nome}
                  </button>
                ))}
              </div>
            </div>

            <div className="kiosk-actions">
              <button className="kiosk-button kiosk-btn-back" onClick={() => { setTela('menu'); setErro('') }}>
                <span className="kiosk-btn-icon">←</span>
                <span className="kiosk-btn-label">Voltar</span>
              </button>
              <button
                className="kiosk-button kiosk-btn-primary kiosk-btn-large"
                onClick={criarComanda}
                disabled={!mesaSelecionada || processando}
              >
                {processando ? 'Criando...' : 'Criar Comanda'}
              </button>
            </div>
          </div>
        )}

        {tela === 'comandas' && (
          <div className="kiosk-form">
            <h2>Comandas Abertas</h2>
            <div className="kiosk-comandas-list">
              {comandasAbertas.length === 0 ? (
                <p className="kiosk-empty">Nenhuma comanda aberta</p>
              ) : (
                comandasAbertas.map(c => (
                  <button
                    key={c.id}
                    className="kiosk-comanda-card"
                    onClick={() => router.push(`/comandas/${c.id}`)}
                  >
                    <div className="kiosk-comanda-info">
                      <span className="kiosk-comanda-mesa">Mesa {c.mesa.numero}</span>
                      <span className="kiosk-comanda-detalhes">
                        {c.garcom?.nome || 'Sem garçom'} | {c.itens.length} itens
                      </span>
                    </div>
                    <span className="kiosk-comanda-total">R$ {c.total.toFixed(2)}</span>
                  </button>
                ))
              )}
            </div>
            <div className="kiosk-actions">
              <button className="kiosk-button kiosk-btn-back" onClick={() => setTela('menu')}>
                <span className="kiosk-btn-icon">←</span>
                <span className="kiosk-btn-label">Voltar</span>
              </button>
            </div>
          </div>
        )}

        {tela === 'fechar' && (
          <div className="kiosk-form">
            <h2>Fechar Comanda</h2>
            <div className="kiosk-comandas-list">
              {comandasAbertas.length === 0 ? (
                <p className="kiosk-empty">Nenhuma comanda para fechar</p>
              ) : (
                comandasAbertas.map(c => (
                  <button
                    key={c.id}
                    className="kiosk-comanda-card kiosk-comanda-fechar"
                    onClick={() => setComandaFechando(c)}
                  >
                    <div className="kiosk-comanda-info">
                      <span className="kiosk-comanda-mesa">Mesa {c.mesa.numero}</span>
                      <span className="kiosk-comanda-detalhes">
                        {c.garcom?.nome || 'Sem garçom'} | {c.itens.length} itens
                      </span>
                    </div>
                    <span className="kiosk-comanda-total">R$ {c.total.toFixed(2)}</span>
                  </button>
                ))
              )}
            </div>
            <div className="kiosk-actions">
              <button className="kiosk-button kiosk-btn-back" onClick={() => setTela('menu')}>
                <span className="kiosk-btn-icon">←</span>
                <span className="kiosk-btn-label">Voltar</span>
              </button>
            </div>
          </div>
        )}

        {comandaFechando && (
          <div className="kiosk-modal-overlay" onClick={() => setComandaFechando(null)}>
            <div className="kiosk-modal" onClick={e => e.stopPropagation()}>
              <h2>Confirmar Fechamento</h2>
              <p className="kiosk-modal-text">
                Mesa {comandaFechando.mesa.numero} — Total: <strong>R$ {comandaFechando.total.toFixed(2)}</strong>
              </p>
              <div className="kiosk-actions">
                <button className="kiosk-button kiosk-btn-back" onClick={() => setComandaFechando(null)}>
                  Cancelar
                </button>
                <button
                  className="kiosk-button kiosk-btn-danger kiosk-btn-large"
                  onClick={() => fecharComanda(comandaFechando)}
                  disabled={processando}
                >
                  {processando ? 'Fechando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
