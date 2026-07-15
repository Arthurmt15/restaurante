import { useEffect, useState } from 'react'
import Link from 'next/link'
import { apiGet, apiPatch, type Comanda } from '../../lib/api'

const FORMAS_PAGAMENTO = ['Dinheiro', 'Cartão Débito', 'Cartão Crédito', 'Pix']

// Listagem de comandas com filtro por status e ação de fechamento
export default function ComandasPage() {
  const [comandas, setComandas] = useState<Comanda[]>([])
  const [filtro, setFiltro] = useState('')
  const [fechandoId, setFechandoId] = useState<string | null>(null)
  const [formaPagamento, setFormaPagamento] = useState('')

  // Carrega comandas aplicando filtro atual
  function carregar() {
    const q = filtro ? `?status=${filtro}` : ''
    apiGet<Comanda[]>(`/comandas${q}`).then(setComandas)
  }

  // Recarrega quando o filtro muda
  useEffect(() => { carregar() }, [filtro])

  // Fecha uma comanda com a forma de pagamento selecionada
  async function fechar() {
    if (!fechandoId || !formaPagamento) return
    await apiPatch(`/comandas/${fechandoId}/fechar`, { formaPagamento })
    setFechandoId(null)
    setFormaPagamento('')
    carregar()
  }

  return (
    <div>
      <div className="page-header">
        <h2>Comandas</h2>
        <Link href="/comandas/nova" className="btn btn-primary">Nova Comanda</Link>
      </div>

      <div className="card mb-4">
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="">Todas</option>
          <option value="ABERTA">Abertas</option>
          <option value="FECHADA">Fechadas</option>
        </select>
      </div>

      {comandas.length === 0 ? (
        <div className="empty-state">Nenhuma comanda encontrada</div>
      ) : (
        <div className="card-grid">
          {comandas.map((c) => (
            <div className="card" key={c.id}>
              <div className="flex justify-between items-center mb-2">
                <span className={`badge ${c.status === 'ABERTA' ? 'badge-open' : 'badge-closed'}`}>
                  {c.status}
                </span>
                <span style={{ fontWeight: 700 }}>Mesa {c.mesa.numero}</span>
              </div>
              <p style={{ fontSize: '0.875rem', color: '#666' }}>
                Garçom: {c.garcom?.nome || '—'} | Itens: {c.itens.length}
              </p>
              <div className="flex justify-between items-center mt-2">
                <span className="total-row">R$ {c.total.toFixed(2)}</span>
                <div className="flex gap-2">
                  <Link href={`/comandas/${c.id}`} className="btn btn-outline btn-sm">Ver</Link>
                  {c.status === 'ABERTA' && (
                    <button className="btn btn-success btn-sm" onClick={() => { setFechandoId(c.id); setFormaPagamento('') }}>
                      Fechar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {fechandoId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ padding: '1.5rem', minWidth: 300 }}>
            <h3 className="mb-4">Forma de Pagamento</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              {FORMAS_PAGAMENTO.map((f) => (
                <label key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="radio" name="pagamento" value={f} checked={formaPagamento === f} onChange={() => setFormaPagamento(f)} />
                  {f}
                </label>
              ))}
            </div>
            <div className="flex gap-2" style={{ justifyContent: 'end' }}>
              <button className="btn btn-outline" onClick={() => { setFechandoId(null); setFormaPagamento('') }}>Cancelar</button>
              <button className="btn btn-primary" disabled={!formaPagamento} onClick={fechar}>Confirmar Fechamento</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
