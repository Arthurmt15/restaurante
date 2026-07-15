import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { apiGet, apiPost, apiDelete, type Comanda, type Categoria } from '../../lib/api'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

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

  // Carrega dados da comanda e cardápio
  function carregar() {
    if (!id) return
    apiGet<Comanda>(`/comandas/${id}`).then(setComanda)
    apiGet<Categoria[]>('/cardapio').then(setCardapio)
    setLoading(false)
  }

  useEffect(() => { carregar() }, [id])

  // Adiciona item à comanda (baixa 1 unidade do estoque)
  async function adicionarItem(itemId: string) {
    if (!confirm('Adicionar este item?')) return
    await apiPost(`/comandas/${id}/itens`, { itemId, quantidade: 1 })
    carregar()
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
            <span className={`badge ${comanda.status === 'ABERTA' ? 'badge-open' : 'badge-closed'}`}>
              {comanda.status}
            </span>
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
                    <td>{i.item.nome}</td>
                    <td>{i.quantidade}</td>
                    <td>R$ {i.precoUnit.toFixed(2)}</td>
                    <td style={{ fontSize: '0.8rem', color: '#666' }}>{i.observacao || '—'}</td>
                    <td className="no-print">
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
          </div>
        </div>

        {comanda.status === 'ABERTA' && (
          <div className="card">
            <h3 className="mb-4">Adicionar Item</h3>
            {cardapio.map((cat) => (
              <div key={cat.id} className="mb-4">
                <h4 className="mb-2">{cat.nome}</h4>
                <div className="card-grid">
                  {cat.itens.map((item) => {
                    const semEstoque = item.estoqueAtual <= 0
                    return (
                      <div key={item.id} className="card" style={{
                        padding: '1rem',
                        cursor: semEstoque ? 'not-allowed' : 'pointer',
                        opacity: semEstoque ? 0.5 : 1,
                      }} onClick={() => !semEstoque && adicionarItem(item.id)}>
                        <p style={{ fontWeight: 600 }}>{item.nome}</p>
                        <p style={{ fontSize: '0.8rem', color: '#666' }}>{item.descricao}</p>
                        <div className="flex justify-between items-center mt-2">
                          <span className="total-row">R$ {item.preco.toFixed(2)}</span>
                          {item.porcaoTamanho && (
                            <span style={{ fontSize: '0.75rem', color: '#999' }}>{item.porcaoTamanho}</span>
                          )}
                        </div>
                        <p style={{ fontSize: '0.75rem', color: semEstoque ? '#dc3545' : '#666', marginTop: 4 }}>
                          Estoque: {item.estoqueAtual}
                          {semEstoque && ' (indisponível)'}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* === VERSÃO PARA IMPRESSÃO === */}
      <div className="print-only">
        <div className="print-header">
          <h1>Barraca da Vânia</h1>
          <p>Comanda #{comanda.id.slice(0, 8).toUpperCase()}</p>
        </div>

        <table style={{ width: '100%', marginBottom: '1rem', fontSize: '0.85rem' }}>
          <tbody>
            <tr><td><strong>Mesa:</strong> {comanda.mesa.numero}</td>
                <td><strong>Status:</strong> {comanda.status}</td></tr>
            <tr><td><strong>Garçom:</strong> {comanda.garcom?.nome || '—'}</td>
                <td><strong>Abertura:</strong> {dataAbertura}</td></tr>
          </tbody>
        </table>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #333' }}>
              <th style={{ textAlign: 'left', padding: '0.5rem 0.25rem' }}>Item</th>
              <th style={{ textAlign: 'center', padding: '0.5rem 0.25rem' }}>Qtd</th>
              <th style={{ textAlign: 'right', padding: '0.5rem 0.25rem' }}>Preço</th>
            </tr>
          </thead>
          <tbody>
            {comanda.itens.map((i) => (
              <tr key={i.id} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '0.4rem 0.25rem' }}>{i.item.nome}</td>
                <td style={{ textAlign: 'center', padding: '0.4rem 0.25rem' }}>{i.quantidade}</td>
                <td style={{ textAlign: 'right', padding: '0.4rem 0.25rem' }}>R$ {i.precoUnit.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ textAlign: 'right', fontSize: '0.9rem', marginTop: '0.5rem' }}>
          <p>Subtotal: R$ {comanda.subtotal.toFixed(2)}</p>
          <p>Taxa de Serviço (10%): R$ {comanda.taxaServico.toFixed(2)}</p>
          <p style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: '0.25rem' }}>
            Total: R$ {comanda.total.toFixed(2)}
          </p>
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
