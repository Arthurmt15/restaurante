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

  // Carrega lista de garçons (incluindo inativos) e ranking de vendas
  function carregar() {
    apiGet<Garcom[]>('/garcons?inativos=true').then(setGarcons)
    apiGet<GarcomRanking[]>('/garcons/vendas').then(setVendas)
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

  // Expande/recolhe detalhamento de vendas de um garçom
  async function toggleExpandir(id: string) {
    if (expandido === id) { setExpandido(null); return }
    if (!comandasPorGarcom[id]) {
      setCarregando((p) => ({ ...p, [id]: true }))
      const comandas = await apiGet<Comanda[]>(`/garcons/${id}/comandas`)
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

  return (
    <div>
      {/* === TELA === */}
      <div className="no-print">
        <div className="page-header">
          <h2>Garçons</h2>
          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={() => window.print()}>
              Imprimir ({selecionadosLista.length} selecionados)
            </button>
          </div>
        </div>

        <div className="card mb-4">
          <h3 className="mb-4">Novo Garçom</h3>
          <div className="flex gap-2">
            <input placeholder="Nome" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} />
            <button className="btn btn-primary" onClick={adicionar}>Adicionar</button>
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
                            <td>Mesa {c.mesa.numero}</td>
                            <td>{c.itens.length}</td>
                            <td>R$ {c.subtotal.toFixed(2)}</td>
                            <td>R$ {c.taxaServico.toFixed(2)}</td>
                            <td>R$ {c.total.toFixed(2)}</td>
                            <td style={{ fontSize: '0.8rem' }}>
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
            <thead><tr><th>Nome</th><th></th></tr></thead>
            <tbody>
              {garcons.map((g) => (
                <tr key={g.id} style={g.ativo ? {} : { opacity: 0.6 }}>
                  {editando?.id === g.id ? (
                    <>
                      <td><input value={editando.nome} onChange={(e) => setEditando({ ...editando, nome: e.target.value })} /></td>
                      <td className="flex gap-2">
                        <button className="btn btn-success btn-sm" onClick={atualizar}>Salvar</button>
                        <button className="btn btn-outline btn-sm" onClick={() => setEditando(null)}>Cancelar</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>
                        {g.nome}
                        {!g.ativo && <span style={{ marginLeft: '0.5rem', color: '#999', fontSize: '0.8rem' }}>(Inativo)</span>}
                      </td>
                      <td className="flex gap-2">
                        <button className="btn btn-outline btn-sm" onClick={() => setEditando({ ...g })}>Editar</button>
                        {g.ativo ? (
                          <button className="btn btn-danger btn-sm" onClick={() => remover(g.id)}>X</button>
                        ) : (
                          <button className="btn btn-success btn-sm" onClick={() => reativar(g.id)}>Reativar</button>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* === IMPRESSÃO === */}
      <div className="print-only">
        <div className="print-header">
          <h1>Barraca da Vânia</h1>
          <p>Relatório Individual de Garçons — {hoje}</p>
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
              <div key={v.id} style={{ pageBreakBefore: idx > 0 ? 'always' : 'auto', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.2rem', borderBottom: '2px solid #333', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
                  {v.nome}
                  <span style={{ fontSize: '0.85rem', fontWeight: 'normal', color: '#666', marginLeft: '1rem' }}>
                    Total: R$ {totalGeral.toFixed(2)} | Taxas: R$ {totalTaxas.toFixed(2)} | Vendas: {comandas.length}
                  </span>
                </h2>

                {comandas.length === 0 ? (
                  <p style={{ color: '#999' }}>Nenhuma venda registrada</p>
                ) : (
                  <>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '0.75rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #333' }}>
                          <th style={{ textAlign: 'left', padding: '0.35rem 0.25rem', fontSize: '0.8rem' }}>Mesa</th>
                          <th style={{ textAlign: 'center', padding: '0.35rem 0.25rem', fontSize: '0.8rem' }}>Itens</th>
                          <th style={{ textAlign: 'right', padding: '0.35rem 0.25rem', fontSize: '0.8rem' }}>Subtotal</th>
                          <th style={{ textAlign: 'right', padding: '0.35rem 0.25rem', fontSize: '0.8rem' }}>Taxa</th>
                          <th style={{ textAlign: 'right', padding: '0.35rem 0.25rem', fontSize: '0.8rem' }}>Total</th>
                          <th style={{ textAlign: 'right', padding: '0.35rem 0.25rem', fontSize: '0.8rem' }}>Data</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comandas.map((c) => (
                          <tr key={c.id} style={{ borderBottom: '1px solid #ddd' }}>
                            <td style={{ padding: '0.3rem 0.25rem' }}>Mesa {c.mesa.numero}</td>
                            <td style={{ textAlign: 'center', padding: '0.3rem 0.25rem' }}>{c.itens.length}</td>
                            <td style={{ textAlign: 'right', padding: '0.3rem 0.25rem' }}>R$ {c.subtotal.toFixed(2)}</td>
                            <td style={{ textAlign: 'right', padding: '0.3rem 0.25rem' }}>R$ {c.taxaServico.toFixed(2)}</td>
                            <td style={{ textAlign: 'right', padding: '0.3rem 0.25rem' }}>R$ {c.total.toFixed(2)}</td>
                            <td style={{ textAlign: 'right', padding: '0.3rem 0.25rem', fontSize: '0.8rem' }}>
                              {new Date(c.createdAt).toLocaleDateString('pt-BR')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div style={{ textAlign: 'right', fontSize: '0.9rem', fontWeight: 700 }}>
                      Total {v.nome}: R$ {totalGeral.toFixed(2)}
                    </div>
                  </>
                )}
              </div>
            )
          })
        )}

        {selecionadosLista.length > 1 && (
          <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '2px solid #333' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Resumo Geral</h3>
            {selecionadosLista.map((v) => {
              const comandas = comandasPorGarcom[v.id] || []
              return (
                <p key={v.id} style={{ fontSize: '0.85rem' }}>
                  {v.nome}: {comandas.length} vendas | R$ {comandas.reduce((a, c) => a + c.total, 0).toFixed(2)}
                </p>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
