import { useEffect, useState } from 'react'
import { apiGet, type RelatorioVendas, type GarcomComparativo } from '../../lib/api'

export default function RelatoriosPage() {
  const [periodo, setPeriodo] = useState('diario')
  const [relatorio, setRelatorio] = useState<RelatorioVendas | null>(null)
  const [comparativo, setComparativo] = useState<GarcomComparativo[]>([])

  useEffect(() => {
    apiGet<RelatorioVendas>(`/relatorios/vendas?periodo=${periodo}`).then(setRelatorio)
    apiGet<GarcomComparativo[]>('/relatorios/garcons/comparativo').then(setComparativo)
  }, [periodo])

  return (
    <div>
      <div className="page-header">
        <h2>Relatórios</h2>
        <button className="btn btn-primary no-print" onClick={() => window.print()}>Imprimir</button>
      </div>

      <div className="card mb-4">
        <h3 className="mb-4">Vendas por Período</h3>
        <div className="flex gap-2 mb-4">
          {['diario', 'semanal', 'mensal'].map((p) => (
            <button
              key={p}
              className={`btn ${periodo === p ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setPeriodo(p)}
            >
              {p === 'diario' ? 'Diário' : p === 'semanal' ? 'Semanal' : 'Mensal'}
            </button>
          ))}
        </div>

        {relatorio && (
          <div className="card-grid mb-4">
            <div className="card">
              <p style={{ color: '#666', fontSize: '0.8rem' }}>Comandas</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{relatorio.totalComandas}</p>
            </div>
            <div className="card">
              <p style={{ color: '#666', fontSize: '0.8rem' }}>Subtotal</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>R$ {relatorio.totalSubtotal.toFixed(2)}</p>
            </div>
            <div className="card">
              <p style={{ color: '#666', fontSize: '0.8rem' }}>Taxa de Serviço</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2d8a4e' }}>R$ {relatorio.totalTaxa.toFixed(2)}</p>
            </div>
            <div className="card">
              <p style={{ color: '#666', fontSize: '0.8rem' }}>Total</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#e94560' }}>R$ {relatorio.totalVendas.toFixed(2)}</p>
            </div>
          </div>
        )}

        {relatorio && relatorio.comandas.length > 0 && (
          <table>
            <thead><tr><th>Mesa</th><th>Garçom</th><th>Itens</th><th>Total</th><th>Data</th></tr></thead>
            <tbody>
              {relatorio.comandas.map((c) => (
                <tr key={c.id}>
                  <td>Mesa {c.mesa.numero}</td>
                  <td>{c.garcom?.nome || '—'}</td>
                  <td>{c.itens.length}</td>
                  <td>R$ {c.total.toFixed(2)}</td>
                  <td style={{ fontSize: '0.8rem' }}>{new Date(c.createdAt).toLocaleString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3 className="mb-4">Comparativo de Vendas por Garçom (por Mês)</h3>
        {comparativo.length === 0 ? (
          <div className="empty-state">Nenhum dado disponível</div>
        ) : (
          comparativo.map((g) => (
            <div key={g.id} className="mb-4">
              <h4 className="mb-2">{g.nome} — Total: R$ {g.totalVendido.toFixed(2)}</h4>
              <table>
                <thead><tr><th>Mês</th><th>Vendas</th><th>Total</th><th>Taxa</th></tr></thead>
                <tbody>
                  {g.meses.map((m) => {
                    const [ano, mes] = m.mes.split('-')
                    const nomeMes = new Date(parseInt(ano), parseInt(mes) - 1).toLocaleString('pt-BR', { month: 'long' })
                    return (
                      <tr key={m.mes}>
                        <td style={{ textTransform: 'capitalize' }}>{nomeMes}/{ano}</td>
                        <td>{m.vendas}</td>
                        <td>R$ {m.total.toFixed(2)}</td>
                        <td>R$ {m.taxa.toFixed(2)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
