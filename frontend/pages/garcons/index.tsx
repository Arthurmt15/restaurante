import { useEffect, useState } from 'react'
import { apiGet, apiPost, apiPut, apiPatch, apiDelete, type Garcom, type GarcomRanking, type Comanda } from '../../lib/api'

// Gerenciamento de garçons: cadastro, relatório de vendas, impressão
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
      carregar() // Atualiza a lista para refletir o vínculo
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

        <div className="card mb-4">
          <div className="flex justify-between items-center mb-4">
            <h3>Relatório Individual de Garçons</h3>
            <div className="flex gap-2">
              <button className="btn btn-outline btn-sm" onClick={() => {
                const all: Record<string, boolean> = {}
                sorted.forEach((v) => { all[v.id] = !todosSelecionados })
                setSelecionados(all)
              }}>
                {todosSelecionados ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </button>
            </div>
          </div>

          {sorted.map((v) => (
            <div key={v.id} className="card mb-2" style={{ padding: '1rem' }}>
              <div className="flex justify-between items-center">
                <div className="flex gap-2 items-center">
                  <input
                    type="checkbox"
                    checked={!!selecionados[v.id]}
                    onChange={() => toggleSelecao(v.id)}
                  />
                  <strong>{v.nome}</strong>
                  <span style={{ color: '#666', fontSize: '0.85rem' }}>
                    {v.vendas} vendas | R$ {v.totalVendido.toFixed(2)}
                  </span>
                </div>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => toggleExpandir(v.id)}
                >
                  {expandido === v.id ? 'Recolher' : 'Detalhes'}
                </button>
              </div>

              {expandido === v.id && (
                <div className="mt-4">
                  {carregando[v.id] ? (
                    <p style={{ color: '#999' }}>Carregando...</p>
                  ) : !comandasPorGarcom[v.id] || comandasPorGarcom[v.id].length === 0 ? (
                    <p style={{ color: '#999' }}>Nenhuma venda encontrada</p>
                  ) : (
                    <table>
                      <thead>
                        <tr><th>Mesa</th><th>Itens</th><th>Subtotal</th><th>Taxa</th><th>Total</th><th>Data</th></tr>
                      </thead>
                      <tbody>
                        {comandasPorGarcom[v.id].map((c) => (
                          <tr key={c.id}>
                            <td data-label="Mesa">Mesa {c.mesa.numero}</td>
                            <td data-label="Itens">{c.itens.length}</td>
                            <td data-label="Subtotal">R$ {c.subtotal.toFixed(2)}</td>
                            <td data-label="Taxa">R$ {c.taxaServico.toFixed(2)}</td>
                            <td data-label="Total">R$ {c.total.toFixed(2)}</td>
                            <td data-label="Data" style={{ fontSize: '0.8rem' }}>
                              {new Date(c.createdAt).toLocaleDateString('pt-BR')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="card">
          <h3 className="mb-4">Gerenciar Garçons</h3>
          <table>
            <thead><tr><th>Nome</th><th>Acesso</th><th>Ações</th></tr></thead>
            <tbody>
              {[...garcons].sort((a, b) => (a.ativo === b.ativo ? 0 : a.ativo ? -1 : 1)).map((g) => (
                    <tr key={g.id} style={g.ativo ? {} : { opacity: 0.6 }}>
                  {editando?.id === g.id ? (
                    <>
                      <td data-label="Nome"><input value={editando.nome} onChange={(e) => setEditando({ ...editando, nome: e.target.value })} style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '0.9rem', width: '100%', outline: 'none', transition: 'border-color 0.2s' }} onFocus={(e) => e.target.style.borderColor = '#2d8a4e'} onBlur={(e) => e.target.style.borderColor = '#e5e7eb'} /></td>
                      <td data-label="Acesso"></td>
                      <td data-label="Ações">
                        <div className="flex gap-2" style={{ justifyContent: 'end' }}>
                          <button className="btn btn-success btn-sm" onClick={atualizar}>Salvar</button>
                          <button className="btn btn-outline btn-sm" onClick={() => setEditando(null)}>Cancelar</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td data-label="Nome">
                        {g.nome}
                        {!g.ativo && <span style={{ marginLeft: '0.5rem', color: '#999', fontSize: '0.8rem' }}>(Inativo)</span>}
                      </td>
                      <td data-label="Acesso">
                        {g.usuarioId ? (
                          <span style={{ color: '#2d8a4e', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            ✓ Vinculado
                          </span>
                        ) : (
                          g.ativo && <button className="btn btn-outline btn-sm" onClick={() => abrirModalAcesso(g)}>🔑 Criar Acesso</button>
                        )}
                      </td>
                      <td data-label="Ações">
                        <div className="flex gap-2" style={{ justifyContent: 'end' }}>
                          <button className="btn btn-outline btn-sm" onClick={() => setEditando({ ...g })}>Editar</button>
                          {g.ativo ? (
                            <button className="btn btn-danger btn-sm" onClick={() => remover(g.id)}>X</button>
                          ) : (
                            <button className="btn btn-success btn-sm" onClick={() => reativar(g.id)}>Reativar</button>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Modal de Acesso */}
        {modalAcesso && (
          <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModalAcesso(null)}>
            <div className="modal" role="dialog" aria-modal="true" style={{ maxWidth: '420px' }}>
              <div className="modal-header">
                <h3>🔑 Acesso: {modalAcesso.nome}</h3>
                <button className="modal-close" onClick={() => setModalAcesso(null)}>✕</button>
              </div>
              <div className="modal-form" style={{ padding: '0 20px 20px' }}>
                
                <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '20px' }}>
                  <button
                    type="button"
                    style={{
                      flex: 1, padding: '12px 0', background: 'none', border: 'none', 
                      color: modoAcesso === 'CRIAR' ? '#2d8a4e' : 'rgba(255,255,255,0.6)',
                      borderBottom: modoAcesso === 'CRIAR' ? '2px solid #2d8a4e' : '2px solid transparent',
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
                      color: modoAcesso === 'VINCULAR' ? '#2d8a4e' : 'rgba(255,255,255,0.6)',
                      borderBottom: modoAcesso === 'VINCULAR' ? '2px solid #2d8a4e' : '2px solid transparent',
                      fontWeight: modoAcesso === 'VINCULAR' ? 600 : 400,
                      cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.9rem'
                    }}
                    onClick={() => setModoAcesso('VINCULAR')}
                  >
                    🔗 Vincular Existente
                  </button>
                </div>
                
                <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '20px', lineHeight: '1.5' }}>
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

      {/* === IMPRESSÃO === */}
      <div className="print-only">
        <div style={{ textAlign: 'center', marginBottom: '3mm' }}>
          <div style={{ fontSize: '14pt', fontWeight: 700 }}>Barraca da Vânia</div>
          <div style={{ fontSize: '8pt', color: '#555' }}>Relatório Individual de Garçons — {hoje}</div>
        </div>

        {selecionadosLista.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#999', marginTop: '2rem' }}>
            Selecione ao menos um garçom para imprimir.
          </p>
        ) : (
          selecionadosLista.map((v, idx) => {
            const comandas = comandasPorGarcom[v.id] || []
            const totalGeral = comandas.reduce((a, c) => a + c.total, 0)
            const totalTaxas = comandas.reduce((a, c) => a + c.taxaServico, 0)

            return (
              <div key={v.id} style={{ pageBreakBefore: idx > 0 ? 'always' : 'auto', marginBottom: '4mm' }}>
                <div style={{ fontSize: '12pt', fontWeight: 700, borderBottom: '1px dashed #000', paddingBottom: '1mm', marginBottom: '2mm' }}>
                  {v.nome}
                  <span style={{ fontSize: '8pt', fontWeight: 'normal', color: '#555', marginLeft: '2mm' }}>
                    Total: R$ {totalGeral.toFixed(2)} | Taxas: R$ {totalTaxas.toFixed(2)} | Vendas: {comandas.length}
                  </span>
                </div>

                {comandas.length === 0 ? (
                  <p style={{ color: '#999', fontSize: '8pt' }}>Nenhuma venda registrada</p>
                ) : (
                  comandas.map((c) => (
                    <div key={c.id} style={{ marginBottom: '3mm' }}>
                      <div style={{ fontSize: '8pt', borderBottom: '1px dotted #ccc', paddingBottom: '1mm', marginBottom: '1mm', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Mesa {c.mesa.numero}</span>
                        <span>{new Date(c.createdAt).toLocaleDateString('pt-BR')} {new Date(c.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      {c.itens.map((i) => (
                        <div key={i.id} style={{ fontSize: '8pt', padding: '0.5mm 0', display: 'flex', justifyContent: 'space-between' }}>
                          <span>
                            {i.item.nome}
                            {i.observacao && <span style={{ color: '#555' }}> ({i.observacao})</span>}
                          </span>
                          <span>{i.quantidade}x R$ {i.precoUnit.toFixed(2)}</span>
                        </div>
                      ))}

                      <div style={{ fontSize: '7pt', display: 'flex', justifyContent: 'space-between', paddingLeft: '2mm', marginTop: '0.5mm' }}>
                        <span>Subtotal: R$ {c.subtotal.toFixed(2)} | Taxa: R$ {c.taxaServico.toFixed(2)}</span>
                        <span style={{ fontWeight: 700 }}>Total: R$ {c.total.toFixed(2)}</span>
                      </div>
                    </div>
                  ))
                )}

                <div style={{ textAlign: 'right', fontSize: '9pt', borderTop: '1px dashed #000', paddingTop: '1mm' }}>
                  <div>Taxas: R$ {totalTaxas.toFixed(2)}</div>
                  <div style={{ fontWeight: 700, fontSize: '10pt' }}>Total: R$ {totalGeral.toFixed(2)}</div>
                </div>
              </div>
            )
          })
        )}

        {selecionadosLista.length > 1 && (
          <div style={{ marginTop: '3mm', paddingTop: '1mm', borderTop: '1px dashed #000', fontSize: '8pt' }}>
            <div style={{ fontWeight: 700, marginBottom: '1mm' }}>Resumo Geral</div>
            {selecionadosLista.map((v) => {
              const comandas = comandasPorGarcom[v.id] || []
              return (
                <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{v.nome}: {comandas.length} vendas</span>
                  <span>R$ {comandas.reduce((a, c) => a + c.total, 0).toFixed(2)}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Estilos Globais para Modais nesta Página */}
      <style jsx>{`
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

        :global(.form-field input) {
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

        :global(.form-field input):focus {
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

        :global(.modal-actions) {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          padding-top: 4px;
        }

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
      `}</style>
    </div>
  )
}
