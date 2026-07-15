import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { apiGet, apiPatch, type Comanda } from '../../lib/api'

const FORMAS_PAGAMENTO = ['Dinheiro', 'Cartão Débito', 'Cartão Crédito', 'Pix']

type PagamentoInput = { forma: string; valor: string }

// Listagem de comandas com filtro por status e ação de fechamento
export default function ComandasPage() {
  const router = useRouter()
  const [comandas, setComandas] = useState<Comanda[]>([])
  const [filtro, setFiltro] = useState('')
  const [fechandoId, setFechandoId] = useState<string | null>(null)
  const [pagamentos, setPagamentos] = useState<PagamentoInput[]>([{ forma: '', valor: '' }])
  const [erroPagamento, setErroPagamento] = useState('')
  const [totalComanda, setTotalComanda] = useState(0)
  const [jaPago, setJaPago] = useState(0)

  // Carrega comandas aplicando filtro atual
  function carregar() {
    const q = filtro ? `?status=${filtro}` : ''
    apiGet<Comanda[]>(`/comandas${q}`).then(setComandas)
  }

  // Recarrega quando o filtro muda
  useEffect(() => { carregar() }, [filtro])

  // Abre modal de pagamento para a comanda
  function abrirFechamento(comanda: Comanda) {
    setFechandoId(comanda.id)
    setTotalComanda(comanda.total)
    const pago = comanda.pagamentos?.reduce((acc, p) => acc + p.valor, 0) || 0
    setJaPago(pago)
    const restante = comanda.total - pago
    setPagamentos([{ forma: '', valor: restante > 0 ? restante.toFixed(2) : '0.00' }])
    setErroPagamento('')
  }

  // Adiciona linha de pagamento
  function adicionarPagamento() {
    const totalPago = pagamentos.reduce((acc, p) => acc + (parseFloat(p.valor) || 0), 0)
    const restante = (totalComanda - jaPago) - totalPago
    setPagamentos([...pagamentos, { forma: '', valor: restante > 0 ? restante.toFixed(2) : '0.00' }])
  }

  // Remove linha de pagamento
  function removerPagamento(idx: number) {
    if (pagamentos.length <= 1) return
    setPagamentos(pagamentos.filter((_, i) => i !== idx))
  }

  // Atualiza campo de pagamento
  function atualizarPagamento(idx: number, campo: 'forma' | 'valor', valor: string) {
    const novos = [...pagamentos]
    novos[idx] = { ...novos[idx], [campo]: valor }
    setPagamentos(novos)
  }

  // Fecha a comanda com os pagamentos informados
  async function fechar() {
    if (!fechandoId) return

    const restante = totalComanda - jaPago

    if (restante > 0) {
      const pagamentosValidos = pagamentos.filter((p) => p.forma && p.valor)
      if (pagamentosValidos.length === 0) {
        setErroPagamento('Adicione ao menos um método de pagamento')
        return
      }
      const totalPago = pagamentosValidos.reduce((acc, p) => acc + parseFloat(p.valor), 0)
      if (Math.abs(totalPago - restante) > 0.01) {
        setErroPagamento(`Valor a pagar (R$ ${restante.toFixed(2)}) difere do informado (R$ ${totalPago.toFixed(2)})`)
        return
      }
    }

    setErroPagamento('')
    const pagamentosValidos = pagamentos.filter((p) => p.forma && p.valor)
    await apiPatch(`/comandas/${fechandoId}/fechar`, {
      pagamentos: pagamentosValidos.map((p) => ({ forma: p.forma, valor: parseFloat(p.valor) })),
    })
    setFechandoId(null)
    carregar()
  }

  return (
    <div>
      <div className="page-header">
        <h2>Comandas</h2>
        <Link href="/comandas/nova" className="btn btn-primary">Nova Comanda</Link>
      </div>

      <div className="card mb-4">
        <div className="filter-group">
          {['', 'ABERTA', 'FECHADA'].map((f) => (
            <button
              key={f}
              className={`filter-btn ${filtro === f ? 'filter-btn-active' : ''}`}
              onClick={() => setFiltro(f)}
            >
              {f === '' ? 'Todas' : f === 'ABERTA' ? 'Abertas' : 'Fechadas'}
            </button>
          ))}
        </div>
      </div>

      {comandas.length === 0 ? (
        <div className="empty-state">Nenhuma comanda encontrada</div>
      ) : (
        <div className="card-grid">
          {comandas.map((c) => (
            <div className="card" key={c.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/comandas/${c.id}`)}>
              <div className="flex justify-between items-center mb-2">
                <span className={`badge ${c.status === 'ABERTA' ? 'badge-open' : 'badge-closed'}`}>
                  {c.status}
                </span>
                <span style={{ fontWeight: 700 }}>Mesa {c.mesa.numero}</span>
              </div>
              <p style={{ fontSize: '0.875rem', color: '#666' }}>
                Garçom: {c.garcom?.nome || '—'} | Itens: {c.itens.length}
              </p>
              {c.pagamentos && c.pagamentos.length > 0 && (
                <p style={{ fontSize: '0.8rem', color: '#666' }}>
                  Pagamento: {c.pagamentos.map((p) => `${p.forma} R$ ${p.valor.toFixed(2)}`).join(', ')}
                </p>
              )}
              <div className="flex justify-between items-center mt-2">
                <span className="total-row">R$ {c.total.toFixed(2)}</span>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Link href={`/comandas/${c.id}`} className="btn btn-outline btn-sm">Ver</Link>
                  {c.status === 'ABERTA' && (
                    <button className="btn btn-success btn-sm" onClick={() => abrirFechamento(c)}>
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
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <h3>Fechar Comanda</h3>
                {jaPago > 0 && (
                  <p style={{ fontSize: '0.8rem', color: '#666', marginTop: 2 }}>
                    Já pago: R$ {jaPago.toFixed(2)} | Restante: R$ {(totalComanda - jaPago).toFixed(2)}
                  </p>
                )}
              </div>
              <span className="modal-total">R$ {totalComanda.toFixed(2)}</span>
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
              <button className="btn btn-outline" onClick={() => { setFechandoId(null); setErroPagamento('') }}>Cancelar</button>
              <button className="btn btn-primary" onClick={fechar}>Confirmar Fechamento</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
