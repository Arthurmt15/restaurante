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
            <thead><tr><th>Nome</th><th></th></tr></thead>
            <tbody>
              {[...garcons].sort((a, b) => (a.ativo === b.ativo ? 0 : a.ativo ? -1 : 1)).map((g) => (
                    <tr key={g.id} style={g.ativo ? {} : { opacity: 0.6 }}>
                  {editando?.id === g.id ? (
                    <>
                      <td data-label="Nome"><input value={editando.nome} onChange={(e) => setEditando({ ...editando, nome: e.target.value })} /></td>
                      <td data-label="">
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
                      <td data-label="">
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
    </div>
  )
}
