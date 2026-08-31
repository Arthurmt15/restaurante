import { useEffect, useState } from 'react'
import { apiGet, apiPost, apiPut, apiPatch, apiDelete, type Garcom, type GarcomRanking, type Comanda } from '../../lib/api'
import GarconsRelatorio from '../../components/garcom/GarconsRelatorio'
import GarconsPrintView from '../../components/garcom/GarconsPrintView'
import GarconsGerenciar from '../../components/garcom/GarconsGerenciar'

/**
 * Página de gerenciamento de garçons.
 * Permite cadastrar, editar, desativar e reativar garçons, configurar acessos ao sistema,
 * visualizar ranking de vendas individuais e imprimir relatórios por garçom.
 */
export default function GarconsPage() {
  const [garcons, setGarcons] = useState<Garcom[]>([])
  const [vendas, setVendas] = useState<GarcomRanking[]>([])
  const [comandasPorGarcom, setComandasPorGarcom] = useState<Record<string, Comanda[]>>({})
  const [selecionados, setSelecionados] = useState<Record<string, boolean>>({})
  const [expandido, setExpandido] = useState<string | null>(null)
  const [novoNome, setNovoNome] = useState('')
  const [editando, setEditando] = useState<Garcom | null>(null)
  const [carregando, setCarregando] = useState<Record<string, boolean>>({})
  const [imprimindo, setImprimindo] = useState(false)

  // Estados do Modal de Acesso
  const [modalAcesso, setModalAcesso] = useState<Garcom | null>(null)
  const [modoAcesso, setModoAcesso] = useState<'CRIAR' | 'VINCULAR'>('CRIAR')
  const [emailAcesso, setEmailAcesso] = useState('')
  const [senhaAcesso, setSenhaAcesso] = useState('')
  const [erroAcesso, setErroAcesso] = useState('')
  const [salvandoAcesso, setSalvandoAcesso] = useState(false)

  // Carrega lista de garçons (incluindo inativos) e ranking de vendas
  function carregar() {
    apiGet<Garcom[]>('/garcons?inativos=true').then(setGarcons)
    apiGet<GarcomRanking[]>('/garcons/vendas?hoje=true').then(setVendas)
  }
  useEffect(() => { carregar() }, [])

  // Cadastra um novo garçom
  async function adicionar() {
    if (!novoNome) return
    await apiPost('/garcons', { nome: novoNome })
    setNovoNome(''); carregar()
  }

  // Salva alteração no nome do garçom
  async function atualizar() {
    if (!editando) return
    await apiPut(`/garcons/${editando.id}`, { nome: editando.nome })
    setEditando(null); carregar()
  }

  // Desativa (soft-delete) um garçom
  async function remover(id: string) {
    if (!confirm('Desativar garçom?')) return
    await apiDelete(`/garcons/${id}`); carregar()
  }

  // Reativa um garçom desativado
  async function reativar(id: string) {
    await apiPatch(`/garcons/${id}/reativar`); carregar()
  }

  // Abre o modal de acesso para um garçom
  function abrirModalAcesso(g: Garcom) {
    setModalAcesso(g)
    setModoAcesso('CRIAR')
    setEmailAcesso('')
    setSenhaAcesso('')
    setErroAcesso('')
  }

  // Salva o acesso (cria ou vincula)
  async function salvarAcesso(e: React.FormEvent) {
    e.preventDefault()
    if (!modalAcesso) return
    setSalvandoAcesso(true)
    setErroAcesso('')

    try {
      if (modoAcesso === 'CRIAR') {
        await apiPost(`/garcons/${modalAcesso.id}/criar-acesso`, { email: emailAcesso, senha: senhaAcesso })
      } else {
        await apiPost(`/garcons/${modalAcesso.id}/vincular-usuario`, { email: emailAcesso })
      }
      setModalAcesso(null)
      carregar()
    } catch (err: unknown) {
      setErroAcesso(err instanceof Error ? err.message : 'Erro ao configurar acesso')
    } finally {
      setSalvandoAcesso(false)
    }
  }

  // Expande/recolhe detalhamento de vendas de um garçom
  async function toggleExpandir(id: string) {
    if (expandido === id) { setExpandido(null); return }
    if (!comandasPorGarcom[id]) {
      setCarregando((p) => ({ ...p, [id]: true }))
      const comandas = await apiGet<Comanda[]>(`/garcons/${id}/comandas?hoje=true`)
      setComandasPorGarcom((p) => ({ ...p, [id]: comandas }))
      setCarregando((p) => ({ ...p, [id]: false }))
    }
    setExpandido(id)
  }

  // Marca/desmarca garçom para impressão do relatório
  function toggleSelecao(id: string) {
    setSelecionados((p) => ({ ...p, [id]: !p[id] }))
  }

  const sorted = [...vendas].sort((a, b) => b.totalVendido - a.totalVendido)
  const todosSelecionados = sorted.every((v) => selecionados[v.id])
  const selecionadosLista = sorted.filter((v) => selecionados[v.id])
  const hoje = new Date().toLocaleDateString('pt-BR')

  // Alterna seleção de todos os garçons
  function toggleSelecionarTodos() {
    const all: Record<string, boolean> = {}
    sorted.forEach((v) => { all[v.id] = !todosSelecionados })
    setSelecionados(all)
  }

  async function imprimir() {
    setImprimindo(true)
    const pendentes = selecionadosLista.filter((v) => !comandasPorGarcom[v.id])
    if (pendentes.length > 0) {
      const resultados = await Promise.all(
        pendentes.map((v) =>
          apiGet<Comanda[]>(`/garcons/${v.id}/comandas?hoje=true`).then((c) => ({ id: v.id, comandas: c }))
        )
      )
      const novos: Record<string, Comanda[]> = {}
      resultados.forEach((r) => { novos[r.id] = r.comandas })
      setComandasPorGarcom((prev) => ({ ...prev, ...novos }))
    }
    setTimeout(() => { window.print(); setImprimindo(false) }, 100)
  }

  return (
    <div>
      {/* === TELA === */}
      <div className="no-print">
        <div className="page-header">
          <h2>Garçons</h2>
          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={imprimir} disabled={imprimindo}>
              {imprimindo ? 'Carregando...' : `Imprimir (${selecionadosLista.length} selecionados)`}
            </button>
          </div>
        </div>

        <div className="card mb-4">
          <h3 className="mb-4">Novo Garçom</h3>
          <div className="flex gap-2" style={{ alignItems: 'end' }}>
            <div className="form-group" style={{ margin: 0, flex: 1, maxWidth: '30%' }}>
              <label>Nome do Garçom</label>
              <input placeholder="Ex.: João" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={adicionar} style={{ height: 44 }}>Adicionar</button>
          </div>
        </div>

        <GarconsRelatorio
          sorted={sorted}
          selecionados={selecionados}
          expandido={expandido}
          comandasPorGarcom={comandasPorGarcom}
          carregando={carregando}
          toggleSelecao={toggleSelecao}
          toggleExpandir={toggleExpandir}
          toggleSelecionarTodos={toggleSelecionarTodos}
          todosSelecionados={todosSelecionados}
        />

        <GarconsGerenciar
          garcons={garcons}
          editando={editando}
          setEditando={setEditando}
          atualizar={atualizar}
          remover={remover}
          reativar={reativar}
          abrirModalAcesso={abrirModalAcesso}
        />

        {/* Modal de Acesso */}
        {modalAcesso && (
          <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModalAcesso(null)}>
            <div className="modal" role="dialog" aria-modal="true" style={{ maxWidth: '420px' }}>
              <div className="modal-header">
                <h3>🔑 Acesso: {modalAcesso.nome}</h3>
                <button className="modal-close" onClick={() => setModalAcesso(null)}>✕</button>
              </div>
              <div className="modal-form" style={{ padding: '0 20px 20px' }}>
                <div style={{ display: 'flex', borderBottom: '1px solid #e2e2e2', marginBottom: '20px' }}>
                  <button
                    type="button"
                    style={{
                      flex: 1, padding: '12px 0', background: 'none', border: 'none',
                      color: modoAcesso === 'CRIAR' ? '#c9953f' : '#777d87',
                      borderBottom: modoAcesso === 'CRIAR' ? '2px solid #c9953f' : '2px solid transparent',
                      fontWeight: modoAcesso === 'CRIAR' ? 600 : 400,
                      cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.9rem'
                    }}
                    onClick={() => setModoAcesso('CRIAR')}
                  >
                    ✨ Criar Novo Login
                  </button>
                  <button
                    type="button"
                    style={{
                      flex: 1, padding: '12px 0', background: 'none', border: 'none',
                      color: modoAcesso === 'VINCULAR' ? '#c9953f' : '#777d87',
                      borderBottom: modoAcesso === 'VINCULAR' ? '2px solid #c9953f' : '2px solid transparent',
                      fontWeight: modoAcesso === 'VINCULAR' ? 600 : 400,
                      cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.9rem'
                    }}
                    onClick={() => setModoAcesso('VINCULAR')}
                  >
                    🔗 Vincular Existente
                  </button>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#777d87', marginBottom: '20px', lineHeight: '1.5' }}>
                  {modoAcesso === 'CRIAR'
                    ? 'Crie um e-mail ou nome de usuário e senha para este garçom. Ele usará esses dados para entrar no sistema pelo celular.'
                    : 'Se o garçom já possui um cadastro no sistema, digite o e-mail ou nome de usuário dele abaixo para vinculá-lo.'}
                </div>
                <form onSubmit={salvarAcesso}>
                  {erroAcesso && <div className="form-error mb-4">{erroAcesso}</div>}
                  <div className="form-field mb-4">
                    <label>E-mail ou Usuário *</label>
                    <input type="text" value={emailAcesso} onChange={(e) => setEmailAcesso(e.target.value)} required placeholder="Ex: joao@email.com ou joao123" />
                  </div>
                  {modoAcesso === 'CRIAR' && (
                    <div className="form-field mb-4">
                      <label>Senha Provisória *</label>
                      <input type="password" value={senhaAcesso} onChange={(e) => setSenhaAcesso(e.target.value)} required minLength={6} placeholder="Mínimo 6 caracteres" />
                    </div>
                  )}
                  <div className="modal-actions" style={{ marginTop: '24px' }}>
                    <button type="button" className="btn-secondary" onClick={() => setModalAcesso(null)} disabled={salvandoAcesso}>Cancelar</button>
                    <button type="submit" className="btn-primary" disabled={salvandoAcesso} style={{ flex: 1 }}>
                      {salvandoAcesso ? 'Salvando...' : modoAcesso === 'CRIAR' ? 'Criar Acesso' : 'Vincular Usuário'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>

      <GarconsPrintView
        selecionadosLista={selecionadosLista}
        comandasPorGarcom={comandasPorGarcom}
        hoje={hoje}
      />

      {/* Estilos Globais para Modais nesta Página */}
      <style jsx>{`
        :global(.modal-overlay) { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
        :global(.modal) { background: #fff; border-radius: 12px; width: 100%; max-width: 560px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); animation: modalIn 0.2s ease; overflow: hidden; }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.95) translateY(-10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        :global(.modal-header) { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #e2e2e2; }
        :global(.modal-header h3) { font-family: 'Playfair Display', serif; font-size: 1.1rem; font-weight: 700; color: #171b22; margin: 0; }
        :global(.modal-close) { background: none; border: none; font-size: 1rem; cursor: pointer; color: #777d87; padding: 4px 8px; border-radius: 6px; transition: background 0.15s; }
        :global(.modal-close):hover { background: rgba(0,0,0,0.06); }
        :global(.modal-form) { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
        :global(.form-field) { display: flex; flex-direction: column; gap: 6px; }
        :global(.form-field label) { font-size: 0.75rem; font-weight: 600; color: #777d87; text-transform: uppercase; letter-spacing: 0.5px; }
        :global(.form-field input) { padding: 10px 12px; border: 1px solid #d5d7da; border-radius: 7px; font-size: 0.875rem; background: #fff; color: #171b22; font-family: 'DM Sans', sans-serif; transition: border-color 0.2s, box-shadow 0.2s; outline: none; }
        :global(.form-field input):focus { border-color: #c9953f; box-shadow: 0 0 0 3px rgba(201,149,63,0.10); }
        :global(.form-error) { padding: 10px 14px; background: rgba(220,53,69,0.08); border: 1px solid rgba(220,53,69,0.25); border-radius: 7px; color: #dc3545; font-size: 0.85rem; }
        :global(.modal-actions) { display: flex; gap: 10px; justify-content: flex-end; padding-top: 4px; }
        :global(.btn-primary) { padding: 10px 20px; background: #171c24; border: none; border-radius: 7px; color: #fff; font-weight: 600; font-size: 0.875rem; cursor: pointer; transition: all 0.2s; font-family: 'DM Sans', sans-serif; }
        :global(.btn-primary):hover:not(:disabled) { background: #252c37; transform: translateY(-1px); }
        :global(.btn-secondary) { padding: 10px 20px; background: transparent; border: 1px solid #d5d7da; border-radius: 7px; color: #171b22; font-weight: 600; font-size: 0.875rem; cursor: pointer; transition: all 0.2s; font-family: 'DM Sans', sans-serif; }
      `}</style>
    </div>
  )
}
