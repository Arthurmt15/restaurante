import { useEffect, useState, useRef } from 'react'
import { apiGet, type RelatorioVendas, type GarcomComparativo } from '../../lib/api'

type ComparativoMensal = {
  ano: number
  dados: { mes: string; nomeMes: string; comandas: number; subtotal: number; taxa: number; total: number }[]
  totalAnual: { comandas: number; subtotal: number; taxa: number; total: number }
}

export default function RelatoriosPage() {
  const now = new Date()
  const [periodo, setPeriodo] = useState('diario')
  const [mesSelecionado, setMesSelecionado] = useState(String(now.getMonth() + 1).padStart(2, '0'))
  const [anoSelecionado, setAnoSelecionado] = useState(String(now.getFullYear()))
  const [relatorio, setRelatorio] = useState<RelatorioVendas | null>(null)
  const [comparativo, setComparativo] = useState<GarcomComparativo[]>([])
  const [comparativoMensal, setComparativoMensal] = useState<ComparativoMensal | null>(null)
  const [carregando, setCarregando] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setCarregando(true)
    if (periodo === 'mes') {
      apiGet<RelatorioVendas>(`/relatorios/vendas?mes=${mesSelecionado}&ano=${anoSelecionado}`).then((r) => {
        setRelatorio(r)
        setCarregando(false)
        contentRef.current?.classList.add('periodo-fade-in')
        setTimeout(() => contentRef.current?.classList.remove('periodo-fade-in'), 400)
      })
    } else if (periodo === 'anual') {
      apiGet<ComparativoMensal>(`/relatorios/comparativo-mensal?ano=${anoSelecionado}`).then((r) => {
        setComparativoMensal(r)
        setCarregando(false)
        contentRef.current?.classList.add('periodo-fade-in')
        setTimeout(() => contentRef.current?.classList.remove('periodo-fade-in'), 400)
      })
    } else {
      apiGet<RelatorioVendas>(`/relatorios/vendas?periodo=${periodo}`).then((r) => {
        setRelatorio(r)
        setCarregando(false)
        contentRef.current?.classList.add('periodo-fade-in')
        setTimeout(() => contentRef.current?.classList.remove('periodo-fade-in'), 400)
      })
    }
    apiGet<GarcomComparativo[]>('/relatorios/garcons/comparativo').then(setComparativo)
  }, [periodo, mesSelecionado, anoSelecionado])

  const anos = Array.from({ length: 5 }, (_, i) => String(now.getFullYear() - i))

  return (
    <div>
      <div className="page-header">
        <h2>Relatórios</h2>
        <button className="btn btn-primary no-print" onClick={() => window.print()}>Imprimir</button>
      </div>

      <div className="card mb-4">
        <h3 className="mb-4">Vendas por Período</h3>
        <div className="flex gap-2 mb-4" style={{ flexWrap: 'wrap' }}>
          {['diario', 'semanal', 'mensal', 'mes', 'anual'].map((p) => (
            <button
              key={p}
              className={`btn ${periodo === p ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setPeriodo(p)}
            >
              {p === 'diario' ? 'Diário' : p === 'semanal' ? 'Semanal' : p === 'mensal' ? 'Mensal' : p === 'mes' ? 'Mês Específico' : 'Anual'}
            </button>
          ))}
        </div>

        {periodo === 'mes' && (
          <div className="flex gap-2 mb-4" style={{ alignItems: 'end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ margin: 0, minWidth: 140 }}>
              <label>Mês</label>
              <select value={mesSelecionado} onChange={(e) => setMesSelecionado(e.target.value)}>
                {Array.from({ length: 12 }, (_, i) => {
                  const v = String(i + 1).padStart(2, '0')
                  const nome = new Date(2000, i).toLocaleString('pt-BR', { month: 'long' })
                  return <option key={v} value={v}>{nome}</option>
                })}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0, minWidth: 100 }}>
              <label>Ano</label>
              <select value={anoSelecionado} onChange={(e) => setAnoSelecionado(e.target.value)}>
                {anos.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
        )}

        {periodo === 'anual' && (
          <div className="flex gap-2 mb-4" style={{ alignItems: 'end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ margin: 0, minWidth: 100 }}>
              <label>Ano</label>
              <select value={anoSelecionado} onChange={(e) => setAnoSelecionado(e.target.value)}>
                {anos.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
        )}

        <div ref={contentRef} className={`periodo-content ${carregando && (relatorio || comparativoMensal) ? 'periodo-loading' : ''}`}>
          {periodo !== 'anual' && relatorio && (
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
                <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1a73e8' }}>R$ {relatorio.totalTaxa.toFixed(2)}</p>
              </div>
              <div className="card">
                <p style={{ color: '#666', fontSize: '0.8rem' }}>Total</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2d8a4e' }}>R$ {relatorio.totalVendas.toFixed(2)}</p>
              </div>
            </div>
          )}

          {periodo === 'anual' && comparativoMensal && (
            <>
              <div className="card-grid mb-4">
                <div className="card">
                  <p style={{ color: '#666', fontSize: '0.8rem' }}>Comandas (Ano)</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{comparativoMensal.totalAnual.comandas}</p>
                </div>
                <div className="card">
                  <p style={{ color: '#666', fontSize: '0.8rem' }}>Subtotal (Ano)</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>R$ {comparativoMensal.totalAnual.subtotal.toFixed(2)}</p>
                </div>
                <div className="card">
                  <p style={{ color: '#666', fontSize: '0.8rem' }}>Taxa de Serviço (Ano)</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1a73e8' }}>R$ {comparativoMensal.totalAnual.taxa.toFixed(2)}</p>
                </div>
                <div className="card">
                  <p style={{ color: '#666', fontSize: '0.8rem' }}>Total (Ano)</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2d8a4e' }}>R$ {comparativoMensal.totalAnual.total.toFixed(2)}</p>
                </div>
              </div>

              <table>
                <thead><tr><th>Mês</th><th>Comandas</th><th>Subtotal</th><th>Taxa</th><th>Total</th></tr></thead>
                <tbody>
                  {comparativoMensal.dados.map((d) => (
                    <tr key={d.mes}>
                      <td data-label="Mês" style={{ textTransform: 'capitalize' }}>{d.nomeMes}</td>
                      <td data-label="Comandas">{d.comandas}</td>
                      <td data-label="Subtotal">R$ {d.subtotal.toFixed(2)}</td>
                      <td data-label="Taxa">R$ {d.taxa.toFixed(2)}</td>
                      <td data-label="Total">R$ {d.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {periodo !== 'anual' && relatorio && relatorio.comandas.length > 0 && (
            <table>
              <thead><tr><th>Mesa</th><th>Garçom</th><th>Itens</th><th>Total</th><th>Data</th></tr></thead>
              <tbody>
                {relatorio.comandas.map((c) => (
                  <tr key={c.id}>
                    <td data-label="Mesa">Mesa {c.mesa.numero}</td>
                    <td data-label="Garçom">{c.garcom?.nome || '—'}</td>
                    <td data-label="Itens">{c.itens.length}</td>
                    <td data-label="Total">R$ {c.total.toFixed(2)}</td>
                    <td data-label="Data" style={{ fontSize: '0.8rem' }}>{new Date(c.createdAt).toLocaleString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
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
                        <td data-label="Mês" style={{ textTransform: 'capitalize' }}>{nomeMes}/{ano}</td>
                        <td data-label="Vendas">{m.vendas}</td>
                        <td data-label="Total">R$ {m.total.toFixed(2)}</td>
                        <td data-label="Taxa">R$ {m.taxa.toFixed(2)}</td>
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
