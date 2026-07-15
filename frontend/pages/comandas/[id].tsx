import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/router'
import { apiGet, apiPost, apiDelete, apiPatch, type Comanda, type Categoria, type Pagamento } from '../../lib/api'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
const FORMAS_PAGAMENTO = ['Dinheiro', 'Cartão Débito', 'Cartão Crédito', 'Pix']
type PagamentoInput = { forma: string; valor: string }

// Detalhes de uma comanda: itens, totais, adicionar/remover itens e impressão
export default function ComandaDetalhe() {
  const router = useRouter()
  const { id } = router.query
  const [comanda, setComanda] = useState<Comanda | null>(null)
  const [cardapio, setCardapio] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [removendoItemId, setRemovendoItemId] = useState<string | null>(null)
  const [codigo, setCodigo] = useState('')
  const [erroCodigo, setErroCodigo] = useState('')
  const [adicionandoItem, setAdicionandoItem] = useState<{ id: string; nome: string; estoque: number; controlaEstoque: boolean } | null>(null)
  const [quantidade, setQuantidade] = useState(1)
  const [observacaoItem, setObservacaoItem] = useState('')
  const [busca, setBusca] = useState('')
  const [fechando, setFechando] = useState(false)
  const [pagamentos, setPagamentos] = useState<PagamentoInput[]>([{ forma: '', valor: '' }])
  const [erroPagamento, setErroPagamento] = useState('')
  const [jaPago, setJaPago] = useState(0)

  // Carrega dados da comanda e cardápio
  function carregar() {
    if (!id) return
    apiGet<Comanda>(`/comandas/${id}`).then(setComanda)
    apiGet<Categoria[]>('/cardapio').then(setCardapio)
    setLoading(false)
  }

  async function fecharMesa() {
    if (!comanda) return
    await apiPatch(`/mesas/${comanda.mesaId}/status`)
    carregar()
  }

  function abrirFechamento() {
    if (!comanda) return
    setFechando(true)
    const pago = comanda.pagamentos?.reduce((acc, p) => acc + p.valor, 0) || 0
    setJaPago(pago)
    const restante = comanda.total - pago
    setPagamentos([{ forma: '', valor: restante > 0 ? restante.toFixed(2) : '0.00' }])
    setErroPagamento('')
  }

  function adicionarPagamento() {
    setPagamentos([...pagamentos, { forma: '', valor: '' }])
  }

  function removerPagamento(idx: number) {
    if (pagamentos.length <= 1) return
    setPagamentos(pagamentos.filter((_, i) => i !== idx))
  }

  function atualizarPagamento(idx: number, campo: 'forma' | 'valor', valor: string) {
    const novos = [...pagamentos]
    novos[idx] = { ...novos[idx], [campo]: valor }
    setPagamentos(novos)
  }

  async function fecharComanda() {
    if (!id) return
    const pagamentosValidos = pagamentos.filter((p) => p.forma && p.valor)
    if (pagamentosValidos.length === 0) {
      setErroPagamento('Adicione ao menos um método de pagamento')
      return
    }
    const restante = (comanda?.total || 0) - jaPago
    const totalPago = pagamentosValidos.reduce((acc, p) => acc + parseFloat(p.valor), 0)
    if (Math.abs(totalPago - restante) > 0.01) {
      setErroPagamento(`Valor a pagar (R$ ${restante.toFixed(2)}) difere do informado (R$ ${totalPago.toFixed(2)})`)
      return
    }
    setErroPagamento('')
    await apiPatch(`/comandas/${id}/fechar`, {
      pagamentos: pagamentosValidos.map((p) => ({ forma: p.forma, valor: parseFloat(p.valor) })),
    })
    setFechando(false)
    carregar()
  }

  useEffect(() => { carregar() }, [id])

  // Filtra itens pelo termo de busca (nome, nomeEn, descricao, categoria)
  const cardapioFiltrado = useMemo(() => {
    if (!busca.trim()) return cardapio
    const termo = busca.toLowerCase()
    return cardapio
      .map((cat) => ({
        ...cat,
        itens: cat.itens.filter((item) =>
          item.nome.toLowerCase().includes(termo) ||
          (item.nomeEn && item.nomeEn.toLowerCase().includes(termo)) ||
          (item.descricao && item.descricao.toLowerCase().includes(termo)) ||
          cat.nome.toLowerCase().includes(termo)
        ),
      }))
      .filter((cat) => cat.itens.length > 0)
  }, [cardapio, busca])

  // Abre modal para adicionar item com quantidade
  function abrirAdicionarItem(itemId: string, nome: string, estoque: number, controlaEstoque: boolean) {
    setAdicionandoItem({ id: itemId, nome, estoque, controlaEstoque })
    setQuantidade(1)
    setObservacaoItem('')
  }

  // Adiciona item à comanda com a quantidade informada
  async function confirmarAdicionarItem() {
    if (!adicionandoItem || !id) return
    await apiPost(`/comandas/${id}/itens`, {
      itemId: adicionandoItem.id,
      quantidade,
      observacao: observacaoItem || undefined,
    })
    setAdicionandoItem(null)
    carregar()
  }

  // Reabre uma comanda fechada (apenas se não tiver pagamento)
  async function reabrirComanda() {
    if (!id) return
    if (!confirm('Reabrir esta comanda?')) return
    try {
      await apiPatch(`/comandas/${id}/reabrir`)
      carregar()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro ao reabrir comanda')
    }
  }

  // Remove item da comanda (requer código de autorização, restaura estoque)
  async function removerItem(itemId: string) {
    if (!codigo) return
    setErroCodigo('')
    try {
      const res = await fetch(`${API}/comandas/${id}/itens/${itemId}?codigo=${encodeURIComponent(codigo)}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Erro ao remover item')
      }
      setRemovendoItemId(null)
      setCodigo('')
      carregar()
    } catch (e: unknown) {
      setErroCodigo(e instanceof Error ? e.message : 'Erro')
    }
  }

  if (loading || !comanda) return <div className="empty-state">Carregando...</div>

  const dataAbertura = new Date(comanda.createdAt).toLocaleString('pt-BR')

  return (
    <div>
      {/* === CONTEÚDO DA TELA === */}
      <div className="no-print">
        <div className="page-header">
          <h2>Comanda - Mesa {comanda.mesa.numero}</h2>
          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={() => window.print()}>Imprimir Comanda</button>
            {comanda.status === 'ABERTA' && (
              <button className="btn btn-success" onClick={abrirFechamento}>Fechar Comanda</button>
            )}
            {comanda.status === 'FECHADA' && comanda.mesa.status === 'OCUPADA' && (
              <button className="btn btn-outline" onClick={fecharMesa}>Fechar Mesa</button>
            )}
            {comanda.status === 'FECHADA' ? (
              <button className="badge badge-closed" style={{ border: 'none', cursor: 'pointer' }} onClick={reabrirComanda} title="Clique para reabrir">
                FECHADA ⤾
              </button>
            ) : (
              <span className="badge badge-open">ABERTA</span>
            )}
          </div>
        </div>

        <div className="card mb-4">
          <p><strong>Garçom:</strong> {comanda.garcom?.nome || '—'}</p>
          <p><strong>Aberta em:</strong> {dataAbertura}</p>
        </div>

        <div className="card mb-4">
          <h3 className="mb-4">Itens da Comanda</h3>
          {comanda.itens.length === 0 ? (
            <div className="empty-state">Nenhum item adicionado</div>
          ) : (
            <table>
              <thead><tr><th>Item</th><th>Qtd</th><th>Preço</th><th>Obs</th><th className="no-print"></th></tr></thead>
              <tbody>
                {comanda.itens.map((i) => (
                  <tr key={i.id}>
                    <td data-label="Item">{i.item.nome}</td>
                    <td data-label="Qtd">{i.quantidade}</td>
                    <td data-label="Preço">R$ {i.precoUnit.toFixed(2)}</td>
                    <td data-label="Obs" style={{ fontSize: '0.8rem', color: '#666' }}>{i.observacao || '—'}</td>
                    <td data-label="" className="no-print">
                      {comanda.status === 'ABERTA' && (
                        <button className="btn btn-danger btn-sm" onClick={() => { setRemovendoItemId(i.id); setCodigo(''); setErroCodigo('') }}>X</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="mt-4">
            <p><strong>Subtotal:</strong> R$ {comanda.subtotal.toFixed(2)}</p>
            <p><strong>Taxa de Serviço (10%):</strong> R$ {comanda.taxaServico.toFixed(2)}</p>
            <p className="total-row" style={{ fontSize: '1.25rem' }}>Total: R$ {comanda.total.toFixed(2)}</p>
            {comanda.pagamentos && comanda.pagamentos.length > 0 && (
              <div className="mt-2">
                <p><strong>Pagamentos:</strong></p>
                {comanda.pagamentos.map((p) => (
                  <p key={p.id} style={{ fontSize: '0.9rem', marginLeft: '1rem' }}>
                    {p.forma}: R$ {p.valor.toFixed(2)}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>

        {comanda.status === 'ABERTA' && (
          <div className="card">
            <h3 className="mb-4">Adicionar Item</h3>

            <div className="search-box">
              <input
                type="text"
                placeholder="Buscar item por nome, descrição ou categoria..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                autoFocus
              />
              {busca ? (
                <button className="search-clear" onClick={() => setBusca('')}>✕</button>
              ) : (
                <span className="search-icon">🔍</span>
              )}
            </div>

            {cardapioFiltrado.length === 0 ? (
              <div className="empty-state">Nenhum item encontrado</div>
            ) : (
              cardapioFiltrado.map((cat) => (
                <div key={cat.id} className="mb-4">
                  <h4 className="mb-2">{cat.nome}</h4>
                  <div className="card-grid">
                    {cat.itens.map((item) => {
                      const ehBebida = cat.nome === 'Bebidas'
                      const semEstoque = ehBebida && item.estoqueAtual <= 0
                      const indisponivel = ehBebida ? semEstoque : false
                      return (
                        <div key={item.id} className="card" style={{
                          padding: '1rem',
                          cursor: indisponivel ? 'not-allowed' : 'pointer',
                          opacity: indisponivel ? 0.5 : 1,
                        }} onClick={() => !indisponivel && abrirAdicionarItem(item.id, item.nome, item.estoqueAtual, ehBebida)}>
                          <p style={{ fontWeight: 600 }}>{item.nome}</p>
                          <p style={{ fontSize: '0.8rem', color: '#666' }}>{item.descricao}</p>
                          <div className="flex justify-between items-center mt-2">
                            <span className="total-row">R$ {item.preco.toFixed(2)}</span>
                            {item.porcaoTamanho && (
                              <span style={{ fontSize: '0.75rem', color: '#999' }}>{item.porcaoTamanho}</span>
                            )}
                          </div>
                          {ehBebida && (
                            <p style={{ fontSize: '0.75rem', color: semEstoque ? '#dc3545' : '#666', marginTop: 4 }}>
                              Estoque: {item.estoqueAtual}
                              {semEstoque && ' (indisponível)'}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* === MODAL DE FECHAMENTO === */}
      {fechando && comanda && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <h3>Fechar Comanda</h3>
                {jaPago > 0 && (
                  <p style={{ fontSize: '0.8rem', color: '#666', marginTop: 2 }}>
                    Já pago: R$ {jaPago.toFixed(2)} | Restante: R$ {(comanda.total - jaPago).toFixed(2)}
                  </p>
                )}
              </div>
              <span className="modal-total">R$ {comanda.total.toFixed(2)}</span>
            </div>

            <div className="modal-body">
              <div className="pagamento-lista">
                {pagamentos.map((p, idx) => (
                  <div key={idx} className="pagamento-linha">
                    <select
                      value={p.forma}
                      onChange={(e) => atualizarPagamento(idx, 'forma', e.target.value)}
                    >
                      <option value="">Selecione...</option>
                      {FORMAS_PAGAMENTO.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                    <div className="pagamento-valor-wrapper">
                      <span className="pagamento-cifrao">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={p.valor}
                        onChange={(e) => atualizarPagamento(idx, 'valor', e.target.value)}
                      />
                    </div>
                    {pagamentos.length > 1 && (
                      <button className="pagamento-remover" onClick={() => removerPagamento(idx)}>✕</button>
                    )}
                  </div>
                ))}
              </div>

              <button className="pagamento-adicionar" onClick={adicionarPagamento}>
                + Adicionar forma de pagamento
              </button>

              {pagamentos.length > 0 && (
                <div className="pagamento-resumo">
                  <div>
                    <span>Total lançado</span>
                    {jaPago > 0 && (
                      <span style={{ fontSize: '0.8rem', color: '#999', display: 'block' }}>
                        Já pago: R$ {jaPago.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <span className="pagamento-resumo-valor">
                    R$ {pagamentos.reduce((acc, p) => acc + (parseFloat(p.valor) || 0), 0).toFixed(2)}
                  </span>
                </div>
              )}

              {erroPagamento && (
                <div className="pagamento-erro">{erroPagamento}</div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => { setFechando(false); setErroPagamento('') }}>Cancelar</button>
              <button className="btn btn-primary" onClick={fecharComanda}>Confirmar Fechamento</button>
            </div>
          </div>
        </div>
      )}

      {/* === MODAL DE QUANTIDADE === */}
      {adicionandoItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ padding: '1.5rem', minWidth: 320 }}>
            <h3 className="mb-4">Adicionar Item</h3>
            <p style={{ fontWeight: 600, marginBottom: '1rem' }}>{adicionandoItem.nome}</p>

            <div className="form-group">
              <label>Quantidade</label>
              <input
                type="number"
                min={1}
                max={adicionandoItem.controlaEstoque ? adicionandoItem.estoque : 999}
                value={quantidade}
                onChange={(e) => setQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
              />
              {adicionandoItem.controlaEstoque && (
                <span style={{ fontSize: '0.8rem', color: '#666' }}>Estoque disponível: {adicionandoItem.estoque}</span>
              )}
            </div>

            <div className="form-group">
              <label>Observação (opcional)</label>
              <input
                type="text"
                placeholder="Ex.: sem cebola, bem passado..."
                value={observacaoItem}
                onChange={(e) => setObservacaoItem(e.target.value)}
              />
            </div>

            <div className="flex gap-2" style={{ justifyContent: 'end', marginTop: '1rem' }}>
              <button className="btn btn-outline" onClick={() => setAdicionandoItem(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={confirmarAdicionarItem}>
                Adicionar ({quantidade}x)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === VERSÃO PARA IMPRESSÃO === */}
      <div className="print-only">
        <div style={{ textAlign: 'center', marginBottom: '3mm' }}>
          <div style={{ fontSize: '14pt', fontWeight: 700 }}>Barraca da Vânia</div>
          <div style={{ fontSize: '8pt', color: '#555' }}>Comanda #{comanda.id.slice(0, 8).toUpperCase()}</div>
        </div>

        <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '2mm 0', marginBottom: '2mm', fontSize: '9pt' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Mesa: {comanda.mesa.numero}</span>
            <span>{comanda.status}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Garçom: {comanda.garcom?.nome || '—'}</span>
            <span>{new Date(comanda.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2mm' }}>
          <thead>
            <tr style={{ borderBottom: '1px dashed #000' }}>
              <th style={{ textAlign: 'left', padding: '1mm 0', fontSize: '8pt' }}>Item</th>
              <th style={{ textAlign: 'center', padding: '1mm 0', fontSize: '8pt' }}>Qtd</th>
              <th style={{ textAlign: 'right', padding: '1mm 0', fontSize: '8pt' }}>Valor</th>
            </tr>
          </thead>
          <tbody>
            {comanda.itens.map((i) => (
              <tr key={i.id}>
                <td style={{ padding: '1mm 0', fontSize: '9pt' }}>
                  {i.item.nome}
                  {i.observacao && <div style={{ fontSize: '7pt', color: '#555' }}>{i.observacao}</div>}
                </td>
                <td style={{ textAlign: 'center', padding: '1mm 0', fontSize: '9pt' }}>{i.quantidade}</td>
                <td style={{ textAlign: 'right', padding: '1mm 0', fontSize: '9pt' }}>R$ {i.precoUnit.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ borderTop: '1px dashed #000', paddingTop: '2mm', fontSize: '9pt' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Subtotal</span>
            <span>R$ {comanda.subtotal.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Taxa de Serviço (10%)</span>
            <span>R$ {comanda.taxaServico.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12pt', fontWeight: 700, marginTop: '1mm', borderTop: '1px dashed #000', paddingTop: '1mm' }}>
            <span>Total</span>
            <span>R$ {comanda.total.toFixed(2)}</span>
          </div>
          {comanda.pagamentos && comanda.pagamentos.length > 0 && (
            <div style={{ marginTop: '2mm', fontSize: '8pt', borderTop: '1px dotted #ccc', paddingTop: '1mm' }}>
              {comanda.pagamentos.map((p) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{p.forma}</span>
                  <span>R$ {p.valor.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: '3mm', fontSize: '7pt', color: '#555' }}>
          {new Date(comanda.createdAt).toLocaleString('pt-BR')}
        </div>
      </div>

      {removendoItemId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ padding: '1.5rem', minWidth: 300 }}>
            <h3 className="mb-4">Autorização necessária</h3>
            <p style={{ marginBottom: '1rem', color: '#666' }}>Digite o código de autorização para remover o item:</p>
            <input
              type="password"
              placeholder="Código"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              style={{ width: '100%', marginBottom: '0.5rem' }}
              autoFocus
            />
            {erroCodigo && <p style={{ color: '#dc3545', marginBottom: '0.5rem', fontSize: '0.85rem' }}>{erroCodigo}</p>}
            <div className="flex gap-2" style={{ justifyContent: 'end' }}>
              <button className="btn btn-outline" onClick={() => { setRemovendoItemId(null); setCodigo(''); setErroCodigo('') }}>Cancelar</button>
              <button className="btn btn-danger" disabled={!codigo} onClick={() => removerItem(removendoItemId)}>Remover</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
